import { notFound } from "next/navigation";
import { getLatexTool } from "@/lib/latex/tools-config";
import { LaTeXConverterShell } from "@/components/tools/latex/latex-converter-shell";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LaTeXToolPage({ params }: PageProps) {
  const resolvedParams = await params;
  const tool = getLatexTool(resolvedParams.slug);

  if (!tool) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{tool.name}</h2>
        <p className="text-sm text-foreground/70">{tool.description}</p>
      </div>

      <LaTeXConverterShell toolSlug={tool.slug} />
    </div>
  );
}
