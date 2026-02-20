"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Shield,
  Users,
  FileText,
  Link2,
  Download,
  Crown,
  ChevronRight,
  UserCog,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  roleBreakdown: Record<string, number>;
  totalConversions: number;
  totalUrls: number;
  totalDownloads: number;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  JUDGE_ADMIN: "Judge Admin",
  HEAD_JUDGE: "Head Judge",
  JUDGE: "Judge",
  USER: "User",
};

function AdminContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.id) {
          router.replace("/login?redirect=/admin");
          return;
        }
        if (!["SUPER_ADMIN", "ADMIN"].includes(data.role)) {
          router.replace("/dashboard");
          return;
        }
        setUser(data);
        setLoading(false);
        // Load stats
        fetch("/api/admin/stats")
          .then((r) => r.json())
          .then((s) => setStats(s))
          .catch(() => null)
          .finally(() => setStatsLoading(false));
      })
      .catch(() => router.replace("/login?redirect=/admin"));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
      </div>
    );
  }

  if (!user) return null;

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? "—",
      icon: Users,
      color: "text-ekd-gold",
      bg: "bg-ekd-gold/10",
      href: "/admin/users",
    },
    {
      label: "Active Users",
      value: stats?.activeUsers ?? "—",
      icon: Users,
      color: "text-green-500",
      bg: "bg-green-500/10",
      href: "/admin/users",
    },
    {
      label: "LaTeX Conversions",
      value: stats?.totalConversions ?? "—",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/tools/latex",
    },
    {
      label: "Short URLs",
      value: stats?.totalUrls ?? "—",
      icon: Link2,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/tools/s",
    },
    {
      label: "Total Downloads",
      value: stats?.totalDownloads ?? "—",
      icon: Download,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      href: "/downloads",
    },
  ];

  const adminActions = [
    {
      icon: UserCog,
      label: "User Management",
      description: "Create, edit, and assign roles to users",
      href: "/admin/users",
      show: true,
      color: "text-ekd-gold",
      bg: "bg-ekd-gold/10",
    },
    {
      icon: Settings,
      label: "System Settings",
      description: "Configure platform-wide settings",
      href: "/admin/settings",
      show: isSuperAdmin,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ].filter((a) => a.show);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isSuperAdmin ? (
              <Crown className="h-5 w-5 text-purple-500" />
            ) : (
              <Shield className="h-5 w-5 text-blue-500" />
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {isSuperAdmin ? "Super Admin Panel" : "Admin Panel"}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Welcome,{" "}
            <span className="font-semibold text-foreground">{user.name}</span>.
            Manage the EKD Digital Resource Hub platform.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Platform Overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl border border-border bg-card hover:border-ekd-gold/30 hover:shadow-sm px-4 py-4 transition-all group"
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg mb-3",
                  card.bg,
                )}
              >
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {statsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : typeof card.value === "number" ? (
                  card.value.toLocaleString()
                ) : (
                  card.value
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Role breakdown */}
      {stats?.roleBreakdown && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Users by Role
          </h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {Object.entries(stats.roleBreakdown)
              .sort(([a], [b]) => {
                const order = [
                  "SUPER_ADMIN",
                  "ADMIN",
                  "JUDGE_ADMIN",
                  "HEAD_JUDGE",
                  "JUDGE",
                  "USER",
                ];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="text-sm font-medium text-foreground">
                    {ROLE_LABELS[role] ?? role}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Admin actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Admin Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {adminActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card hover:border-ekd-gold/30 hover:shadow-sm px-5 py-4 transition-all"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
                  action.bg,
                )}
              >
                <action.icon className={cn("h-5 w-5", action.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-ekd-gold group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
