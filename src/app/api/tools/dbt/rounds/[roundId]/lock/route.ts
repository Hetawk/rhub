import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";
import { z } from "zod";

type Params = { params: Promise<{ roundId: string }> };

const setLockSchema = z.object({
  scoreLockDeadline: z.string().nullable().optional(),
  clearLock: z.boolean().optional(),
});

/**
 * GET /api/tools/dbt/rounds/[roundId]/lock
 * Returns the current score lock deadline for a round.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { roundId } = await params;
    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        scoreLockDeadline: true,
        scoreLockSetBy: true,
        completedAt: true,
      },
    });
    if (!round)
      return NextResponse.json({ error: "Round not found" }, { status: 404 });

    const now = new Date();
    const isLocked =
      !!round.completedAt ||
      (!!round.scoreLockDeadline && new Date(round.scoreLockDeadline) < now);

    return NextResponse.json({
      scoreLockDeadline: round.scoreLockDeadline,
      scoreLockSetBy: round.scoreLockSetBy,
      isLocked,
      isCompleted: !!round.completedAt,
      now: now.toISOString(),
    });
  } catch (error) {
    console.error("Get lock error:", error);
    return NextResponse.json(
      { error: "Failed to get lock status" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tools/dbt/rounds/[roundId]/lock
 * Set or clear the score lock deadline for a round.
 * Requires JUDGE_ADMIN or higher (Super Admin has absolute control).
 *
 * Body:
 *   { scoreLockDeadline: "ISO date string" }  — set a deadline
 *   { clearLock: true }                        — remove the deadline
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user || !canManage(user.role)) {
      return NextResponse.json(
        {
          error:
            "Only Judge Admins, Admins, and Super Admins can set score lock deadlines.",
        },
        { status: 403 },
      );
    }

    const { roundId } = await params;
    const body = await req.json();

    const parsed = setLockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 },
      );
    }

    const { clearLock, scoreLockDeadline } = parsed.data;

    if (clearLock) {
      await prisma.debateRound.update({
        where: { id: roundId },
        data: { scoreLockDeadline: null, scoreLockSetBy: null },
      });
      return NextResponse.json({ message: "Score lock deadline cleared." });
    }

    if (scoreLockDeadline === null || scoreLockDeadline === undefined) {
      return NextResponse.json(
        { error: "Provide scoreLockDeadline (ISO date) or clearLock: true" },
        { status: 400 },
      );
    }

    const deadline = new Date(scoreLockDeadline);
    if (isNaN(deadline.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format." },
        { status: 400 },
      );
    }

    const updated = await prisma.debateRound.update({
      where: { id: roundId },
      data: {
        scoreLockDeadline: deadline,
        scoreLockSetBy: user.id,
      },
    });

    return NextResponse.json({
      message: "Score lock deadline set successfully.",
      scoreLockDeadline: updated.scoreLockDeadline,
    });
  } catch (error) {
    console.error("Set lock error:", error);
    return NextResponse.json(
      { error: "Failed to set lock deadline" },
      { status: 500 },
    );
  }
}
