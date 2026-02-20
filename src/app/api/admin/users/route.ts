import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession, hashPwd } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin(req?: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const user = await validateSession(token);
  if (!user) return null;
  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) return null;
  return user;
}

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "JUDGE_ADMIN",
    "HEAD_JUDGE",
    "JUDGE",
    "USER",
  ]),
});

/**
 * GET /api/admin/users — list all users
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q")?.trim() || "";
  const role = searchParams.get("role") || "";
  const take = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const skip = parseInt(searchParams.get("offset") || "0");

  const where = {
    ...(search
      ? {
          OR: [{ name: { contains: search } }, { email: { contains: search } }],
        }
      : {}),
    ...(role ? { role: role as never } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        googleId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total });
}

/**
 * POST /api/admin/users — create a new user (admin creates directly, bypasses email verify)
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only SUPER_ADMIN can create SUPER_ADMIN or ADMIN
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 },
    );
  }
  const { name, email, password, role } = parsed.data;

  // Role elevation guard
  if (
    (role === "SUPER_ADMIN" || role === "ADMIN") &&
    admin.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "Only Super Admins can create Admin or Super Admin accounts" },
      { status: 403 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 },
    );
  }

  const hashed = await hashPwd(password);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role,
      isActive: true,
      emailVerified: true, // admin-created users are verified
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
