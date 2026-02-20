"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { ToolsDropdown } from "./tools-dropdown";
import { UserMenu } from "./user-menu";
import { Menu, X, Gavel, Download, BookOpen, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Docs", href: "/docs" },
  { label: "API", href: "/api" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "https://ekddigital.com/about", external: true },
];

const mobileLinks = [
  { label: "Debate Hub", href: "/tools/dbt", icon: Gavel },
  { label: "Downloads", href: "/downloads", icon: Download },
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "API", href: "/api", icon: Code2 },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden gap-5 text-sm font-medium text-muted-foreground md:flex">
            <ToolsDropdown />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
                {...("external" in link &&
                  link.external && {
                    target: "_blank",
                    rel: "noopener noreferrer",
                  })}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Theme + Visit Site + User + Mobile Toggle */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="https://ekddigital.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            Visit Main Site
          </Link>
          {/* User menu (handles login/logout/role display) */}
          <UserMenu />
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/98">
          <nav className="mx-auto max-w-7xl px-4 py-4 space-y-1">
            {mobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  "text-foreground hover:bg-accent transition-colors",
                )}
              >
                <link.icon className="h-4 w-4 text-muted-foreground" />
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border pt-3 mt-3">
              <Link
                href="https://ekddigital.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Visit Main Site ↗
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
