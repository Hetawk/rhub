import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import {
  assignJudgeSchema,
  createJudgeByEmailSchema,
  safeParse,
  canManage,
} from "@/lib/dbt/schemas";
import { genOTP } from "@/lib/dbt/utils";
import { sendJudgeInviteEmail, sendAccountSetupEmail } from "@/lib/mail";
import { cookies } from "next/headers";

type Params = { params: Promise<{ id: string }> };

// GET /api/tools/dbt/events/[id]/judges — List judges for event
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const judges = await prisma.debateJudge.findMany({
      where: { eventId: id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        slots: { select: { id: true, roundId: true, position: true } },
      },
    });
    return NextResponse.json({ judges });
  } catch (error) {
    console.error("List judges error:", error);
    return NextResponse.json(
      { error: "Failed to fetch judges" },
      { status: 500 },
    );
  }
}

// POST /api/tools/dbt/events/[id]/judges — Assign judge
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await validateSession(token);
    if (!user || !canManage(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Two modes: assign by userId or create/assign by email
    if (body.email) {
      const parsed = safeParse(createJudgeByEmailSchema, body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      const data = parsed.data;

      let isNewUser = false;
      let judgeUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!judgeUser) {
        isNewUser = true;
        // Create a passwordless stub account — they set it up via the invite link
        judgeUser = await prisma.user.create({
          data: {
            email: data.email,
            name: data.name,
            password: null,
            role: data.isHeadJudge ? "HEAD_JUDGE" : "JUDGE",
            emailVerified: false,
            isActive: false, // activated on first login after setup
          },
        });
      } else {
        // Upgrade role if needed
        const roleLevel: Record<string, number> = {
          USER: 0,
          JUDGE: 1,
          HEAD_JUDGE: 2,
        };
        const currentLevel = roleLevel[judgeUser.role] ?? 5;
        const targetLevel = data.isHeadJudge
          ? roleLevel.HEAD_JUDGE
          : roleLevel.JUDGE;
        if (currentLevel < targetLevel) {
          await prisma.user.update({
            where: { id: judgeUser.id },
            data: { role: data.isHeadJudge ? "HEAD_JUDGE" : "JUDGE" },
          });
        }
      }

      // Check for duplicate assignment
      const existingAssignment = await prisma.debateJudge.findUnique({
        where: { eventId_userId: { eventId: id, userId: judgeUser.id } },
      });
      if (existingAssignment) {
        return NextResponse.json(
          {
            error: `${existingAssignment.alias || judgeUser.name} is already assigned to this event.`,
          },
          { status: 409 },
        );
      }

      // Generate inviteToken for new users (account setup flow)
      const inviteToken = isNewUser
        ? genOTP() + genOTP() + genOTP()
        : undefined;
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://rhub.ekddigital.com";

      const judge = await prisma.debateJudge.create({
        data: {
          eventId: id,
          userId: judgeUser.id,
          alias: data.alias,
          isHeadJudge: data.isHeadJudge,
          ...(inviteToken
            ? {
                inviteToken,
                inviteEmail: data.email,
                inviteSentAt: new Date(),
              }
            : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Get event details for email
      const event = await prisma.debateEvent.findUnique({
        where: { id },
        select: { title: true },
      });

      if (event) {
        if (isNewUser && inviteToken) {
          const setupLink = `${siteUrl}/register?token=${inviteToken}&email=${encodeURIComponent(data.email)}`;
          await sendAccountSetupEmail(
            data.email,
            data.name,
            event.title,
            setupLink,
            data.alias,
          );
        } else {
          await sendJudgeInviteEmail(judgeUser.email, event.title, data.alias);
        }
      }

      return NextResponse.json({ judge }, { status: 201 });
    }

    // Assign by userId
    const parsed = safeParse(assignJudgeSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    const judgeUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!judgeUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Upgrade role if needed
    const roleLevel: Record<string, number> = {
      USER: 0,
      JUDGE: 1,
      HEAD_JUDGE: 2,
    };
    const currentLevel = roleLevel[judgeUser.role] ?? 5;
    const targetLevel = data.isHeadJudge
      ? roleLevel.HEAD_JUDGE
      : roleLevel.JUDGE;
    if (currentLevel < targetLevel) {
      await prisma.user.update({
        where: { id: data.userId },
        data: { role: data.isHeadJudge ? "HEAD_JUDGE" : "JUDGE" },
      });
    }

    // If head judge, demote any existing head first
    if (data.isHeadJudge) {
      await prisma.debateJudge.updateMany({
        where: { eventId: id, isHeadJudge: true },
        data: { isHeadJudge: false },
      });
    }

    const judge = await prisma.debateJudge.upsert({
      where: { eventId_userId: { eventId: id, userId: data.userId } },
      update: {
        alias: data.alias,
        isHeadJudge: data.isHeadJudge,
      },
      create: {
        eventId: id,
        userId: data.userId,
        alias: data.alias,
        isHeadJudge: data.isHeadJudge,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const event = await prisma.debateEvent.findUnique({
      where: { id },
      select: { title: true },
    });

    if (event) {
      await sendJudgeInviteEmail(judgeUser.email, event.title, data.alias);
    }

    return NextResponse.json({ judge }, { status: 201 });
  } catch (error) {
    console.error("Assign judge error:", error);
    return NextResponse.json(
      { error: "Failed to assign judge" },
      { status: 500 },
    );
  }
}
