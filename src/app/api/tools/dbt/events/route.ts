import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { createEventSchema, safeParse, canManage } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";

// GET /api/tools/dbt/events — List events (with optional filters + pagination)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const gameType = searchParams.get("gameType");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status: status as never }),
    };

    const [total, events] = await Promise.all([
      prisma.debateEvent.count({ where }),
      prisma.debateEvent.findMany({
        where,
        orderBy: { startDate: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { rounds: true, teams: true, judges: true } },
          rounds: {
            select: { id: true, gameType: true, status: true },
            ...(gameType ? { where: { gameType: gameType as never } } : {}),
          },
        },
      }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: skip + events.length < total,
      },
    });
  } catch (error) {
    console.error("List events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

// POST /api/tools/dbt/events — Create event (JUDGE_ADMIN+ only)
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = safeParse(createEventSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    // Generate slug
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    const event = await prisma.debateEvent.create({
      data: {
        slug: `${slug}-${Date.now().toString(36)}`,
        title: data.title,
        subtitle: data.subtitle,
        organizer: data.organizer,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        location: data.location,
        description: data.description,
        rules: data.rules,
        minScore: data.minScore,
        maxScore: data.maxScore,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}
