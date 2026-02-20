"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  LogOut,
  Gavel,
  Shield,
  ChevronDown,
  Settings,
  LogIn,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleMeta } from "@/lib/roles";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function UserMenu() {
  const [user, setUser] = useState<UserData | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setUser(data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const roleInfo = user ? getRoleMeta(user.role) : null;
  const isAdmin = user && ["SUPER_ADMIN", "ADMIN"].includes(user.role);
  const isJudgeRole =
    user &&
    ["SUPER_ADMIN", "ADMIN", "JUDGE_ADMIN", "HEAD_JUDGE", "JUDGE"].includes(
      user.role,
    );

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
        <Link
          href="/register"
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-md hover:bg-accent/80 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors",
          "hover:bg-accent border border-transparent hover:border-border",
          open && "bg-accent border-border",
        )}
        aria-label="User menu"
      >
        {/* Avatar */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-ekd-gold to-ekd-maroon text-white text-xs font-bold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        {/* Name + role on larger screens */}
        <div className="hidden sm:flex flex-col items-start leading-none">
          <span className="text-sm font-medium text-foreground max-w-30 truncate">
            {user.name}
          </span>
          <span className={cn("text-[10px] font-semibold", roleInfo?.color)}>
            {roleInfo?.label}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ekd-gold to-ekd-maroon text-white font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    roleInfo?.color,
                  )}
                >
                  {roleInfo?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            {isJudgeRole && (
              <Link
                href="/tools/dbt/judge"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Gavel className="h-4 w-4 text-ekd-gold" />
                Judge Dashboard
              </Link>
            )}
            {isJudgeRole && (
              <Link
                href="/tools/dbt"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Gavel className="h-4 w-4 text-ekd-gold/60" />
                Debate Events
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Shield className="h-4 w-4 text-blue-500" />
                Admin Panel
              </Link>
            )}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </Link>
            {user.role === "SUPER_ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4 text-purple-500" />
                System Settings
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className="p-1.5 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
