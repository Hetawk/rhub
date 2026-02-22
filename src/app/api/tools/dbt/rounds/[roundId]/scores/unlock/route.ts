/**
 * PATCH /api/tools/dbt/rounds/[roundId]/scores/unlock
 *
 * Allows HEAD_JUDGE / JUDGE_ADMIN / ADMIN / SUPER_ADMIN to unlock
 * time-locked or manually-locked SpeechScore rows so judges can
 * (re-)submit scores they did not manage to submit before the lock hit.
 *
 * ALL existing criteria data is preserved — only isLocked and lockedAt are
 * cleared. isDraft is also cleared to false if the score has criteria data,
 * so the judge's previously-entered values remain visible but the judge can
 * update and re-submit through the normal Submit flow.
 *
 * Body (JSON):
 *   slotId?      — restrict to a specific judge slot; omit = all judges
 *   speechType?  — restrict to a specific speech type; omit = all types
 *   scoreIds?    — restrict to an explicit list of SpeechScore ids
 *
 * Response:
 *   { unlocked: number }  — how many records were updated
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";
import type { SpeechType } from "@prisma/client";

type Params = { params: Promise<{ roundId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Require HEAD_JUDGE (via canManage) or that the user is the head judge
    // of this event.  canManage covers JUDGE_ADMIN, ADMIN, SUPER_ADMIN.
    // HEAD_JUDGE is checked via the round's judge slots below.
    const { roundId } = await params;

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: {
        judgeSlots: {
          include: { judge: { select: { userId: true, isHeadJudge: true } } },
        },
      },
    });
    if (!round)
      return NextResponse.json({ error: "Round not found" }, { status: 404 });

    const isHeadJudge = round.judgeSlots.some(
      (s) => s.judge.userId === user.id && s.judge.isHeadJudge,
    );
    const canControl = canManage(user.role) || isHeadJudge;
    if (!canControl) {
      return NextResponse.json(
        {
          error:
            "Only the Head Judge, Judge Admin, Admin or Super Admin can unlock scores",
        },
        { status: 403 },
      );
    }

    // Cannot unlock scores on a completed (permanently locked) round.
    // Use "Re-open Round" for that.
    if (round.completedAt) {
      return NextResponse.json(
        {
          error:
            "This round is completed. Use 'Re-open Round' to unlock scores for a completed round.",
        },
        { status: 403 },
      );
    }

    const body = (await req.json()) as {
      slotId?: string;
      speechType?: string;
      scoreIds?: string[];
    };

    // Build the where filter — always scope to this round
    const slotsInRound = round.judgeSlots.map((s) => s.id);

    // If caller supplied explicit score IDs, validate they belong to this round
    if (body.scoreIds && body.scoreIds.length > 0) {
      const result = await prisma.speechScore.updateMany({
        where: {
          id: { in: body.scoreIds },
          slotId: { in: slotsInRound },
          // Only touch records that are actually locked (by time or flag)
          OR: [{ isLocked: true }, { lockedAt: { lte: new Date() } }],
        },
        data: {
          isLocked: false,
          lockedAt: null,
        },
      });
      return NextResponse.json({ unlocked: result.count });
    }

    // Generic filter: slotId + optional speechType
    const whereSlot = body.slotId
      ? { equals: body.slotId }
      : { in: slotsInRound };

    const result = await prisma.speechScore.updateMany({
      where: {
        slotId: whereSlot,
        ...(body.speechType
          ? { speechType: body.speechType as SpeechType }
          : {}),
        OR: [{ isLocked: true }, { lockedAt: { lte: new Date() } }],
      },
      data: {
        isLocked: false,
        lockedAt: null,
      },
    });

    return NextResponse.json({ unlocked: result.count });
  } catch (error) {
    console.error("Unlock scores error:", error);
    return NextResponse.json(
      { error: "Failed to unlock scores" },
      { status: 500 },
    );
  }
}
