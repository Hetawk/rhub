import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats — dashboard overview stats
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await validateSession(token);
  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    activeUsers,
    usersByRole,
    totalConversions,
    totalUrls,
    totalDownloads,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
    prisma.laTeXConversion.count(),
    prisma.shortUrl.count(),
    prisma.downloadableFile.aggregate({ _sum: { downloads: true } }),
  ]);

  const roleBreakdown = Object.fromEntries(
    usersByRole.map((r) => [r.role, r._count.role]),
  );

  return NextResponse.json({
    totalUsers,
    activeUsers,
    roleBreakdown,
    totalConversions,
    totalUrls,
    totalDownloads: totalDownloads._sum.downloads ?? 0,
  });
}
