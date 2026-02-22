import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { updateEventSchema, safeParse, canManage } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";

type Params = { params: Promise<{ id: string }> };

// GET /api/tools/dbt/events/[id] — Get event detail (public)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const event = await prisma.debateEvent.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        teams: { include: { members: true } },
        rounds: {
          orderBy: { roundNum: "asc" },
          include: {
            roundTeams: { include: { team: true } },
            judgeSlots: {
              orderBy: { position: "asc" },
              include: {
                judge: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
                scores: { select: { id: true, isDraft: true } },
              },
            },
          },
        },
        judges: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Get event error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 },
    );
  }
}

// PATCH /api/tools/dbt/events/[id] — Update event (JUDGE_ADMIN+)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await validateSession(token);
    if (!user || !canManage(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = safeParse(updateEventSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    const event = await prisma.debateEvent.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
        ...(data.organizer !== undefined && { organizer: data.organizer }),
        ...(data.status && { status: data.status }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.rules !== undefined && { rules: data.rules }),
        ...(data.minScore !== undefined && { minScore: data.minScore }),
        ...(data.maxScore !== undefined && { maxScore: data.maxScore }),
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 },
    );
  }
}

// DELETE /api/tools/dbt/events/[id] — Delete event (JUDGE_ADMIN+)
// Data-protection rule: blocked when the event contains any submitted scores.
// Pass ?force=true to override after explicit user confirmation.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await validateSession(token);
    if (!user || !canManage(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const force = req.nextUrl.searchParams.get("force") === "true";

    const event = await prisma.debateEvent.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // ── Data-protection check ────────────────────────────────────────────
    if (!force) {
      const submittedScore = await prisma.speechScore.findFirst({
        where: {
          isDraft: false,
          slot: { round: { eventId: id } },
        },
        select: { id: true },
      });
      if (submittedScore)
        return NextResponse.json(
          {
            error:
              "This event contains submitted scores. Deleting it will permanently destroy all scoring data. " +
              "To confirm, resend this request with ?force=true.",
            hasSubmittedScores: true,
          },
          { status: 409 },
        );
    }

    // Cascade delete — Prisma onDelete:Cascade handles children
    await prisma.debateEvent.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 },
    );
  }
}
