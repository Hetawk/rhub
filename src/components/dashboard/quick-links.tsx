import Link from "next/link";
import { QUICK_LINKS } from "@/lib/dashboard/dashboard-config";

/**
 * Horizontal footer quick-links row.
 * Link definitions live in lib/dashboard/dashboard-config.ts.
 */
export function QuickLinks() {
  return (
    <div className="border-t border-border pt-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
        Quick Links
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        {QUICK_LINKS.map((link, i) => (
          <span key={link.href} className="flex items-center gap-4">
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {link.label} ↗
              </a>
            ) : (
              <Link
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            )}
            {i < QUICK_LINKS.length - 1 && (
              <span className="text-border select-none">·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
