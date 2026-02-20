import { Wrench, Users, BookOpen, Zap } from "lucide-react";
import { DASHBOARD_TOOLS } from "@/lib/dashboard/dashboard-config";
import type { RoleMeta } from "@/lib/roles";

interface StatsBarProps {
  roleInfo: RoleMeta;
  isJudgeRole: boolean;
  isAdmin: boolean;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}

/**
 * A row of quick-stat tiles shown below the welcome header.
 * Gives the dashboard an at-a-glance summary feel.
 */
export function StatsBar({ roleInfo, isJudgeRole, isAdmin }: StatsBarProps) {
  const stats: StatItem[] = [
    {
      label: "Available Tools",
      value: DASHBOARD_TOOLS.length,
      icon: Wrench,
      accent: "text-ekd-gold",
    },
    {
      label: "Access Level",
      value: roleInfo.label,
      icon: Users,
      accent: roleInfo.color,
    },
    {
      label: "Resources",
      value: "Docs & Downloads",
      icon: BookOpen,
      accent: "text-sky-500",
    },
    {
      label: "Capabilities",
      value: isAdmin
        ? "Full Access"
        : isJudgeRole
          ? "Judge Access"
          : "Standard",
      icon: Zap,
      accent: isAdmin
        ? "text-purple-500"
        : isJudgeRole
          ? "text-ekd-gold"
          : "text-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
            <stat.icon className={`h-4 w-4 ${stat.accent}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground leading-none mb-1">
              {stat.label}
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
