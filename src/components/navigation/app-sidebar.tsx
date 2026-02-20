"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  BookOpen,
  Gavel,
  Trophy,
  Shield,
  Users,
  Settings,
  Crown,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleMeta } from "@/lib/roles";

interface SidebarUser {
  id: string;
  name: string;
  role: string;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

function buildNav(role: string): NavSection[] {
  const isJudgeRole = [
    "SUPER_ADMIN",
    "ADMIN",
    "JUDGE_ADMIN",
    "HEAD_JUDGE",
    "JUDGE",
  ].includes(role);
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(role);
  const isSuperAdmin = role === "SUPER_ADMIN";

  const sections: NavSection[] = [
    {
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
        { icon: User, label: "Profile", href: "/profile" },
        { icon: BookOpen, label: "Documentation", href: "/docs" },
      ],
    },
  ];

  if (isJudgeRole) {
    sections.push({
      heading: "Debate Hub",
      items: [
        { icon: Gavel, label: "Judge Dashboard", href: "/tools/dbt/judge" },
        { icon: Trophy, label: "Debate Events", href: "/tools/dbt" },
      ],
    });
  }

  if (isAdmin) {
    const adminItems: NavItem[] = [
      {
        icon: isSuperAdmin ? Crown : Shield,
        label: "Admin Panel",
        href: "/admin",
      },
      { icon: Users, label: "User Management", href: "/admin/users" },
    ];
    if (isSuperAdmin) {
      adminItems.push({
        icon: Settings,
        label: "System Settings",
        href: "/admin/settings",
      });
    }
    sections.push({ heading: "Administration", items: adminItems });
  }

  return sections;
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const sections = buildNav(user.role);
  const roleMeta = getRoleMeta(user.role);

  return (
    <aside className="w-56 shrink-0 hidden md:flex flex-col gap-1 self-start sticky top-24 min-h-[calc(100vh-8rem)] border-r border-border pr-6">
      {/* User identity */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ekd-gold to-ekd-maroon text-white text-xs font-bold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {user.name}
          </p>
          <span
            className={cn(
              "inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-tight",
              roleMeta.badge,
            )}
          >
            {roleMeta.label}
          </span>
        </div>
      </div>

      {/* Nav sections */}
      {sections.map((section, si) => (
        <div key={si} className="space-y-0.5">
          {section.heading && (
            <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {section.heading}
            </p>
          )}
          {section.items.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-ekd-gold/15 text-ekd-dark-brown dark:text-ekd-gold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-ekd-gold" : "",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Tools quick links */}
      <div className="mt-4 space-y-0.5">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          Tools
        </p>
        {[
          { label: "LaTeX to Word", href: "/tools/latex" },
          { label: "URL Shortener", href: "/tools/s" },
          { label: "Reference Tools", href: "/tools/ref" },
          { label: "Image Tools", href: "/tools/img" },
          { label: "Downloads", href: "/downloads" },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(t.href)
                ? "bg-ekd-gold/15 text-ekd-dark-brown dark:text-ekd-gold"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <Wrench className="h-3.5 w-3.5 shrink-0" />
            {t.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

/** Compact horizontal tab nav for mobile (< md) */
export function AppMobileNav({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const sections = buildNav(user.role);
  const allItems = sections.flatMap((s) => s.items);

  return (
    <div className="md:hidden overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-hide">
      <div className="flex gap-1.5 w-max">
        {allItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                active
                  ? "bg-ekd-gold text-ekd-dark-brown"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
