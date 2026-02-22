import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage, canScore } from "@/lib/dbt/schemas";
import { SPEECH_CRITERIA, type SpeechTypeKey } from "@/lib/dbt";
import { cookies } from "next/headers";

type Params = { params: Promise<{ roundId: string }> };

/**
 * DELETE /api/tools/dbt/rounds/[roundId]
 * Permanently delete a round and all its scores/slots. Requires JUDGE_ADMIN+.
 *
 * Data-protection rule: blocked when any judge in the round has already
 * submitted (non-draft) scores — deleting would destroy that scoring data.
 * Pass force=true in the query string to override (JUDGE_ADMIN+ only, should
 * be paired with a UI confirmation warning the user about data loss).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await validateSession(token);
    if (!user || !canManage(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { roundId } = await params;
    const force = req.nextUrl.searchParams.get("force") === "true";

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
    });
    if (!round)
      return NextResponse.json({ error: "Round not found" }, { status: 404 });

    // ── Data-protection check ────────────────────────────────────────────
    if (!force) {
      const submittedScore = await prisma.speechScore.findFirst({
        where: {
          isDraft: false,
          slot: { roundId },
        },
        select: { id: true },
      });
      if (submittedScore)
        return NextResponse.json(
          {
            error:
              "This round contains submitted scores. Deleting it will permanently destroy all scoring data. " +
              "To confirm, resend this request with ?force=true.",
            hasSubmittedScores: true,
          },
          { status: 409 },
        );
    }

    // Cascade: JudgeSlot → SpeechScore → CriteriaScore all onDelete:Cascade.
    await prisma.debateRound.delete({ where: { id: roundId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Round DELETE error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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
      confirmDrafts,
    } = body as {
      topic?: string;
      swapTeams?: boolean;
      startRound?: boolean;
      pauseRound?: boolean;
      resumeRound?: boolean;
      resetRound?: boolean;
      confirmDrafts?: boolean;
    };

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: { roundTeams: true },
    });
    if (!round)
      return NextResponse.json({ error: "Round not found" }, { status: 404 });

    // Helper: head judge or admin check
    const isHeadJudge = await prisma.debateJudge.findFirst({
      where: { eventId: round.eventId, userId: user.id, isHeadJudge: true },
    });
    const canControl = canManage(user.role) || !!isHeadJudge;

    // Confirm all complete draft scores → isDraft:false  (HEAD_JUDGE / admin only)
    // Safe to run on both live and completed rounds; does not change round status.
    if (confirmDrafts) {
      if (!canControl) {
        return NextResponse.json(
          { error: "Only the Head Judge or an admin can confirm draft scores" },
          { status: 403 },
        );
      }
      const draftScores = await prisma.speechScore.findMany({
        where: { slot: { roundId }, isDraft: true },
        include: { criteria: true },
      });
      // Only confirm drafts where all expected criteria have been filled in
      const toConfirm = draftScores.filter((s) => {
        const expected =
          SPEECH_CRITERIA[s.speechType as SpeechTypeKey]?.length ?? 5;
        return s.criteria.length >= expected;
      });
      if (toConfirm.length === 0) {
        return NextResponse.json({
          confirmed: 0,
          message: "No complete draft scores found to confirm",
        });
      }
      await prisma.speechScore.updateMany({
        where: { id: { in: toConfirm.map((s) => s.id) } },
        data: { isDraft: false },
      });
      return NextResponse.json({
        confirmed: toConfirm.length,
        skipped: draftScores.length - toConfirm.length,
      });
    }

    // Re-open completed round: unlock all scores, clear completedAt → LIVE
    // Must be checked BEFORE the completedAt guard below
    if (resetRound) {
      if (!canControl) {
        return NextResponse.json(
          { error: "Only the Head Judge or an admin can re-open this round" },
          { status: 403 },
        );
      }
      // Unlock all scores so judges can edit again (scores are preserved)
      await prisma.speechScore.updateMany({
        where: { slot: { roundId } },
        data: { isLocked: false, lockedAt: null },
      });
      const reopened = await prisma.debateRound.update({
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
      return NextResponse.json({ round: reopened });
    }

    // All other actions are blocked on completed rounds
    if (round.completedAt)
      return NextResponse.json(
        { error: "This round is completed. No further edits allowed." },
        { status: 400 },
      );

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

    // (resetRound is handled above before completedAt guard)

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
      const proTeam = round.roundTeams.find((rt) => rt.side === "PRO");
      const conTeam = round.roundTeams.find((rt) => rt.side === "CON");

      if (!proTeam || !conTeam) {
        return NextResponse.json(
          { error: "Round must have both a PRO and a CON team to swap" },
          { status: 400 },
        );
      }

      // MySQL InnoDB checks uniqueness per-row within a statement, so a single
      // CASE UPDATE on @@unique([roundId, side]) causes a transient duplicate
      // violation. Fix: swap the teamId references (keeping side labels fixed)
      // via a 3-step inside a transaction.
      //
      //  Before: proRow(side=PRO, teamId=A)  conRow(side=CON, teamId=B)
      //  After:  proRow(side=PRO, teamId=B)  conRow(side=CON, teamId=A)
      //
      // Step 1: move proRow's teamId to a sentinel — temporarily disable FK
      //         checks so the placeholder doesn't need to exist in DebateTeam.
      //         The placeholder is unique enough to avoid @@unique([roundId,teamId]).
      // Step 2: set conRow's teamId → A (no conflict: proRow is on placeholder).
      // Step 3: set proRow's teamId → B (no conflict: conRow now holds A).
      const PLACEHOLDER = `__swap_${proTeam.id}`;
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET foreign_key_checks=0`);
        await tx.$executeRaw`UPDATE \`DebateRoundTeam\` SET teamId = ${PLACEHOLDER} WHERE id = ${proTeam.id}`;
        await tx.$executeRaw`UPDATE \`DebateRoundTeam\` SET teamId = ${proTeam.teamId} WHERE id = ${conTeam.id}`;
        await tx.$executeRaw`UPDATE \`DebateRoundTeam\` SET teamId = ${conTeam.teamId} WHERE id = ${proTeam.id}`;
        await tx.$executeRawUnsafe(`SET foreign_key_checks=1`);
      });
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
