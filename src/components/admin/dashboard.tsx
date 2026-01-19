"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Link2,
  Download,
  FileText,
  Users,
  LogOut,
  Clock,
  TrendingUp,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Stats {
  totalConversions: number;
  totalUrls: number;
  totalDownloads: number;
  totalUsers: number;
  recentConversions: Conversion[];
  recentUrls: ShortUrl[];
  topDownloads: FileDownload[];
}

interface Conversion {
  id: string;
  sourceName: string | null;
  entryCount: number | null;
  status: string;
  createdAt: Date;
}

interface ShortUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: Date;
}

interface FileDownload {
  id: string;
  fileName: string;
  category: string | null;
  downloads: number;
}

interface AdminDashboardProps {
  user: User;
  stats: Stats;
}

export function AdminDashboard({ user, stats }: AdminDashboardProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const statCards = [
    {
      title: "Total Conversions",
      value: stats.totalConversions.toLocaleString(),
      icon: FileText,
      color: "text-blue-500",
    },
    {
      title: "Short URLs",
      value: stats.totalUrls.toLocaleString(),
      icon: Link2,
      color: "text-green-500",
    },
    {
      title: "Downloads",
      value: stats.totalDownloads.toLocaleString(),
      icon: Download,
      color: "text-purple-500",
    },
    {
      title: "Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "text-gold",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Welcome back, {user.name}
              </p>
            </div>
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Conversions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gold" />
                <CardTitle>Recent Conversions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentConversions.length > 0 ? (
                  stats.recentConversions.slice(0, 5).map((conv, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {conv.sourceName || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {conv.entryCount} entries • {conv.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No conversions yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Downloads */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gold" />
                <CardTitle>Top Downloads</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topDownloads.length > 0 ? (
                  stats.topDownloads.slice(0, 5).map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {file.category}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-gold">
                        {file.downloads} downloads
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No downloads yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
