import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { audienceVoteSchema, safeParse, hasRole } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";

type Params = { params: Promise<{ roundId: string }> };

// GET — Get current audience vote counts
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { roundId } = await params;

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      select: { audienceProVotes: true, audienceConVotes: true },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    return NextResponse.json({
      pro: round.audienceProVotes,
      con: round.audienceConVotes,
    });
  } catch (error) {
    console.error("Get votes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch votes" },
      { status: 500 },
    );
  }
}

// POST — Set audience vote counts (HEAD_JUDGE+ only)
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
        { error: "Only head judge or admin can enter audience votes" },
        { status: 403 },
      );
    }

    const { roundId } = await params;

    // Check round exists and is not completed
    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (round.completedAt) {
      return NextResponse.json(
        { error: "Game is completed. No further edits allowed." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = safeParse(audienceVoteSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const updated = await prisma.debateRound.update({
      where: { id: roundId },
      data: {
        audienceProVotes: parsed.data.proVotes,
        audienceConVotes: parsed.data.conVotes,
      },
    });

    return NextResponse.json({
      pro: updated.audienceProVotes,
      con: updated.audienceConVotes,
    });
  } catch (error) {
    console.error("Set votes error:", error);
    return NextResponse.json({ error: "Failed to set votes" }, { status: 500 });
  }
}
