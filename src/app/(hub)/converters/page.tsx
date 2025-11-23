import { Metadata } from "next";
import Link from "next/link";
import { getConverterTools } from "@/lib/tools-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Converters | EKD Digital Resource Hub",
  description:
    "Professional document conversion tools. Convert references, LaTeX, Word documents, and more with automatic format detection and validation.",
};

export default function ConvertersPage() {
  const converters = getConverterTools();

  return (
    <div className="container max-w-7xl py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          Document Converters
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Professional-grade conversion tools for academic and technical
          documents. Automatic format detection, validation, and
          publication-ready output.
        </p>
      </div>

      {/* Converters Grid */}
      <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {converters.map((tool) => (
          <Link key={tool.slug} href={tool.path}>
            <Card className="group h-full transition-all hover:border-primary hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <tool.icon className="h-6 w-6 text-primary" />
                  </div>
                  {tool.status === "beta" && (
                    <Badge variant="secondary">Beta</Badge>
                  )}
                  {tool.status === "coming-soon" && (
                    <Badge variant="outline">Coming Soon</Badge>
                  )}
                </div>
                <CardTitle className="flex items-center justify-between">
                  {tool.title}
                  <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardDescription>{tool.tagline}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {tool.summary}
                </p>

                {/* Features */}
                {tool.metadata?.features && 
                 Array.isArray(tool.metadata.features) && 
                 tool.metadata.features.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Key Features
                    </p>
                    <ul className="space-y-1">
                      {(tool.metadata.features as string[])
                        .slice(0, 3)
                        .map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Check className="h-3 w-3 text-primary" />
                            <span>{feature}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}

                {/* Supported Formats */}
                {tool.metadata?.supportedFormats && 
                 Array.isArray(tool.metadata.supportedFormats) && 
                 tool.metadata.supportedFormats.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {(tool.metadata.supportedFormats as string[])
                      .slice(0, 4)
                      .map((format) => (
                        <Badge key={format} variant="secondary" className="text-xs">
                          {format}
                        </Badge>
                      ))}
                    {(tool.metadata.supportedFormats as string[]).length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{(tool.metadata.supportedFormats as string[]).length - 4} more
                      </Badge>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* How It Works Section */}
      <div className="rounded-lg border bg-card p-8">
        <h2 className="mb-6 text-2xl font-bold">How Converters Work</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              1
            </div>
            <h3 className="mb-2 font-semibold">Upload Your Document</h3>
            <p className="text-sm text-muted-foreground">
              Upload your source file or ZIP archive. Our system automatically
              detects the format and structure.
            </p>
          </div>
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              2
            </div>
            <h3 className="mb-2 font-semibold">Automatic Processing</h3>
            <p className="text-sm text-muted-foreground">
              Advanced algorithms process your document, preserving formatting,
              figures, references, and metadata.
            </p>
          </div>
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              3
            </div>
            <h3 className="mb-2 font-semibold">Download Result</h3>
            <p className="text-sm text-muted-foreground">
              Get your converted document in publication-ready format. Validated
              and optimized for professional use.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Why Use Our Converters?
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Accurate Conversion</h3>
            <p className="text-sm text-muted-foreground">
              Preserve formatting, structure, and content integrity
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Auto-Detection</h3>
            <p className="text-sm text-muted-foreground">
              Automatically detect document types and formats
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Publication Ready</h3>
            <p className="text-sm text-muted-foreground">
              Output optimized for academic and professional submissions
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Secure & Private</h3>
            <p className="text-sm text-muted-foreground">
              Files processed securely and deleted after conversion
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
