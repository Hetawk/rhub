import Link from "next/link";
import { Gavel, Shield, Crown, ChevronRight } from "lucide-react";

interface CalloutCardsProps {
  isJudgeRole: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/**
 * Role-gated callout cards directing judges and admins to their key areas.
 * Only rendered when the user has elevated permissions.
 */
export function CalloutCards({
  isJudgeRole,
  isAdmin,
  isSuperAdmin,
}: CalloutCardsProps) {
  if (!isJudgeRole && !isAdmin) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        Your Access
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
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
                View assignments and scoring sheets
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
    </div>
  );
}
