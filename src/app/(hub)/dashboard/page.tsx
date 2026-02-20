"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  LayoutDashboard,
  Gavel,
  Shield,
  BookOpen,
  Link2,
  Download,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  Wrench,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleMeta } from "@/lib/roles";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

const TOOLS = [
  {
    icon: FileText,
    label: "LaTeX to Word",
    description: "Convert LaTeX manuscripts to Word documents",
    href: "/tools/latex",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Link2,
    label: "URL Shortener",
    description: "Shorten and manage links",
    href: "/tools/s",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: BookOpen,
    label: "Reference Tools",
    description: "BibTeX & reference converters",
    href: "/tools/ref",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: ImageIcon,
    label: "Image Tools",
    description: "Image utilities and converters",
    href: "/tools/img",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Download,
    label: "Downloads",
    description: "Templates, guides and resources",
    href: "/downloads",
    color: "text-ekd-gold",
    bg: "bg-ekd-gold/10",
  },
  {
    icon: BookOpen,
    label: "Documentation",
    description: "API reference and guides",
    href: "/docs",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
];

function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setUser(data);
        else router.replace("/login?redirect=/dashboard");
      })
      .catch(() => router.replace("/login?redirect=/dashboard"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
      </div>
    );
  }

  if (!user) return null;

  const roleInfo = getRoleMeta(user.role);
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isJudgeRole = [
    "SUPER_ADMIN",
    "ADMIN",
    "JUDGE_ADMIN",
    "HEAD_JUDGE",
    "JUDGE",
  ].includes(user.role);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="h-5 w-5 text-ekd-gold" />
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            {greeting},{" "}
            <span className="font-semibold text-foreground">{user.name}</span>.
            Welcome to the EKD Digital Resource Hub.
          </p>
        </div>
        {/* Role badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full",
            roleInfo.badge,
          )}
        >
          <Wrench className="h-3 w-3" />
          {roleInfo.label}
        </span>
      </div>

      {/* Role-specific callout cards */}
      {(isJudgeRole || isAdmin) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {isJudgeRole && (
            <Link
              href="/tools/dbt/judge"
              className="group flex items-center gap-4 rounded-xl border border-ekd-gold/30 bg-ekd-gold/5 hover:bg-ekd-gold/10 px-5 py-4 transition-colors"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ekd-gold/20 text-ekd-gold shrink-0">
                <Gavel className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">
                  Judge Dashboard
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  View your debate assignments and scoring sheets
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-ekd-gold group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="group flex items-center gap-4 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 px-5 py-4 transition-colors"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 shrink-0">
                {isSuperAdmin ? (
                  <Crown className="h-5 w-5" />
                ) : (
                  <Shield className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">
                  {isSuperAdmin ? "Super Admin Panel" : "Admin Panel"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSuperAdmin
                    ? "Manage users, roles, and system settings"
                    : "Manage users and platform resources"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Tools grid */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">
          Tools &amp; Resources
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card hover:border-ekd-gold/40 hover:shadow-sm px-4 py-3.5 transition-all"
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg shrink-0 mt-0.5",
                  tool.bg,
                )}
              >
                <tool.icon className={cn("h-4 w-4", tool.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-ekd-gold transition-colors">
                  {tool.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {tool.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links footer */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <Link
          href="/profile"
          className="hover:text-foreground transition-colors"
        >
          Edit Profile
        </Link>
        <span className="text-border">·</span>
        <Link
          href="/tools/dbt"
          className="hover:text-foreground transition-colors"
        >
          Debate Hub
        </Link>
        <span className="text-border">·</span>
        <Link href="/docs" className="hover:text-foreground transition-colors">
          API Docs
        </Link>
        <span className="text-border">·</span>
        <Link href="/api" className="hover:text-foreground transition-colors">
          API Reference
        </Link>
        <span className="text-border">·</span>
        <a
          href="https://ekddigital.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          EKD Digital ↗
        </a>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
