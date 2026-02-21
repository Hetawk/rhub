import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage } from "@/lib/dbt/schemas";
import { genOTP } from "@/lib/dbt/utils";
import { sendAccountSetupEmail } from "@/lib/mail";
import { cookies } from "next/headers";

type Params = { params: Promise<{ id: string; judgeId: string }> };

// PATCH /api/tools/dbt/events/[id]/judges/[judgeId] — Update judge (isHeadJudge, alias)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user || !canManage(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, judgeId } = await params;
    const body = await req.json();

    const judge = await prisma.debateJudge.findFirst({
      where: { id: judgeId, eventId: id },
    });
    if (!judge)
      return NextResponse.json({ error: "Judge not found" }, { status: 404 });

    // Handle resend invite
    if (body.resendInvite === true) {
      if (!judge.inviteEmail) {
        return NextResponse.json(
          { error: "No invite email on record for this judge" },
          { status: 400 },
        );
      }
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://rhub.ekddigital.com";
      const newToken = genOTP() + genOTP() + genOTP();
      await prisma.debateJudge.update({
        where: { id: judgeId },
        data: { inviteToken: newToken, inviteSentAt: new Date() },
      });
      const judgeWithDetails = await prisma.debateJudge.findUnique({
        where: { id: judgeId },
        include: {
          user: { select: { name: true } },
          event: { select: { title: true } },
        },
      });
      if (judgeWithDetails) {
        const setupLink = `${siteUrl}/register?token=${newToken}&email=${encodeURIComponent(judge.inviteEmail)}`;
        await sendAccountSetupEmail(
          judge.inviteEmail,
          judgeWithDetails.user.name,
          judgeWithDetails.event.title,
          setupLink,
          judge.alias,
        );
      }
      return NextResponse.json({ ok: true });
    }

    const updates: { isHeadJudge?: boolean; alias?: string } = {};

    if (typeof body.isHeadJudge === "boolean") {
      if (body.isHeadJudge) {
        // Demote any existing head judge first
        await prisma.debateJudge.updateMany({
          where: { eventId: id, isHeadJudge: true },
          data: { isHeadJudge: false },
        });
      }
      updates.isHeadJudge = body.isHeadJudge;
    }

    if (typeof body.alias === "string" && body.alias.trim()) {
      updates.alias = body.alias.trim();
    }

    const updated = await prisma.debateJudge.update({
      where: { id: judgeId },
      data: updates,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        slots: { select: { id: true, roundId: true, position: true } },
      },
    });

    return NextResponse.json({ judge: updated });
  } catch (error) {
    console.error("Update judge error:", error);
    return NextResponse.json(
      { error: "Failed to update judge" },
      { status: 500 },
    );
  }
}

// DELETE /api/tools/dbt/events/[id]/judges/[judgeId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user || !canManage(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, judgeId } = await params;

    // Verify judge belongs to this event
    const judge = await prisma.debateJudge.findFirst({
      where: { id: judgeId, eventId: id },
      include: { slots: { select: { id: true } } },
    });
    if (!judge)
      return NextResponse.json({ error: "Judge not found" }, { status: 404 });

    // Prevent removing if judge has submitted scores
    const hasScores = await prisma.speechScore.findFirst({
      where: { slot: { judgeId } },
    });
    if (hasScores)
      return NextResponse.json(
        { error: "Cannot remove a judge who has already submitted scores" },
        { status: 409 },
      );

    await prisma.debateJudge.delete({ where: { id: judgeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove judge error:", error);
    return NextResponse.json(
      { error: "Failed to remove judge" },
      { status: 500 },
    );
  }
}
