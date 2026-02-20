import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import {
  createTeamSchema,
  importTeamsSchema,
  safeParse,
  canManage,
} from "@/lib/dbt/schemas";
import { cookies } from "next/headers";

type Params = { params: Promise<{ id: string }> };

// GET /api/tools/dbt/events/[id]/teams — List teams for event
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const teams = await prisma.debateTeam.findMany({
      where: { eventId: id },
      include: { members: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ teams });
  } catch (error) {
    console.error("List teams error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 },
    );
  }
}

// POST /api/tools/dbt/events/[id]/teams — Add team or import teams
export async function POST(req: NextRequest, { params }: Params) {
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

    // Check if it's a bulk import (has "teams" array)
    if (body.teams && Array.isArray(body.teams)) {
      const parsed = safeParse(importTeamsSchema, body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const created = await prisma.$transaction(
        parsed.data.teams.map((t) =>
          prisma.debateTeam.create({
            data: {
              eventId: id,
              name: t.name,
              city: t.city,
              members: t.members?.length
                ? {
                    create: t.members.map((m) => ({
                      name: m.name,
                      role: m.role,
                      userId: m.userId,
                    })),
                  }
                : undefined,
            },
            include: { members: true },
          }),
        ),
      );

      return NextResponse.json(
        { teams: created, count: created.length },
        { status: 201 },
      );
    }

    // Single team creation
    const parsed = safeParse(createTeamSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    const team = await prisma.debateTeam.create({
      data: {
        eventId: id,
        name: data.name,
        city: data.city,
        members: data.members?.length
          ? {
              create: data.members.map((m) => ({
                name: m.name,
                role: m.role,
                userId: m.userId,
              })),
            }
          : undefined,
      },
      include: { members: true },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error("Add team error:", error);
    return NextResponse.json({ error: "Failed to add team" }, { status: 500 });
  }
}
