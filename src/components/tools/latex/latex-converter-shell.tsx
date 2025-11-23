"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Loader2,
  Upload,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface ConversionResult {
  success: boolean;
  outputFile?: string;
  outputSize?: number;
  detectedJournal?: string;
  documentClass?: string;
  bibEntryCount?: number;
  figureCount?: number;
  tableCount?: number;
  warningCount?: number;
  errorMessage?: string;
  warnings?: string[];
  durationMs: number;
}

interface LaTeXConverterShellProps {
  toolSlug: string;
}

export function LaTeXConverterShell({ toolSlug }: LaTeXConverterShellProps) {
  const [file, setFile] = useState<File | null>(null);
  const [manualJournal, setManualJournal] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("toolSlug", toolSlug);
    if (manualJournal) {
      formData.append("manualJournal", manualJournal);
    }

    try {
      const response = await fetch("/api/tools/latex/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Conversion failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.outputFile) return;

    try {
      const response = await fetch(result.outputFile);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ekddigital_rhub_${file?.name.replace(
        /\.(tex|zip)$/i,
        ""
      )}.docx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download converted file");
    }
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
            disabled={isConverting}
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

      {/* Conversion Info */}
      <Card className="p-6 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Publication-Ready Output</h3>
            <p className="text-sm text-foreground/70">
              Every conversion is optimized for publication with font
              preservation, metadata retention, high-resolution images, and
              complete bibliography processing.
            </p>
          </div>
        </div>
      </Card>

      {/* Manual Journal Override */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="manual-journal" className="text-sm font-medium">
            Manual Journal Override (Optional)
          </Label>
          <p className="text-xs text-foreground/70">
            Leave empty for automatic detection, or specify journal template
          </p>
        </div>

        <Input
          id="manual-journal"
          type="text"
          placeholder="e.g., Elsevier CMIG, IEEE TMI, ACM"
          value={manualJournal}
          onChange={(e) => setManualJournal(e.target.value)}
          disabled={isConverting}
        />
      </Card>

      {/* Convert Button */}
      <Button
        onClick={handleConvert}
        disabled={!file || isConverting}
        className="w-full"
        size="lg"
      >
        {isConverting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Converting...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Convert to Word
          </>
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Conversion Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Result */}
      {result?.success && (
        <Card className="p-6 space-y-4 border-green-500/50 bg-green-500/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Conversion Successful!
                </h3>
                <p className="text-sm text-foreground/70">
                  Your document has been converted to Word format
                </p>
              </div>

              {/* Conversion Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                {result.detectedJournal && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">
                      Journal
                    </div>
                    <div className="font-medium">{result.detectedJournal}</div>
                  </div>
                )}
                {result.documentClass && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">
                      Document Class
                    </div>
                    <div className="font-medium">{result.documentClass}</div>
                  </div>
                )}
                {result.bibEntryCount !== undefined && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">
                      Bibliography
                    </div>
                    <div className="font-medium">
                      {result.bibEntryCount} entries
                    </div>
                  </div>
                )}
                {result.figureCount !== undefined && (
                  <div>
                    <div className="text-xs text-foreground/60 mb-1">
                      Figures
                    </div>
                    <div className="font-medium">{result.figureCount}</div>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
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
