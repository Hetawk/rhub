"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/user-context";
import { Loader2 } from "lucide-react";
import { getRoleMeta } from "@/lib/roles";
import { getGreeting } from "@/lib/dashboard/dashboard-config";
import { AppShell } from "@/components/app-shell";
import { RoleChangeBanner } from "@/components/role-change-banner";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { CalloutCards } from "@/components/dashboard/callout-cards";
import { ToolsGrid } from "@/components/dashboard/tools-grid";
import { QuickLinks } from "@/components/dashboard/quick-links";

function DashboardContent() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/dashboard");
    }
  }, [loading, user, router]);

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

  return (
    <AppShell user={user}>
      <div className="space-y-6 py-2">
        <RoleChangeBanner
          roleChangedAt={user.roleChangedAt}
          sessionCreatedAt={user.sessionCreatedAt}
        />

        {/* Welcome header */}
        <WelcomeHeader
          userName={user.name}
          greeting={getGreeting()}
          roleInfo={roleInfo}
        />

        {/* Quick stats row */}
        <StatsBar
          roleInfo={roleInfo}
          isJudgeRole={isJudgeRole}
          isAdmin={isAdmin}
        />

        {/* Role-gated callout cards */}
        <CalloutCards
          isJudgeRole={isJudgeRole}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
        />

        {/* Tools grid */}
        <ToolsGrid />

        {/* Quick links footer */}
        <QuickLinks />
      </div>
    </AppShell>
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
