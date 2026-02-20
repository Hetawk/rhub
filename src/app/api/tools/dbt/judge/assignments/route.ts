import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { cookies } from "next/headers";

// GET /api/tools/dbt/judge/assignments — Get current user's judge assignments
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await validateSession(token);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const assignments = await prisma.debateJudge.findMany({
      where: { userId: user.id },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            rounds: {
              orderBy: { roundNum: "asc" },
              select: {
                id: true,
                roundNum: true,
                title: true,
                topic: true,
                status: true,
                gameType: true,
                completedAt: true,
              },
            },
          },
        },
        slots: {
          include: {
            round: {
              select: {
                id: true,
                roundNum: true,
                title: true,
                topic: true,
                gameType: true,
                completedAt: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Get assignments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 },
    );
  }
}
