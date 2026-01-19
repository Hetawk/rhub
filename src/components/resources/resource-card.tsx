import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolConfig } from "@/lib/tools-config";
import { getCategoryAccent } from "@/lib/utils";
import Link from "next/link";

const statusCopy: Record<string, string> = {
  live: "Live",
  beta: "Beta",
  "coming-soon": "Coming soon",
};

export function ResourceCard({ resource }: { resource: ToolConfig }) {
  const Icon = resource.icon;
  const accent = getCategoryAccent(resource.category);

  return (
    <Card className="flex h-full flex-col justify-between border-white/10 bg-card/80 p-6 shadow-[0_15px_50px_rgba(12,10,8,0.25)]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: accent }}
          >
            <Icon className="size-6" />
          </div>
          <Badge variant="secondary" className="uppercase tracking-wide">
            {statusCopy[resource.status]}
          </Badge>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            {resource.title}
          </h3>
          <p className="text-sm text-foreground/70">{resource.tagline}</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">
          {resource.summary}
        </p>
      </div>
      <div className="mt-6">
        <Button asChild variant="default">
          <Link href={resource.path}>
            {resource.status === "live" ? "Launch Tool" : "Learn More"}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
