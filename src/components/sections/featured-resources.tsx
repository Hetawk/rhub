import { ResourceCard } from "@/components/resources/resource-card";
import { getFeaturedTools } from "@/lib/tools-config";

export function FeaturedResourcesSection() {
  const resources = getFeaturedTools();

  return (
    <section id="resources" className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground/60">
            Resource Stack
          </p>
          <h2 className="text-3xl font-semibold text-foreground">
            Featured tools crafted by EKD Digital
          </h2>
          <p className="max-w-2xl text-base text-foreground/70">
            Each module shares a single design system, Prisma-powered storage,
            and API surface so you can compose workflows without leaving the
            hub.
          </p>
        </div>
        <span className="rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-wide text-foreground/60">
          + more utilities landing soon
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {resources.map((resource) => (
          <ResourceCard key={resource.slug} resource={resource} />
        ))}
      </div>
    </section>
  );
}
