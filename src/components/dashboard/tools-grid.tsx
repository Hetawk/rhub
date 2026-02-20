import Link from "next/link";
import { cn } from "@/lib/utils";
import { DASHBOARD_TOOLS } from "@/lib/dashboard/dashboard-config";

/**
 * Responsive grid of all available tools and resources.
 * Tool definitions live in lib/dashboard/dashboard-config.ts for easy extension.
 */
export function ToolsGrid() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">
          Tools &amp; Resources
        </h2>
        <span className="text-xs text-muted-foreground">
          {DASHBOARD_TOOLS.length} available
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DASHBOARD_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card hover:border-ekd-gold/40 hover:shadow-sm px-4 py-3.5 transition-all"
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg shrink-0 mt-0.5",
                tool.bg,
              )}
            >
              <tool.icon className={cn("h-4 w-4", tool.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-ekd-gold transition-colors">
                {tool.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
