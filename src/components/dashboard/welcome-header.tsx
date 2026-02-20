import { LayoutDashboard, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleMeta } from "@/lib/roles";

interface WelcomeHeaderProps {
  userName: string;
  greeting: string;
  roleInfo: RoleMeta;
}

/**
 * Dashboard page header — greeting + role badge.
 */
export function WelcomeHeader({
  userName,
  greeting,
  roleInfo,
}: WelcomeHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard className="h-5 w-5 text-ekd-gold" />
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          {greeting},{" "}
          <span className="font-semibold text-foreground">{userName}</span>.
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
  );
}
