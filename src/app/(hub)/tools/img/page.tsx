import { conversionRoutes } from "@/lib/img/conversions-config";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Converters - EKD Digital Resource Hub",
  description:
    "Convert between 8+ image formats including SVG, PNG, JPG, WebP, ICO, GIF, BMP, and TIFF. Professional image conversion with 25+ bidirectional conversion routes.",
};

export default function ImageConvertersPage() {
  // Group conversions by source format
  const groupedConversions = conversionRoutes.reduce((acc, conv) => {
    const fromFormat = conv.from.id.toUpperCase();
    if (!acc[fromFormat]) {
      acc[fromFormat] = [];
    }
    acc[fromFormat].push(conv);
    return acc;
  }, {} as Record<string, typeof conversionRoutes>);

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Image Format Converters</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Professional image conversion supporting 8+ formats with 25+
          bidirectional conversion routes. Fast, secure, and client-side
          processing.
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedConversions).map(([fromFormat, conversions]) => (
          <div key={fromFormat}>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              Convert from{" "}
              <Badge variant="outline" className="text-base">
                {fromFormat}
              </Badge>
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {conversions.map((conv) => (
                <Link
                  key={conv.slug}
                  href={`/tools/img/${conv.slug}`}
                  className="group"
                >
                  <Card className="h-full transition-all hover:shadow-lg hover:border-gold/50 border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span>{conv.title}</span>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-gold transition-all group-hover:translate-x-1" />
                      </CardTitle>
                      <CardDescription>{conv.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{conv.from.name}</Badge>
                        <ArrowRight className="h-4 w-4" />
                        <Badge variant="secondary">{conv.to.name}</Badge>
                      </div>
                      {conv.featured && (
                        <Badge variant="default" className="mt-2">
                          Featured
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
