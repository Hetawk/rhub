import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { conversionRoutes } from "@/lib/img/conversions-config";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Image Converters | EKD Digital Resource Hub",
  description:
    "Convert images between all popular formats including SVG, PNG, JPG, WebP, ICO, GIF, BMP, and TIFF.",
};

export default function ImgConverterPage() {
  // Group conversions by source format
  const groupedConversions = conversionRoutes.reduce((acc, conv) => {
    if (!acc[conv.from.id]) {
      acc[conv.from.id] = [];
    }
    acc[conv.from.id].push(conv);
    return acc;
  }, {} as Record<string, typeof conversionRoutes>);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Image Format Converters
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Professional-grade image conversion supporting all popular formats
        </p>
      </div>

      {Object.entries(groupedConversions).map(([fromFormat, conversions]) => (
        <div key={fromFormat} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-gold">{conversions[0].from.name}</span>
            <ArrowRight className="w-5 h-5" />
            <span className="text-gray-500 dark:text-gray-400">Convert To</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversions.map((conv) => (
              <Link key={conv.slug} href={`/tools/(img)/${conv.slug}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-gold/20 hover:border-gold/40">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {conv.to.name}
                      </h3>
                      {conv.featured && (
                        <Badge className="bg-gold text-dark-brown">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {conv.description}
                    </p>
                    <div className="flex items-center text-gold text-sm font-medium">
                      Convert Now
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Info Section */}
      <Card className="p-6 bg-gold/5 border-gold/20">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          About Image Conversion
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Our image converters support all major image formats with
            high-quality output and advanced customization options.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Vector formats: SVG</li>
            <li>Raster formats: PNG, JPG, WebP, ICO, GIF, BMP, TIFF</li>
            <li>Custom dimensions and quality settings</li>
            <li>Batch processing support</li>
            <li>Privacy-first: All conversions happen on our server</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
