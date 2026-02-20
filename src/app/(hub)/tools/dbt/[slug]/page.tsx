import { DebateShell } from "@/components/tools/dbt/debate-shell";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DebateEventPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div className="py-8 px-4">
      <DebateShell eventSlug={slug} />
    </div>
  );
}
