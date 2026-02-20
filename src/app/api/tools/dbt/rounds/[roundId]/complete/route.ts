import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { completeRoundSchema, safeParse, hasRole } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";

type Params = { params: Promise<{ roundId: string }> };

// POST — Mark round as completed (HEAD_JUDGE+ only)
// Locks all unlocked scores, sets completedAt, prevents further edits
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await validateSession(token);
    if (!user || !hasRole(user.role, "HEAD_JUDGE")) {
      return NextResponse.json(
        { error: "Only head judge or admin can complete a round" },
        { status: 403 },
      );
    }

    const { roundId } = await params;

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: {
        judgeSlots: {
          include: { scores: true },
        },
        roundTeams: {
          include: { team: true },
        },
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (round.completedAt) {
      return NextResponse.json(
        { error: "Round is already completed" },
        { status: 400 },
      );
    }

    // Parse optional body (audience votes, winner)
    const body = await req.json().catch(() => ({}));
    const parsed = safeParse(completeRoundSchema, body);

    const now = new Date();

    // Gather all speech scores from all judge slots
    const allScores = round.judgeSlots.flatMap((slot) => slot.scores);
    const unlocked = allScores.filter((s) => !s.lockedAt);

    // Lock all unlocked scores
    if (unlocked.length > 0) {
      await prisma.speechScore.updateMany({
        where: {
          id: { in: unlocked.map((s) => s.id) },
        },
        data: { lockedAt: now, isLocked: true },
      });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: "COMPLETED",
      completedAt: now,
      completedBy: user.id,
    };

    if (parsed.success) {
      if (parsed.data.audienceProVotes !== undefined) {
        updateData.audienceProVotes = parsed.data.audienceProVotes;
      }
      if (parsed.data.audienceConVotes !== undefined) {
        updateData.audienceConVotes = parsed.data.audienceConVotes;
      }
    }

    const updated = await prisma.debateRound.update({
      where: { id: roundId },
      data: updateData,
      include: {
        roundTeams: { include: { team: true } },
      },
    });

    const proTeam = updated.roundTeams.find((rt) => rt.side === "PRO");
    const conTeam = updated.roundTeams.find((rt) => rt.side === "CON");

    return NextResponse.json({
      message: "Round completed and all scores locked",
      round: {
        id: updated.id,
        status: updated.status,
        completedAt: updated.completedAt,
        completedBy: updated.completedBy,
        audienceProVotes: updated.audienceProVotes,
        audienceConVotes: updated.audienceConVotes,
        scoresLocked: allScores.length,
        proposition: proTeam?.team?.name ?? "—",
        opposition: conTeam?.team?.name ?? "—",
      },
    });
  } catch (error) {
    console.error("Complete round error:", error);
    return NextResponse.json(
      { error: "Failed to complete round" },
      { status: 500 },
    );
  }
}
