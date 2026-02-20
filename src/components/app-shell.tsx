"use client";

import { AppSidebar, AppMobileNav } from "@/components/navigation/app-sidebar";

interface ShellUser {
  id: string;
  name: string;
  role: string;
}

interface AppShellProps {
  user: ShellUser;
  children: React.ReactNode;
}

/**
 * Wraps authenticated app pages with a sidebar (desktop) and compact
 * horizontal nav (mobile). Drop this inside any (hub) page that needs
 * a consistent in-app layout.
 */
export function AppShell({ user, children }: AppShellProps) {
  return (
    <>
      <AppMobileNav user={user} />
      <div className="flex gap-8 items-start">
        <AppSidebar user={user} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </>
  );
}
