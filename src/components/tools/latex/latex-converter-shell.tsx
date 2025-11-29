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
} from "lucide-react";

interface ConversionResult {
  success: boolean;
  file?: string; // base64 encoded file
  filename?: string;
  outputSize?: number;
  detectedJournal?: string;
  documentClass?: string;
  bibEntryCount?: number;
  figureCount?: number;
  tableCount?: number;
  warningCount?: number;
  errorMessage?: string;
  error?: string;
  warnings?: string[];
  durationMs?: number;
}

type ConversionStep = 
  | 'idle' 
  | 'uploading' 
  | 'processing' 
  | 'converting' 
  | 'downloading' 
  | 'complete' 
  | 'error';

const STEP_CONFIG = {
  idle: { label: 'Ready', icon: FileText, progress: 0 },
  uploading: { label: 'Uploading file...', icon: FileUp, progress: 20 },
  processing: { label: 'Setting up remote server...', icon: Server, progress: 40 },
  converting: { label: 'Converting LaTeX to Word...', icon: Loader2, progress: 70 },
  downloading: { label: 'Preparing download...', icon: Download, progress: 90 },
  complete: { label: 'Complete!', icon: CheckCircle2, progress: 100 },
  error: { label: 'Error', icon: XCircle, progress: 0 },
};

interface LaTeXConverterShellProps {
  toolSlug: string;
}

export function LaTeXConverterShell({ toolSlug }: LaTeXConverterShellProps) {
  const [file, setFile] = useState<File | null>(null);
  const [manualJournal, setManualJournal] = useState<string>("");
  const [step, setStep] = useState<ConversionStep>('idle');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setStep('idle');
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setError(null);
    setResult(null);
    setStep('uploading');

    const formData = new FormData();
    formData.append("file", file);
    formData.append("toolSlug", toolSlug);
    if (manualJournal) {
      formData.append("manualJournal", manualJournal);
    }

    try {
      // Simulate upload progress
      await new Promise(r => setTimeout(r, 500));
      setStep('processing');
      
      await new Promise(r => setTimeout(r, 300));
      setStep('converting');

      const response = await fetch("/api/tools/latex/convert", {
        method: "POST",
        body: formData,
      });

      const data: ConversionResult = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.errorMessage || "Conversion failed");
      }

      setStep('downloading');
      await new Promise(r => setTimeout(r, 300));

      setResult(data);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStep('error');
    }
  };

  const handleDownload = useCallback(() => {
    if (!result?.file) return;

    try {
      // Decode base64 to binary
      const binaryString = atob(result.file);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob and download
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename || `ekd_${file?.name.replace(/\.(tex|zip)$/i, "")}.docx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download converted file");
    }
  }, [result, file]);

  const isProcessing = ['uploading', 'processing', 'converting', 'downloading'].includes(step);
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

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload" className="text-sm font-medium">
            Upload LaTeX Document
          </Label>
          <p className="text-xs text-foreground/70">
            Upload a .tex file or .zip containing your LaTeX project
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Input
            id="file-upload"
            type="file"
            accept=".tex,.latex,.zip"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="flex-1"
          />
          {file && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              {file.name}
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
              <span>Processing on remote server...</span>
              <span>{currentStepConfig.progress}%</span>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between text-xs">
            {(['uploading', 'processing', 'converting', 'downloading'] as ConversionStep[]).map((s, idx) => {
              const isActive = s === step;
              const isPast = STEP_CONFIG[s].progress < currentStepConfig.progress;
              return (
                <div 
                  key={s} 
                  className={`flex items-center gap-1 ${
                    isActive ? 'text-primary font-medium' : 
                    isPast ? 'text-green-500' : 'text-foreground/40'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-primary animate-pulse' : 
                    isPast ? 'bg-green-500' : 'bg-foreground/20'
                  }`} />
                  <span className="hidden sm:inline">{STEP_CONFIG[s].label.split('...')[0]}</span>
                  {idx < 3 && <span className="text-foreground/20 mx-2">→</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Conversion Info - Show when idle */}
      {step === 'idle' && (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">Publication-Ready Output</h3>
              <p className="text-sm text-foreground/70">
                Optimized for publication: font preservation, metadata retention,
                high-resolution images, and complete bibliography processing.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Manual Journal Override */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="manual-journal" className="text-sm font-medium">
            Journal Template (Optional)
          </Label>
          <p className="text-xs text-foreground/70">
            Leave empty for auto-detection, or specify: elsevier, ieee, springer, acm
          </p>
        </div>

        <Input
          id="manual-journal"
          type="text"
          placeholder="e.g., elsevier, ieee, springer, acm"
          value={manualJournal}
          onChange={(e) => setManualJournal(e.target.value)}
          disabled={isProcessing}
        />
      </Card>

      {/* Convert Button */}
      <Button
        onClick={handleConvert}
        disabled={!file || isProcessing}
        className="w-full"
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
            Convert to Word
          </>
        )}
      </Button>

      {/* Error Display */}
      {error && step === 'error' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Conversion Failed</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <div className="mt-3 text-xs opacity-70">
              Tip: Make sure your LaTeX file compiles correctly and all assets are included in the ZIP.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Result */}
      {result?.success && step === 'complete' && (
        <Card className="p-6 space-y-4 border-green-500/50 bg-green-500/5">
          <div className="flex items-start gap-3">
            <FileCheck className="h-6 w-6 text-green-500 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Conversion Successful!
                </h3>
                <p className="text-sm text-foreground/70">
                  Your document has been converted to Word format
                  {result.durationMs && ` in ${formatDuration(result.durationMs)}`}
                </p>
              </div>

              {/* Conversion Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-border/50">
                {result.detectedJournal && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">Journal</div>
                    <div className="font-medium text-sm">{result.detectedJournal}</div>
                  </div>
                )}
                {result.outputSize && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">File Size</div>
                    <div className="font-medium text-sm">{formatSize(result.outputSize)}</div>
                  </div>
                )}
                {result.bibEntryCount !== undefined && result.bibEntryCount > 0 && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">Bibliography</div>
                    <div className="font-medium text-sm">{result.bibEntryCount} entries</div>
                  </div>
                )}
                {result.figureCount !== undefined && result.figureCount > 0 && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">Figures</div>
                    <div className="font-medium text-sm">{result.figureCount}</div>
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
              <Button onClick={handleDownload} className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Download Word Document
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
