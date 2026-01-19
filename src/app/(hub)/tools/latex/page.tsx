import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllLatexTools } from "@/lib/latex/tools-config";
import Link from "next/link";
import { FileText, FileCode, ArrowRight } from "lucide-react";

const iconMap = {
  FileText: FileText,
  FileCode: FileCode,
} as const;

export default function LaTeXToolsPage() {
  const tools = getAllLatexTools();

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {tools.map((tool) => {
          const Icon = iconMap[tool.icon as keyof typeof iconMap] || FileText;

          return (
            <Link key={tool.slug} href={`/tools/latex/${tool.slug}`}>
              <Card className="h-full transition-all hover:border-primary hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{tool.name}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground/90">
                      Supported Journals
                    </h4>
                    <ul className="text-sm text-foreground/70 space-y-1">
                      {tool.supportedJournals
                        .slice(0, 3)
                        .map((journal, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{journal}</span>
                          </li>
                        ))}
                      {tool.supportedJournals.length > 3 && (
                        <li className="text-foreground/50 italic">
                          +{tool.supportedJournals.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground/90">
                      Key Features
                    </h4>
                    <ul className="text-sm text-foreground/70 space-y-1">
                      {tool.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 flex items-center text-sm font-medium text-primary hover:text-primary/80">
                    Start Converting
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm text-foreground/80">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              <span>
                <strong>Upload your LaTeX document</strong> - ZIP files
                containing all project files are supported
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              <span>
                <strong>Automatic journal detection</strong> - System analyzes
                document class and commands to identify journal type
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              <span>
                <strong>Manual override (optional)</strong> - Select specific
                journal template if auto-detection needs adjustment
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              <span>
                <strong>Choose quality level</strong> - Select from Basic,
                Standard, Professional, or Publication quality
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">5.</span>
              <span>
                <strong>Download converted document</strong> - Get your Word
                document with preserved formatting and bibliography
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
