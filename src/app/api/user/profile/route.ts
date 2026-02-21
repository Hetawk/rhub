import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  validateSessionFull,
  validateSession,
  hashPwd,
  verifyPwd,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

const changePasswordSchema = z.object({
  // optional for OAuth users setting a password for the first time
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128),
});

/**
 * GET /api/user/profile — get current user's full profile
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await validateSessionFull(token);
    if (!result)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, sessionCreatedAt } = result;

    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        googleId: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        roleChangedAt: true,
        password: true, // only to check if password is set
      },
    });

    if (!full)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      id: full.id,
      name: full.name,
      email: full.email,
      role: full.role,
      isGoogleLinked: !!full.googleId,
      hasPassword: !!full.password,
      isActive: full.isActive,
      emailVerified: full.emailVerified,
      createdAt: full.createdAt,
      roleChangedAt: full.roleChangedAt ?? null,
      sessionCreatedAt: sessionCreatedAt.toISOString(),
    });
  } catch (err) {
    console.error("[profile GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/user/profile — update name
 */
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name.trim() },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("[profile PATCH]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile — change password
 */
export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 },
      );
    }

    const full = await prisma.user.findUnique({ where: { id: user.id } });
    if (!full)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (full.password) {
      // Existing password — require current password verification
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 },
        );
      }
      const valid = await verifyPwd(parsed.data.currentPassword, full.password);
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      }
    }
    // If !full.password (OAuth-only user), allow setting a new password freely

    const hashed = await hashPwd(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("[profile PUT]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
