import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRoleChangeEmail } from "@/lib/mail";
import { z } from "zod";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const user = await validateSession(token);
  if (!user) return null;
  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) return null;
  return user;
}

const updateUserSchema = z.object({
  role: z
    .enum([
      "SUPER_ADMIN",
      "ADMIN",
      "JUDGE_ADMIN",
      "HEAD_JUDGE",
      "JUDGE",
      "USER",
    ])
    .optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(100).optional(),
});

/**
 * PATCH /api/admin/users/[id] — update user role, active status, or name
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 },
    );
  }

  const { role, isActive, name } = parsed.data;

  // Role elevation guard — only SUPER_ADMIN can grant SUPER_ADMIN / ADMIN
  if (
    role &&
    (role === "SUPER_ADMIN" || role === "ADMIN") &&
    admin.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "Only Super Admins can assign Admin or Super Admin roles" },
      { status: 403 },
    );
  }

  // Prevent non-SUPER_ADMIN from editing a SUPER_ADMIN
  if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Cannot modify a Super Admin account" },
      { status: 403 },
    );
  }

  // Prevent self-demotion to USER if the only SUPER_ADMIN
  if (
    role &&
    role !== "SUPER_ADMIN" &&
    target.id === admin.id &&
    admin.role === "SUPER_ADMIN"
  ) {
    const superAdminCount = await prisma.user.count({
      where: { role: "SUPER_ADMIN" },
    });
    if (superAdminCount <= 1) {
      return NextResponse.json(
        {
          error:
            "Cannot demote the only Super Admin. Create another Super Admin first.",
        },
        { status: 400 },
      );
    }
  }

  const roleChanged = role !== undefined && role !== target.role;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(name !== undefined ? { name: name.trim() } : {}),
      // Mark the time the role was changed so the client can show a re-login banner
      ...(roleChanged ? { roleChangedAt: new Date() } : {}),
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

  // Fire-and-forget email notification when role changes
  if (roleChanged) {
    sendRoleChangeEmail(target.email, target.name, target.role, role!).catch(
      (err) => console.error("[role-change-email]", err),
    );
  }

  return NextResponse.json({ user: updated });
}

/**
 * DELETE /api/admin/users/[id] — delete user (SUPER_ADMIN only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (admin.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only Super Admins can delete users" },
      { status: 403 },
    );
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ message: "User deleted" });
}
