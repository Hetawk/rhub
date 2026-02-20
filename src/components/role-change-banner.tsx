"use client";

import { useState } from "react";
import { AlertTriangle, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleChangeBannerProps {
  /** ISO string of when the role was changed (from API) */
  roleChangedAt: string | null;
  /** ISO string of when the current session was created (from API) */
  sessionCreatedAt: string | null;
}

/**
 * Shows a dismissible warning banner when the admin has changed the user's
 * role AFTER their current session was created, prompting them to re-login.
 */
export function RoleChangeBanner({
  roleChangedAt,
  sessionCreatedAt,
}: RoleChangeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!roleChangedAt || !sessionCreatedAt) return null;

  const changed = new Date(roleChangedAt).getTime();
  const session = new Date(sessionCreatedAt).getTime();

  // Only show if the role changed AFTER the current session started
  if (changed <= session) return null;

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 mb-5",
        "text-amber-800 dark:text-amber-300",
      )}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-semibold">
          Your role has been updated by an administrator.
        </p>
        <p className="mt-0.5 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
          Please sign out and sign back in to activate your new permissions and
          access updated features.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Sign out now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
