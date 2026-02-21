import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage } from "@/lib/dbt/schemas";
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
    if (!user || !canManage(user.role))
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );

    const { roundId } = await params;
    const body = await req.json().catch(() => ({}));
    const { topic, swapTeams } = body as {
      topic?: string;
      swapTeams?: boolean;
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

    // Update topic
    if (topic !== undefined && String(topic).trim()) {
      await prisma.debateRound.update({
        where: { id: roundId },
        data: { topic: String(topic).trim() },
      });
    }

    // Swap PRO/CON sides using a single CASE UPDATE to avoid unique constraint violation
    if (swapTeams) {
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
