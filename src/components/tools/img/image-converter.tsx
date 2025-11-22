"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Download, Loader2, FileImage, Sparkles, Settings } from "lucide-react";
import type { ConversionRoute } from "@/lib/img/conversions-config";

interface ImageConverterProps {
  conversion: ConversionRoute;
}

interface ConvResult {
  url: string;
  fileName: string;
  width: number;
  height: number;
  size: number;
  time: number;
}

export function ImageConverter({ conversion }: ImageConverterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [quality, setQuality] = useState("85");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConvResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      setResult(null);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("from", conversion.from.id);
      formData.append("to", conversion.to.id);
      if (width) formData.append("width", width);
      if (height) formData.append("height", height);
      if (quality) formData.append("quality", quality);
      if (bgColor) formData.append("bgColor", bgColor);

      const response = await fetch("/api/tools/img/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Conversion failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = file.name.replace(/\.[^.]+$/, "") + conversion.to.ext;

      const dims = response.headers.get("X-Dimensions") || "0x0";
      const [w, h] = dims.split("x").map(Number);

      setResult({
        url,
        fileName,
        width: w,
        height: h,
        size: parseInt(response.headers.get("X-Output-Size") || "0"),
        time: parseInt(response.headers.get("X-Processing-Time") || "0"),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.fileName;
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          {conversion.title}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {conversion.description}
        </p>
      </div>

      {/* Input Section */}
      <Card className="p-6 space-y-4 border-2 border-gold/20 dark:border-gold/30">
        <div className="flex items-center gap-3 mb-4">
          <FileImage className="w-6 h-6 text-gold" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Upload {conversion.from.name} File
          </h2>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={conversion.from.ext}
          onChange={handleFileChange}
          className="hidden"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full h-24 border-2 border-dashed border-gold/40 hover:border-gold hover:bg-gold/5 dark:hover:bg-gold/10"
        >
          <div className="flex flex-col items-center gap-2">
            <FileImage className="w-8 h-8 text-gold" />
            <span className="text-sm font-medium">
              {file
                ? file.name
                : `Click to select ${conversion.from.name} file`}
            </span>
            {file && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatSize(file.size)}
              </span>
            )}
          </div>
        </Button>

        {/* Advanced Options */}
        {file && (
          <>
            <Button
              onClick={() => setShowAdvanced(!showAdvanced)}
              variant="ghost"
              className="w-full text-gold hover:text-gold/80 hover:bg-gold/5"
              size="sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showAdvanced ? "Hide" : "Show"} Advanced Options
            </Button>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gold/20">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Width (px)
                  </label>
                  <Input
                    type="number"
                    placeholder="Auto"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Height (px)
                  </label>
                  <Input
                    type="number"
                    placeholder="Auto"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quality (%)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Background
                  </label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Convert Button */}
            <Button
              onClick={handleConvert}
              disabled={loading}
              className="w-full h-12 bg-gold hover:bg-gold/90 dark:bg-gold dark:hover:bg-gold/80 text-dark-brown dark:text-charcoal border-2 border-gold/20 dark:border-gold/30 font-bold text-base shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Convert to {conversion.to.name}
                </>
              )}
            </Button>
          </>
        )}
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400">
          {error}
        </Alert>
      )}

      {/* Result Section */}
      {result && (
        <Card className="p-6 space-y-4 border-2 border-green-500/30 bg-green-500/5 dark:bg-green-500/10">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Conversion Complete!
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Dimensions:
              </span>
              <p className="font-semibold text-gray-900 dark:text-white">
                {result.width} × {result.height} px
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Size:</span>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatSize(result.size)}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Processing:
              </span>
              <p className="font-semibold text-gray-900 dark:text-white">
                {result.time}ms
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Format:</span>
              <p className="font-semibold text-gray-900 dark:text-white uppercase">
                {conversion.to.name}
              </p>
            </div>
          </div>

          {conversion.to.id !== "svg" && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt="Converted"
                className="max-w-full max-h-96 mx-auto rounded"
              />
            </div>
          )}

          <Button
            onClick={handleDownload}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            <Download className="w-5 h-5 mr-2" />
            Download {result.fileName}
          </Button>
        </Card>
      )}
    </div>
  );
}
