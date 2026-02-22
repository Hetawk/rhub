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

    // Check judge isn't already slotted in this round
    const exists = await prisma.judgeSlot.findUnique({
      where: { roundId_judgeId: { roundId, judgeId } },
    });
    if (exists)
      return NextResponse.json(
        { error: "Judge is already assigned to this round" },
        { status: 409 },
      );

    // Determine next position — head judge always gets position 1 if not yet taken
    const existingSlots = await prisma.judgeSlot.findMany({
      where: { roundId },
      orderBy: { position: "asc" },
    });
    // Position: head judge → 1 (shift others), else count+1
    let position: number;
    if (judge.isHeadJudge && !existingSlots.some((s) => s.position === 1)) {
      position = 1;
    } else {
      const maxPos = existingSlots.reduce((m, s) => Math.max(m, s.position), 0);
      position = maxPos + 1;
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
 * Atomically reorder judge positions in a round.
 * Body: { reorder: { slotId: string; position: number }[] }
 * Rules:
 *   - Every slotId must belong to this round
 *   - Positions must be unique positive integers
 *   - The head judge must be position 1
 * Uses a two-pass transaction to avoid unique-constraint clashes.
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
    const { reorder } = body as {
      reorder?: { slotId: string; position: number }[];
    };

    if (!reorder || !Array.isArray(reorder) || reorder.length === 0)
      return NextResponse.json(
        { error: "reorder array is required" },
        { status: 400 },
      );

    // Validate all slots belong to this round and fetch judge info
    const slots = await prisma.judgeSlot.findMany({
      where: { roundId },
      include: { judge: { select: { isHeadJudge: true } } },
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

    // Enforce: head judge must be at position 1
    for (const entry of reorder) {
      const slot = slotMap.get(entry.slotId)!;
      if (slot.judge.isHeadJudge && entry.position !== 1)
        return NextResponse.json(
          { error: "The Head Judge must always be in the J1 position" },
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
 * Remove a judge slot by slotId.
 * Body: { slotId: string }
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

    await prisma.judgeSlot.deleteMany({ where: { id: slotId, roundId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Slots DELETE error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
