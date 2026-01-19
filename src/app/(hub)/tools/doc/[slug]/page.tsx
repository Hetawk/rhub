import { notFound } from "next/navigation";
import { getDocumentTool, getAllDocumentTools } from "@/lib/doc/tools-config";
import { DocumentConverterShell } from "@/components/tools/doc/document-converter-shell";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Generate static paths for all document tools at build time
  return getAllDocumentTools().map((tool) => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getDocumentTool(slug);

  if (!tool) {
    return {
      title: "Tool Not Found",
    };
  }

  return {
    title: `${tool.name} - EKD Digital Resource Hub`,
    description: tool.description,
  };
}

export default async function DocumentToolPage({ params }: PageProps) {
  const resolvedParams = await params;
  const tool = getDocumentTool(resolvedParams.slug);

  if (!tool) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{tool.name}</h2>
        <p className="text-sm text-foreground/70">{tool.description}</p>
      </div>

      <DocumentConverterShell tool={tool} />
    </div>
  );
}
