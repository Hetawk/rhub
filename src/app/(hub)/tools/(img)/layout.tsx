import { ArrowRight } from "lucide-react";

export default function ImgToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-light-gray dark:bg-charcoal">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Tools</span>
            <ArrowRight className="w-4 h-4" />
            <span>Image Conversion</span>
          </div>
          <h1 className="text-3xl font-bold text-dark-brown dark:text-light-gray">
            Image Converter
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Convert images between formats with custom options
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
