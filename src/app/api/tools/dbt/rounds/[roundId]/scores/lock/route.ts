import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SCORING } from "@/lib/dbt";

type Params = { params: Promise<{ roundId: string }> };

/**
 * POST /api/tools/dbt/rounds/[roundId]/scores/lock
 * Lock all scores whose lockedAt has passed. Called periodically or on-demand.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { roundId } = await params;

    const result = await prisma.speechScore.updateMany({
      where: {
        slot: { roundId },
        isLocked: false,
        lockedAt: { lte: new Date() },
      },
      data: { isLocked: true },
    });

    return NextResponse.json({
      locked: result.count,
      lockDelay: SCORING.LOCK_DELAY_SECONDS,
    });
  } catch (error) {
    console.error("Lock scores error:", error);
    return NextResponse.json(
      { error: "Failed to lock scores" },
      { status: 500 },
    );
  }
}
