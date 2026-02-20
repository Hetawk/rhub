import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { createRoundSchema, safeParse, canManage } from "@/lib/dbt/schemas";
import { sendGameNotificationEmail } from "@/lib/mail";
import { cookies } from "next/headers";

type Params = { params: Promise<{ id: string }> };

// GET /api/tools/dbt/events/[id]/rounds — List rounds for event
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const rounds = await prisma.debateRound.findMany({
      where: { eventId: id },
      orderBy: { roundNum: "asc" },
      include: {
        roundTeams: { include: { team: true } },
        judgeSlots: {
          orderBy: { position: "asc" },
          include: {
            judge: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    return NextResponse.json({ rounds });
  } catch (error) {
    console.error("List rounds error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rounds" },
      { status: 500 },
    );
  }
}

// POST /api/tools/dbt/events/[id]/rounds — Create round/game (JUDGE_ADMIN+)
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
    const parsed = safeParse(createRoundSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    if (data.proTeamId === data.conTeamId) {
      return NextResponse.json(
        { error: "PRO and CON teams must be different" },
        { status: 400 },
      );
    }

    // Get next round number
    const lastRound = await prisma.debateRound.findFirst({
      where: { eventId: id },
      orderBy: { roundNum: "desc" },
    });
    const roundNum = (lastRound?.roundNum ?? 0) + 1;

    const round = await prisma.debateRound.create({
      data: {
        eventId: id,
        roundNum,
        title: data.title || `Game ${roundNum}`,
        topic: data.topic,
        gameType: data.gameType,
        venue: data.venue,
        startTime: data.startTime ? new Date(data.startTime) : null,
        timerEnabled: data.timerEnabled,
        speechDurationSec: data.speechDurationSec,
        prepTimeSec: data.prepTimeSec,
        roundTeams: {
          create: [
            {
              teamId: data.proTeamId,
              side: "PRO",
              speaksFirst: !data.conSpeaksFirst,
            },
            {
              teamId: data.conTeamId,
              side: "CON",
              speaksFirst: !!data.conSpeaksFirst,
            },
          ],
        },
        judgeSlots: data.judgeSlots?.length
          ? {
              create: data.judgeSlots.map((js) => ({
                judgeId: js.judgeId,
                position: js.position,
              })),
            }
          : undefined,
      },
      include: {
        roundTeams: { include: { team: true } },
        judgeSlots: {
          include: {
            judge: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    // Send notification emails to assigned judges
    const event = await prisma.debateEvent.findUnique({
      where: { id },
      select: { title: true },
    });

    if (event && round.judgeSlots.length > 0) {
      const emailPromises = round.judgeSlots.map((slot) =>
        sendGameNotificationEmail(
          slot.judge.user.email,
          event.title,
          round.title || `Game ${roundNum}`,
          data.topic,
          data.startTime || null,
          data.gameType,
        ),
      );
      // Fire and forget — don't block response on email delivery
      Promise.allSettled(emailPromises).catch(console.error);
    }

    return NextResponse.json({ round }, { status: 201 });
  } catch (error) {
    console.error("Create round error:", error);
    return NextResponse.json(
      { error: "Failed to create round" },
      { status: 500 },
    );
  }
}
