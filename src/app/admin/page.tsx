import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "@/components/admin/dashboard";

async function getStats() {
  const [
    totalConversions,
    totalUrls,
    totalDownloads,
    totalUsers,
    recentConversions,
    recentUrls,
    topDownloads,
  ] = await Promise.all([
    prisma.conversionJob.count(),
    prisma.shortUrl.count(),
    prisma.downloadableFile.aggregate({
      _sum: { downloads: true },
    }),
    prisma.user.count(),
    prisma.conversionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.shortUrl.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.downloadableFile.findMany({
      orderBy: { downloads: "desc" },
      take: 10,
    }),
  ]);

  return {
    totalConversions,
    totalUrls,
    totalDownloads: totalDownloads._sum.downloads || 0,
    totalUsers,
    recentConversions,
    recentUrls,
    topDownloads,
  };
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const user = await validateSession(token);

  if (!user) {
    redirect("/admin/login");
  }

  const stats = await getStats();

  return <AdminDashboard user={user} stats={stats} />;
}
