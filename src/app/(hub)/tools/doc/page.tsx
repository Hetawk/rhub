import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllDocumentTools,
  getFeaturedDocumentTools,
} from "@/lib/doc/tools-config";
import Link from "next/link";
import {
  FileText,
  FileOutput,
  FileType,
  FileCode,
  FileUp,
  Globe,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document Converters - EKD Digital Resource Hub",
  description:
    "Convert between document formats including PDF to Word, Word to PDF, and more. Professional-quality document conversion with formatting preservation.",
};

const iconMap = {
  FileText: FileText,
  FileOutput: FileOutput,
  FileType: FileType,
  FileCode: FileCode,
  FileUp: FileUp,
  Globe: Globe,
} as const;

export default function DocumentToolsPage() {
  const allTools = getAllDocumentTools();
  const featuredTools = getFeaturedDocumentTools();
  const otherTools = allTools.filter(
    (tool) => !featuredTools.some((f) => f.slug === tool.slug)
  );

  return (
    <div className="space-y-8">
      {/* Featured Tools */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="text-gold">★</span> Popular Conversions
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredTools.map((tool) => {
            const Icon = iconMap[tool.icon as keyof typeof iconMap] || FileText;

            return (
              <Link key={tool.slug} href={`/tools/doc/${tool.slug}`}>
                <Card className="h-full transition-all hover:border-gold hover:shadow-lg border-2">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-gold/10">
                        <Icon className="h-6 w-6 text-gold" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {tool.inputFormat
                            .map((f) => f.toUpperCase())
                            .join(", ")}{" "}
                          →{" "}
                          {tool.outputFormat
                            .map((f) => f.toUpperCase())
                            .join(", ")}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-base">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-foreground/90">
                        Features
                      </h4>
                      <ul className="text-sm text-foreground/70 space-y-1">
                        {tool.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-gold mt-1">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                        {tool.features.length > 3 && (
                          <li className="text-foreground/50 italic">
                            +{tool.features.length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="pt-4 flex items-center text-sm font-medium text-gold hover:text-gold/80">
                      Start Converting
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Other Tools */}
      {otherTools.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">More Conversions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherTools.map((tool) => {
              const Icon =
                iconMap[tool.icon as keyof typeof iconMap] || FileText;

              return (
                <Link key={tool.slug} href={`/tools/doc/${tool.slug}`}>
                  <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-base">{tool.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground/70 mb-2">
                        {tool.description}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {tool.inputFormat
                          .map((f) => f.toUpperCase())
                          .join(", ")}{" "}
                        →{" "}
                        {tool.outputFormat
                          .map((f) => f.toUpperCase())
                          .join(", ")}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* How It Works */}
      <Card className="border-gold/20 bg-gold/5">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm text-foreground/80">
            <li className="flex gap-3">
              <span className="font-bold text-gold">1.</span>
              <span>
                <strong>Select your conversion type</strong> - Choose from PDF
                to Word, Word to PDF, and more
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gold">2.</span>
              <span>
                <strong>Upload your document</strong> - Supported formats
                include PDF, DOCX, DOC, ODT, RTF, TXT, and HTML
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gold">3.</span>
              <span>
                <strong>Download converted file</strong> - Get your converted
                document instantly with formatting preserved
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Requirements Note */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-amber-700">
                Server Requirements
              </h4>
              <p className="text-sm text-foreground/70">
                Document conversion is powered by LibreOffice. For best results,
                ensure LibreOffice is installed on the server. PDF to Word
                conversion works best with text-based PDFs; scanned documents
                may have limited text extraction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
