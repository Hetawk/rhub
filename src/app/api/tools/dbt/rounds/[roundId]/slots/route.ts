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
