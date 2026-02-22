import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";

type Params = { params: Promise<{ roundId: string }> };

/**
 * GET /api/tools/dbt/rounds/[roundId]/slots
 * List current judge slots for a round.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { roundId } = await params;
    const slots = await prisma.judgeSlot.findMany({
      where: { roundId },
      include: {
        judge: { include: { user: true } },
      },
      orderBy: { position: "asc" },
    });
    return NextResponse.json({ slots });
  } catch (e) {
    console.error("Slots GET error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tools/dbt/rounds/[roundId]/slots
 * Add a judge (by DebateJudge id) to a round's judge panel.
 * Requires JUDGE_ADMIN+.
 * Body: { judgeId: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user || !canManage(user.role))
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );

    const { roundId } = await params;
    const body = await req.json().catch(() => ({}));
    const { judgeId } = body as { judgeId?: string };

    if (!judgeId)
      return NextResponse.json(
        { error: "judgeId is required" },
        { status: 400 },
      );

    // Verify round exists and is not completed
    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
    });
    if (!round)
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    if (round.completedAt)
      return NextResponse.json(
        { error: "Round is already completed" },
        { status: 400 },
      );

    // Verify judge belongs to this event
    const judge = await prisma.debateJudge.findFirst({
      where: { id: judgeId, eventId: round.eventId },
    });
    if (!judge)
      return NextResponse.json(
        { error: "Judge not found for this event" },
        { status: 404 },
      );

    // Check judge isn't already slotted in this round (live slot)
    const exists = await prisma.judgeSlot.findFirst({
      where: { roundId, judgeId },
    });
    if (exists)
      return NextResponse.json(
        { error: "Judge is already assigned to this round" },
        { status: 409 },
      );

    // Determine next position — only count live (non-detached) slots.
    const existingSlots = await prisma.judgeSlot.findMany({
      where: { roundId, judgeId: { not: null } },
      orderBy: { position: "asc" },
    });
    // Event-level head judge gets J1 only when no live slot holds J1 yet.
    let position: number;
    if (judge.isHeadJudge && !existingSlots.some((s) => s.position === 1)) {
      position = 1;
    } else {
      // Use live-slot count+1 so positions stay gapless for active judges.
      position = existingSlots.length + 1;
    }

    const slot = await prisma.judgeSlot.create({
      data: { roundId, judgeId, position },
      include: { judge: { include: { user: true } } },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (e) {
    console.error("Slots POST error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/tools/dbt/rounds/[roundId]/slots
 *
 * Action A — Reorder judges:
 *   Body: { reorder: { slotId: string; position: number }[] }
 *   Rules:
 *     - Every slotId must belong to this round
 *     - Positions must be unique positive integers
 *     - The round head judge must be position 1
 *   Uses a two-pass transaction to avoid unique-constraint clashes.
 *
 * Action B — Set round head judge:
 *   Body: { setRoundHead: { slotId: string } }
 *   Marks the given slot as the round's head judge (clears previous round head).
 *   Automatically promotes the slot to position 1 and demotes the previous J1
 *   to the position that was vacated.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user || !canManage(user.role))
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );

    const { roundId } = await params;
    const body = await req.json().catch(() => ({}));
    const { reorder, setRoundHead } = body as {
      reorder?: { slotId: string; position: number }[];
      setRoundHead?: { slotId: string };
    };

    // ── Action B: set / remove round head judge ────────────────────────────
    if (setRoundHead !== undefined) {
      const { slotId } = setRoundHead;
      if (!slotId)
        return NextResponse.json(
          { error: "setRoundHead.slotId is required" },
          { status: 400 },
        );

      // Verify slot belongs to this round
      const targetSlot = await prisma.judgeSlot.findUnique({
        where: { id: slotId },
      });
      if (!targetSlot || targetSlot.roundId !== roundId)
        return NextResponse.json(
          { error: "Slot not found in this round" },
          { status: 404 },
        );

      // All current slots for the round
      const allSlots = await prisma.judgeSlot.findMany({
        where: { roundId },
        orderBy: { position: "asc" },
      });

      const currentJ1 = allSlots.find((s) => s.position === 1);
      const targetPos = targetSlot.position;

      // Two-pass position swap (only needed when target isn't already J1)
      if (currentJ1 && currentJ1.id !== slotId) {
        // Pass 1 — move both to temp positions to clear unique constraint
        await prisma.$transaction([
          prisma.judgeSlot.update({
            where: { id: currentJ1.id },
            data: { position: 10001 },
          }),
          prisma.judgeSlot.update({
            where: { id: slotId },
            data: { position: 10002 },
          }),
        ]);
        // Pass 2 — assign final positions
        await prisma.$transaction([
          prisma.judgeSlot.update({
            where: { id: slotId },
            data: { position: 1, isRoundHead: true },
          }),
          prisma.judgeSlot.update({
            where: { id: currentJ1.id },
            data: { position: targetPos, isRoundHead: false },
          }),
        ]);
      } else {
        // Target is already J1 — just toggle isRoundHead
        await prisma.judgeSlot.update({
          where: { id: slotId },
          data: { isRoundHead: true },
        });
      }

      // Clear isRoundHead on all OTHER slots in this round
      await prisma.judgeSlot.updateMany({
        where: { roundId, id: { not: slotId } },
        data: { isRoundHead: false },
      });

      return NextResponse.json({ ok: true });
    }

    // ── Action A: reorder ───────────────────────────────────────────────────
    if (!reorder || !Array.isArray(reorder) || reorder.length === 0)
      return NextResponse.json(
        { error: "reorder array is required (or use setRoundHead)" },
        { status: 400 },
      );

    // Validate all slots belong to this round and fetch slot info
    const slots = await prisma.judgeSlot.findMany({
      where: { roundId },
    });
    const slotMap = new Map(slots.map((s) => [s.id, s]));

    for (const entry of reorder) {
      if (!slotMap.has(entry.slotId))
        return NextResponse.json(
          { error: `Slot ${entry.slotId} not found in this round` },
          { status: 400 },
        );
      if (!Number.isInteger(entry.position) || entry.position < 1)
        return NextResponse.json(
          { error: "Positions must be positive integers" },
          { status: 400 },
        );
    }

    // Check for duplicate positions
    const posSet = new Set(reorder.map((e) => e.position));
    if (posSet.size !== reorder.length)
      return NextResponse.json(
        { error: "Duplicate positions are not allowed" },
        { status: 400 },
      );

    // Enforce: round head judge must stay at position 1
    for (const entry of reorder) {
      const slot = slotMap.get(entry.slotId)!;
      if (slot.isRoundHead && entry.position !== 1)
        return NextResponse.json(
          { error: "The Round Head Judge must always be in the J1 position" },
          { status: 422 },
        );
    }

    // Two-pass reorder to avoid unique-constraint ([roundId, position]) clashes.
    // We use the array-form of $transaction (no persistent tx context) to avoid
    // the interactive-transaction 5-second timeout (P2028) that hits when many
    // sequential awaits are needed in a single tx callback.
    //
    // Pass 1 — move every slot to a safe temporary position (10000 + index)
    //          so no two slots share a real position during the transition.
    await prisma.$transaction(
      reorder.map((entry, i) =>
        prisma.judgeSlot.update({
          where: { id: entry.slotId },
          data: { position: 10000 + i },
        }),
      ),
    );

    // Pass 2 — assign the final requested positions now that all conflicts
    //          have been cleared in Pass 1.
    await prisma.$transaction(
      reorder.map((entry) =>
        prisma.judgeSlot.update({
          where: { id: entry.slotId },
          data: { position: entry.position },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Slots PATCH error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tools/dbt/rounds/[roundId]/slots
 * Remove a judge from a round slot.
 * Body: { slotId: string }
 *
 * Safety rules:
 *   1. If the judge has submitted (non-draft) scores: DETACH the judge from
 *      the slot instead of deleting it. The slot + scores are preserved;
 *      judgeId is set to null and the alias is snapshotted in detachedAlias.
 *      This ensures score data is never lost.
 *   2. If no submitted scores exist the slot is fully deleted (draft scores
 *      cascade-delete).
 *   3. After the slot is removed / detached, remaining live slots are
 *      renumbered sequentially (1, 2, 3…) so J positions never have gaps.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user || !canManage(user.role))
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );

    const { roundId } = await params;
    const body = await req.json().catch(() => ({}));
    const { slotId } = body as { slotId?: string };
    if (!slotId)
      return NextResponse.json(
        { error: "slotId is required" },
        { status: 400 },
      );

    // Verify the slot belongs to this round.
    const slot = await prisma.judgeSlot.findUnique({
      where: { id: slotId },
      include: {
        scores: {
          where: { isDraft: false }, // only submitted (non-draft) scores matter
          select: { id: true },
          take: 1,
        },
        judge: { select: { id: true, alias: true } },
      },
    });

    if (!slot || slot.roundId !== roundId)
      return NextResponse.json(
        { error: "Slot not found in this round" },
        { status: 404 },
      );

    // ── Data protection: detach instead of delete when scores exist ────────
    // When the judge has submitted scores we null-out judgeId (detach) and
    // snapshot their alias so the scoreboards can still attribute the scores.
    // The slot record — and all its scores — are kept intact.
    const hasSubmittedScores = slot.scores.length > 0;

    if (hasSubmittedScores) {
      const alias = slot.judge?.alias ?? "Unknown";
      await prisma.judgeSlot.update({
        where: { id: slotId },
        data: {
          judgeId: null,
          isRoundHead: false,
          detachedAlias: alias,
        },
      });
      // Renumber remaining *live* slots (judgeId != null) for this round.
      // Detached slots keep their position for score display purposes.
      const remaining = await prisma.judgeSlot.findMany({
        where: { roundId, judgeId: { not: null } },
        orderBy: { position: "asc" },
      });
      if (remaining.length > 0) {
        const hasGap = remaining.some((s, i) => s.position !== i + 1);
        if (hasGap) {
          await prisma.$transaction(
            remaining.map((s, i) =>
              prisma.judgeSlot.update({
                where: { id: s.id },
                data: { position: 10000 + i },
              }),
            ),
          );
          await prisma.$transaction(
            remaining.map((s, i) =>
              prisma.judgeSlot.update({
                where: { id: s.id },
                data: { position: i + 1 },
              }),
            ),
          );
        }
      }
      return NextResponse.json({
        ok: true,
        detached: true,
        message: `${alias} was detached from this round. Their scores have been preserved.`,
      });
    }

    // No submitted scores — safe to fully delete the slot.
    await prisma.judgeSlot.delete({ where: { id: slotId } });

    // ── Sequential renumbering ──────────────────────────────────────────────
    // Only renumber live (non-detached) slots so J positions stay sequential.
    const remaining = await prisma.judgeSlot.findMany({
      where: { roundId, judgeId: { not: null } },
      orderBy: { position: "asc" },
    });

    if (remaining.length > 0) {
      // Only renumber when there is an actual gap (avoids unnecessary writes).
      const hasGap = remaining.some((s, i) => s.position !== i + 1);
      if (hasGap) {
        // Pass 1 — move all slots to safe temp positions (10 000…) so the
        //           unique([roundId, position]) constraint isn't violated mid-way.
        await prisma.$transaction(
          remaining.map((s, i) =>
            prisma.judgeSlot.update({
              where: { id: s.id },
              data: { position: 10000 + i },
            }),
          ),
        );
        // Pass 2 — assign the final sequential positions (1, 2, 3…).
        await prisma.$transaction(
          remaining.map((s, i) =>
            prisma.judgeSlot.update({
              where: { id: s.id },
              data: { position: i + 1 },
            }),
          ),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Slots DELETE error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
