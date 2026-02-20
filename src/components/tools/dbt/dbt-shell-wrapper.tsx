"use client";

import { useUser } from "@/contexts/user-context";
import { AppShell } from "@/components/app-shell";
import { AppMobileNav } from "@/components/navigation/app-sidebar";
import { Loader2 } from "lucide-react";

/**
 * Wraps all /tools/dbt/* pages with the shared sidebar layout.
 * Uses the UserProvider already mounted by the (hub) layout.
 * – Authenticated: renders full AppShell (sidebar + content)
 * – Loading: centred spinner
 * – Unauthenticated: renders children without sidebar
 *   (individual pages handle their own redirect logic)
 */
export function DbtShellWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
      </div>
    );
  }

  if (!user) {
    // Not logged in — individual pages will redirect; render plainly
    return <div className="py-8">{children}</div>;
  }

  return <AppShell user={user}>{children}</AppShell>;
}

/**
 * Mobile-only nav strip for dbt pages — used when we only need the
 * horizontal pill nav without the full desktop sidebar (e.g. sub-shells
 * that manage their own layout).
 */
export function DbtMobileNav() {
  const { user } = useUser();
  if (!user) return null;
  return <AppMobileNav user={user} />;
}
