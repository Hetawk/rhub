import Link from "next/link";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { ToolsDropdown } from "./tools-dropdown";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const navLinks = [
  { label: "Docs", href: "/docs" },
  { label: "API", href: "/api" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "https://ekddigital.com/about", external: true },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
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
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            asChild
            variant="default"
            size="sm"
            className="hidden sm:flex"
          >
            <Link
              href="https://ekddigital.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Main Site
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            aria-label="Menu"
          >
            <Menu size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
}
