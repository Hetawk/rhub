import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { submitScoreSchema, safeParse, canScore } from "@/lib/dbt/schemas";
import { SCORING, SPEECH_CRITERIA, type SpeechTypeKey } from "@/lib/dbt";

type Params = { params: Promise<{ roundId: string }> };

// GET /api/tools/dbt/rounds/[roundId]/scores — Get all scores for a round
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { roundId } = await params;

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: {
        event: { select: { minScore: true, maxScore: true, title: true } },
        roundTeams: {
          include: {
            team: true,
            scores: {
              include: {
                criteria: true,
                slot: {
                  include: {
                    judge: {
                      include: {
                        user: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        judgeSlots: {
          orderBy: { position: "asc" },
          include: {
            judge: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const now = new Date();
    const scoreEditingLocked =
      !!round.completedAt ||
      (!!round.scoreLockDeadline && new Date(round.scoreLockDeadline) < now);

    return NextResponse.json({
      round,
      audienceVotes: {
        pro: round.audienceProVotes,
        con: round.audienceConVotes,
      },
      lockInfo: {
        scoreLockDeadline: round.scoreLockDeadline,
        scoreEditingLocked,
        isCompleted: !!round.completedAt,
        roundStatus: round.status,
      },
    });
  } catch (error) {
    console.error("Get scores error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scores" },
      { status: 500 },
    );
  }
}

// PATCH /api/tools/dbt/rounds/[roundId]/scores — Live-sync draft criteria scores (no lock timer)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await validateSession(token);
    if (!user || !canScore(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { roundId } = await params;

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: { event: { select: { minScore: true, maxScore: true } } },
    });
    if (!round)
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    if (round.completedAt)
      return NextResponse.json(
        { error: "Round is completed" },
        { status: 403 },
      );
    if (round.status === "PAUSED")
      return NextResponse.json(
        {
          error:
            "Game is currently paused. Scoring is suspended until the Head Judge resumes the round.",
        },
        { status: 403 },
      );
    if (round.status === "SCHEDULED")
      return NextResponse.json({ error: "Round not started" }, { status: 403 });
    if (
      round.scoreLockDeadline &&
      new Date(round.scoreLockDeadline) < new Date()
    ) {
      return NextResponse.json(
        { error: "Score editing locked" },
        { status: 403 },
      );
    }

    const { roundTeamId, speechType, criteriaScores } = await req.json();
    if (!roundTeamId || !speechType || !criteriaScores) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const slot = await prisma.judgeSlot.findFirst({
      where: { roundId, judge: { userId: user.id } },
    });
    if (!slot)
      return NextResponse.json(
        { error: "Not assigned as judge" },
        { status: 403 },
      );

    // Check existing score isn't locked
    const existing = await prisma.speechScore.findUnique({
      where: {
        slotId_roundTeamId_speechType: {
          slotId: slot.id,
          roundTeamId,
          speechType,
        },
      },
    });
    if (existing?.isLocked)
      return NextResponse.json({ error: "Score is locked" }, { status: 403 });
    if (existing?.lockedAt && existing.lockedAt <= new Date()) {
      return NextResponse.json(
        { error: "Score lock time has passed" },
        { status: 403 },
      );
    }

    const speechKey = speechType as SpeechTypeKey;
    const criteriaDefs = SPEECH_CRITERIA[speechKey];
    if (!criteriaDefs)
      return NextResponse.json(
        { error: "Invalid speech type" },
        { status: 400 },
      );
    const minScore = round.event?.minScore ?? SCORING.MIN_CRITERIA;
    const maxScore = round.event?.maxScore ?? SCORING.MAX_CRITERIA;

    // Only save provided criteria (partial draft is OK)
    const validScores: Record<string, number> = {};
    for (const [key, val] of Object.entries(criteriaScores)) {
      const n = Number(val);
      if (!isNaN(n) && n >= minScore && n <= maxScore) validScores[key] = n;
    }

    const totalScore = Object.values(validScores).reduce((s, v) => s + v, 0);

    if (!existing) {
      await prisma.speechScore.create({
        data: {
          slotId: slot.id,
          roundTeamId,
          speechType,
          totalScore,
          criteria: {
            create: Object.entries(validScores).map(([criteriaKey, score]) => ({
              criteriaKey,
              score,
            })),
          },
        },
      });
    } else {
      // Update without touching lockedAt (live-sync only)
      await prisma.speechScore.update({
        where: { id: existing.id },
        data: {
          totalScore,
          criteria: {
            deleteMany: {},
            create: Object.entries(validScores).map(([criteriaKey, score]) => ({
              criteriaKey,
              score,
            })),
          },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Draft sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync draft" },
      { status: 500 },
    );
  }
}

// POST /api/tools/dbt/rounds/[roundId]/scores — Submit/update score
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await validateSession(token);
    if (!user || !canScore(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roundId } = await params;

    // Check round is not completed
    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: { event: { select: { minScore: true, maxScore: true } } },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (round.completedAt) {
      return NextResponse.json(
        { error: "Game is completed. No further score edits allowed." },
        { status: 403 },
      );
    }

    // Block scoring when round is paused
    if (round.status === "PAUSED") {
      return NextResponse.json(
        {
          error:
            "Game is currently paused. Scoring is suspended until the Head Judge resumes the round.",
        },
        { status: 403 },
      );
    }

    // Block scoring until round is started (LIVE or later)
    if (round.status === "SCHEDULED") {
      return NextResponse.json(
        {
          error:
            'Round has not been started yet. The Head Judge must press "Start Round" before scores can be entered.',
        },
        { status: 403 },
      );
    }

    // Check score lock deadline
    if (
      round.scoreLockDeadline &&
      new Date(round.scoreLockDeadline) < new Date()
    ) {
      return NextResponse.json(
        {
          error: `Score editing period has ended (deadline: ${new Date(round.scoreLockDeadline).toLocaleString()}). Comments can still be updated but scores are locked.`,
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = safeParse(submitScoreSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    // Verify user is assigned as judge for this round
    const slot = await prisma.judgeSlot.findFirst({
      where: {
        roundId,
        judge: { userId: user.id },
      },
      include: { judge: true },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "You are not assigned as a judge for this round" },
        { status: 403 },
      );
    }

    // Validate criteria against speech config
    const speechKey = data.speechType as SpeechTypeKey;
    const criteriaDefs = SPEECH_CRITERIA[speechKey];
    if (!criteriaDefs) {
      return NextResponse.json(
        { error: "Invalid speech type" },
        { status: 400 },
      );
    }

    const minScore = round.event?.minScore ?? SCORING.MIN_CRITERIA;
    const maxScore = round.event?.maxScore ?? SCORING.MAX_CRITERIA;

    for (const crit of criteriaDefs) {
      const val = data.criteriaScores[crit.key];
      if (val === undefined || val < minScore || val > maxScore) {
        return NextResponse.json(
          {
            error: `Score for ${crit.label} must be between ${minScore} and ${maxScore}`,
          },
          { status: 400 },
        );
      }
    }

    // Check if score exists and is locked
    const existing = await prisma.speechScore.findUnique({
      where: {
        slotId_roundTeamId_speechType: {
          slotId: slot.id,
          roundTeamId: data.roundTeamId,
          speechType: data.speechType,
        },
      },
    });

    if (existing?.isLocked) {
      return NextResponse.json(
        { error: "Score is locked and cannot be changed" },
        { status: 403 },
      );
    }

    // Also check if lockedAt has passed (enforce lock even if cron hasn't run)
    if (existing?.lockedAt && existing.lockedAt <= new Date()) {
      // Auto-lock it now and reject
      await prisma.speechScore.update({
        where: { id: existing.id },
        data: { isLocked: true },
      });
      return NextResponse.json(
        { error: "Score lock time has passed. Cannot edit." },
        { status: 403 },
      );
    }

    const totalScore = Object.values(data.criteriaScores).reduce(
      (sum, s) => sum + s,
      0,
    );

    // Upsert speech score
    const speechScore = await prisma.speechScore.upsert({
      where: {
        slotId_roundTeamId_speechType: {
          slotId: slot.id,
          roundTeamId: data.roundTeamId,
          speechType: data.speechType,
        },
      },
      create: {
        slotId: slot.id,
        roundTeamId: data.roundTeamId,
        speechType: data.speechType,
        totalScore,
        comment: data.comment,
        criteria: {
          create: criteriaDefs.map((c) => ({
            criteriaKey: c.key,
            score: data.criteriaScores[c.key],
          })),
        },
      },
      update: {
        totalScore,
        comment: data.comment,
        criteria: {
          deleteMany: {},
          create: criteriaDefs.map((c) => ({
            criteriaKey: c.key,
            score: data.criteriaScores[c.key],
          })),
        },
      },
      include: { criteria: true },
    });

    // Schedule auto-lock after LOCK_DELAY_SECONDS
    const lockAt = new Date(Date.now() + SCORING.LOCK_DELAY_SECONDS * 1000);
    await prisma.speechScore.update({
      where: { id: speechScore.id },
      data: { lockedAt: lockAt },
    });

    return NextResponse.json({ speechScore, locksAt: lockAt });
  } catch (error) {
    console.error("Submit score error:", error);
    return NextResponse.json(
      { error: "Failed to submit score" },
      { status: 500 },
    );
  }
}
