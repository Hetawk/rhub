import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";

type Params = { params: Promise<{ id: string; judgeId: string }> };

// DELETE /api/tools/dbt/events/[id]/judges/[judgeId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user || !canManage(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, judgeId } = await params;

    // Verify judge belongs to this event
    const judge = await prisma.debateJudge.findFirst({
      where: { id: judgeId, eventId: id },
      include: { slots: { select: { id: true } } },
    });
    if (!judge)
      return NextResponse.json({ error: "Judge not found" }, { status: 404 });

    // Prevent removing if judge has submitted scores
    const hasScores = await prisma.speechScore.findFirst({
      where: { slot: { judgeId } },
    });
    if (hasScores)
      return NextResponse.json(
        { error: "Cannot remove a judge who has already submitted scores" },
        { status: 409 },
      );

    await prisma.debateJudge.delete({ where: { id: judgeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove judge error:", error);
    return NextResponse.json(
      { error: "Failed to remove judge" },
      { status: 500 },
    );
  }
}
