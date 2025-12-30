"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Upload,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  FileUp,
  Server,
  FileCheck,
  Sparkles,
} from "lucide-react";
import type { DocumentTool } from "@/lib/doc/tools-config";

interface ConversionResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  outputSize?: number;
  warningCount?: number;
  warnings?: string[];
  durationMs?: number;
  error?: string;
}

type ConversionStep =
  | "idle"
  | "uploading"
  | "processing"
  | "converting"
  | "downloading"
  | "complete"
  | "error";

const STEP_CONFIG = {
  idle: { label: "Ready", icon: FileText, progress: 0 },
  uploading: { label: "Uploading file...", icon: FileUp, progress: 20 },
  processing: { label: "Preparing conversion...", icon: Server, progress: 40 },
  converting: { label: "Converting document...", icon: Loader2, progress: 70 },
  downloading: { label: "Preparing download...", icon: Download, progress: 90 },
  complete: { label: "Complete!", icon: CheckCircle2, progress: 100 },
  error: { label: "Error", icon: XCircle, progress: 0 },
};

interface DocumentConverterShellProps {
  tool: DocumentTool;
}

export function DocumentConverterShell({ tool }: DocumentConverterShellProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ConversionStep>("idle");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setStep("idle");
      // Clean up previous download URL
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
      }
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setError(null);
    setResult(null);
    setStep("uploading");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("slug", tool.slug);

    try {
      // Simulate upload progress
      await new Promise((r) => setTimeout(r, 500));
      setStep("processing");

      await new Promise((r) => setTimeout(r, 300));
      setStep("converting");

      const startTime = Date.now();
      const response = await fetch("/api/tools/doc/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Conversion failed");
      }

      setStep("downloading");
      await new Promise((r) => setTimeout(r, 300));

      const blob = await response.blob();
      const durationMs = Date.now() - startTime;
      const processingTime = parseInt(
        response.headers.get("X-Processing-Time") || "0"
      );
      const outputSize = parseInt(
        response.headers.get("X-Output-Size") || String(blob.size)
      );
      const warningCount = parseInt(response.headers.get("X-Warnings") || "0");

      // Get filename from Content-Disposition header
      const disposition = response.headers.get("Content-Disposition");
      let filename = `converted.${tool.outputFormat[0]}`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Create download URL
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      setResult({
        success: true,
        blob,
        filename,
        outputSize,
        warningCount,
        durationMs: processingTime || durationMs,
      });
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStep("error");
    }
  };

  const handleDownload = useCallback(() => {
    if (!downloadUrl || !result?.filename) return;

    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = result.filename;
    anchor.click();
  }, [downloadUrl, result]);

  const isProcessing = [
    "uploading",
    "processing",
    "converting",
    "downloading",
  ].includes(step);
  const currentStepConfig = STEP_CONFIG[step];
  const StepIcon = currentStepConfig.icon;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get accepted file extensions
  const acceptedExtensions = tool.inputFormat.map((f) => `.${f}`).join(",");

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6 space-y-4 border-2 border-gold/20 dark:border-gold/30">
        <div className="space-y-2">
          <Label htmlFor="file-upload" className="text-sm font-medium">
            Upload {tool.inputFormat.map((f) => f.toUpperCase()).join(" / ")}{" "}
            Document
          </Label>
          <p className="text-xs text-foreground/70">
            Select a file to convert to {tool.outputFormat[0].toUpperCase()}{" "}
            format
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Input
            id="file-upload"
            type="file"
            accept={acceptedExtensions}
            onChange={handleFileChange}
            disabled={isProcessing}
            className="flex-1"
          />
          {file && (
            <Badge
              variant="secondary"
              className="flex items-center gap-2 py-2 px-3"
            >
              <FileText className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({formatSize(file.size)})
              </span>
            </Badge>
          )}
        </div>
      </Card>

      {/* Progress Bar - Show during processing */}
      {isProcessing && (
        <Card className="p-6 space-y-4 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <StepIcon className="h-5 w-5 text-primary animate-pulse" />
            <span className="font-medium">{currentStepConfig.label}</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${currentStepConfig.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-foreground/60">
              <span>Processing document...</span>
              <span>{currentStepConfig.progress}%</span>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between text-xs">
            {(
              [
                "uploading",
                "processing",
                "converting",
                "downloading",
              ] as ConversionStep[]
            ).map((s, idx) => {
              const isActive = s === step;
              const isPast =
                STEP_CONFIG[s].progress < currentStepConfig.progress;
              return (
                <div
                  key={s}
                  className={`flex items-center gap-1 ${
                    isActive
                      ? "text-primary font-medium"
                      : isPast
                      ? "text-green-500"
                      : "text-foreground/40"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isActive
                        ? "bg-primary animate-pulse"
                        : isPast
                        ? "bg-green-500"
                        : "bg-foreground/20"
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {STEP_CONFIG[s].label.split("...")[0]}
                  </span>
                  {idx < 3 && (
                    <span className="text-foreground/20 mx-2">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Conversion Info - Show when idle */}
      {step === "idle" && (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">Key Features</h3>
              <ul className="text-sm text-foreground/70 space-y-1">
                {tool.features.slice(0, 4).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Convert Button */}
      <Button
        onClick={handleConvert}
        disabled={!file || isProcessing}
        className="w-full h-12 bg-gold hover:bg-gold/90 dark:bg-gold dark:hover:bg-gold/80 text-dark-brown dark:text-charcoal font-bold text-base shadow-md hover:shadow-lg"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {currentStepConfig.label}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Convert to {tool.outputFormat[0].toUpperCase()}
          </>
        )}
      </Button>

      {/* Error Display */}
      {error && step === "error" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Conversion Failed</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <div className="mt-3 text-xs opacity-70">
              Tip: Make sure your document is not corrupted and is in a
              supported format. LibreOffice must be installed on the server for
              document conversion.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Result */}
      {result?.success && step === "complete" && (
        <Card className="p-6 space-y-4 border-green-500/50 bg-green-500/5">
          <div className="flex items-start gap-3">
            <FileCheck className="h-6 w-6 text-green-500 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Conversion Successful!
                </h3>
                <p className="text-sm text-foreground/70">
                  Your document has been converted to{" "}
                  {tool.outputFormat[0].toUpperCase()} format
                  {result.durationMs &&
                    ` in ${formatDuration(result.durationMs)}`}
                </p>
              </div>

              {/* Conversion Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 border-y border-border/50">
                <div>
                  <div className="text-xs text-foreground/60 mb-1">Input</div>
                  <div className="font-medium text-sm truncate">
                    {file?.name}
                  </div>
                </div>
                {result.outputSize && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">
                      Output Size
                    </div>
                    <div className="font-medium text-sm">
                      {formatSize(result.outputSize)}
                    </div>
                  </div>
                )}
                {result.durationMs && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">
                      Processing Time
                    </div>
                    <div className="font-medium text-sm">
                      {formatDuration(result.durationMs)}
                    </div>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-600">
                    Warnings ({result.warningCount || result.warnings.length})
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                      {result.warnings.slice(0, 5).map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                      {result.warnings.length > 5 && (
                        <li className="text-foreground/50">
                          +{result.warnings.length - 5} more warnings
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Download {result.filename}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
