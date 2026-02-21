import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage, canScore } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";

type Params = { params: Promise<{ roundId: string }> };

/**
 * PATCH /api/tools/dbt/rounds/[roundId]
 * Update round — swap PRO/CON sides or update the topic.
 * Requires JUDGE_ADMIN+.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    // Minimum: must be a judge+ to hit this endpoint at all.
    // Fine-grained checks (canManage / canControl) happen per-action below.
    if (!user || !canScore(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { roundId } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      topic,
      swapTeams,
      startRound,
      pauseRound,
      resumeRound,
      resetRound,
    } = body as {
      topic?: string;
      swapTeams?: boolean;
      startRound?: boolean;
      pauseRound?: boolean;
      resumeRound?: boolean;
      resetRound?: boolean;
    };

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: { roundTeams: true },
    });
    if (!round)
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    if (round.completedAt)
      return NextResponse.json(
        { error: "Round is already completed" },
        { status: 400 },
      );

    // Helper: head judge or admin check
    const isHeadJudge = await prisma.debateJudge.findFirst({
      where: { eventId: round.eventId, userId: user.id, isHeadJudge: true },
    });
    const canControl = canManage(user.role) || !!isHeadJudge;

    // Start round: SCHEDULED → LIVE
    if (startRound) {
      if (!canControl) {
        return NextResponse.json(
          { error: "Only the Head Judge or an admin can start this round" },
          { status: 403 },
        );
      }
      if (round.status !== "SCHEDULED") {
        return NextResponse.json(
          { error: "Round is already started" },
          { status: 400 },
        );
      }
      const started = await prisma.debateRound.update({
        where: { id: roundId },
        data: { status: "LIVE", startTime: new Date() },
      });
      return NextResponse.json({ round: started });
    }

    // Pause round: LIVE → PAUSED
    if (pauseRound) {
      if (!canControl) {
        return NextResponse.json(
          { error: "Only the Head Judge or an admin can pause this round" },
          { status: 403 },
        );
      }
      if (round.status !== "LIVE" && round.status !== "SCORING") {
        return NextResponse.json(
          { error: "Round is not currently live" },
          { status: 400 },
        );
      }
      const paused = await prisma.debateRound.update({
        where: { id: roundId },
        data: { status: "PAUSED", pausedAt: new Date(), pausedBy: user.id },
      });
      return NextResponse.json({ round: paused });
    }

    // Resume round: PAUSED → LIVE
    if (resumeRound) {
      if (!canControl) {
        return NextResponse.json(
          { error: "Only the Head Judge or an admin can resume this round" },
          { status: 403 },
        );
      }
      if (round.status !== "PAUSED") {
        return NextResponse.json(
          { error: "Round is not paused" },
          { status: 400 },
        );
      }
      const resumed = await prisma.debateRound.update({
        where: { id: roundId },
        data: { status: "LIVE", pausedAt: null, pausedBy: null },
      });
      return NextResponse.json({ round: resumed });
    }

    // Reset round: wipe all scores + back to LIVE (judges re-enter)
    if (resetRound) {
      if (!canControl) {
        return NextResponse.json(
          { error: "Only the Head Judge or an admin can reset this round" },
          { status: 403 },
        );
      }
      if (round.status === "SCHEDULED") {
        return NextResponse.json(
          { error: "Round has not started yet" },
          { status: 400 },
        );
      }
      // Delete all speech scores for this round's judge slots
      await prisma.speechScore.deleteMany({
        where: { slot: { roundId } },
      });
      const reset = await prisma.debateRound.update({
        where: { id: roundId },
        data: {
          status: "LIVE",
          pausedAt: null,
          pausedBy: null,
          scoreLockDeadline: null,
          scoreLockSetBy: null,
          completedAt: null,
          completedBy: null,
        },
      });
      return NextResponse.json({ round: reset });
    }

    // Update topic — JUDGE_ADMIN+ only
    if (topic !== undefined && String(topic).trim()) {
      if (!canManage(user.role)) {
        return NextResponse.json(
          { error: "Only admins can edit the round topic" },
          { status: 403 },
        );
      }
      await prisma.debateRound.update({
        where: { id: roundId },
        data: { topic: String(topic).trim() },
      });
    }

    // Swap PRO/CON sides — JUDGE_ADMIN+ only
    if (swapTeams) {
      if (!canManage(user.role)) {
        return NextResponse.json(
          { error: "Only admins can swap team sides" },
          { status: 403 },
        );
      }
      const [t1, t2] = round.roundTeams;
      if (t1 && t2) {
        const newSide1 = t2.side; // t1 takes t2's side
        const newSide2 = t1.side; // t2 takes t1's side
        // Use a single conditional UPDATE to atomically swap (MySQL: unique checks per row)
        await prisma.$executeRawUnsafe(
          `UPDATE \`DebateRoundTeam\` SET side = CASE id WHEN '${t1.id}' THEN '${newSide1}' WHEN '${t2.id}' THEN '${newSide2}' END WHERE id IN ('${t1.id}', '${t2.id}')`,
        );
      }
    }

    // Return updated round
    const updated = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: {
        roundTeams: { include: { team: true } },
        judgeSlots: {
          include: { judge: { include: { user: true } } },
        },
      },
    });
    return NextResponse.json({ round: updated });
  } catch (e) {
    console.error("Round PATCH error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
