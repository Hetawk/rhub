"use client";

import { Download, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ConversionResultProps {
  isConverting: boolean;
  result: {
    url: string;
    filename: string;
    size?: number;
  } | null;
  type: "image" | "text" | "file";
  previewable?: boolean;
}

export default function ConversionResult({
  isConverting,
  result,
  type,
  previewable = true,
}: ConversionResultProps) {
  if (isConverting) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Converting...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-dark-brown dark:text-light-gray mb-4">
        Conversion Complete
      </h3>

      {type === "image" && previewable && (
        <div className="mb-4 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <Image
            src={result.url}
            alt="Preview"
            width={400}
            height={400}
            className="max-w-full h-auto"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-dark-brown dark:text-light-gray">
            {result.filename}
          </p>
          {result.size && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatSize(result.size)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {previewable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(result.url, "_blank")}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          )}
          <Button size="sm" asChild>
            <a href={result.url} download={result.filename}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
