"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, FileText, Eye, Lock } from "lucide-react";
import { useState } from "react";

interface DownloadableFile {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  fileType: string | null;
  category: string | null;
  accessLevel: string;
  downloads: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DownloadCardProps {
  file: DownloadableFile;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  const kb = bytes / 1024;
  const mb = kb / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  return `${kb.toFixed(2)} KB`;
}

function getFileIcon() {
  return <FileText className="w-5 h-5" />;
}

export function DownloadCard({ file }: DownloadCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(file.downloads);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [showPwdInput, setShowPwdInput] = useState(false);

  const isProtected = file.accessLevel === "protected";

  const handleDownload = async () => {
    if (isProtected && !pwd && !showPwdInput) {
      setShowPwdInput(true);
      return;
    }

    setIsDownloading(true);
    setPwdErr("");
    try {
      const apiUrl = `/api/downloads/${file.id}${
        pwd ? `?pwd=${encodeURIComponent(pwd)}` : ""
      }`;
      const response = await fetch(apiUrl);

      if (response.status === 401 || response.status === 403) {
        const data = await response.json();
        setPwdErr(data.error || "Access denied");
        setShowPwdInput(true);
        setIsDownloading(false);
        return;
      }

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      setDownloadCount((prev) => prev + 1);
      setPwd("");
      setShowPwdInput(false);
    } catch (error) {
      console.error("Download failed:", error);
      setPwdErr("Failed to download file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon()}
            <CardTitle className="text-lg">{file.title}</CardTitle>
          </div>
          {file.category && (
            <Badge variant="secondary" className="text-xs">
              {file.category}
            </Badge>
          )}
        </div>
        {file.description && (
          <CardDescription className="mt-2">{file.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{file.fileType?.toUpperCase() || "FILE"}</span>
            <span>{formatFileSize(file.fileSize)}</span>
          </div>

          {/* Download Stats */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Eye className="w-3 h-3" />
            <span>{downloadCount} downloads</span>
            {isProtected && (
              <>
                <span className="mx-1">•</span>
                <Lock className="w-3 h-3" />
                <span>Protected</span>
              </>
            )}
          </div>

          {/* Password Input */}
          {isProtected && showPwdInput && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter Password to Download
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDownload()}
                className="h-10"
                autoFocus
              />
              {pwdErr && <p className="text-xs text-red-500">{pwdErr}</p>}
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full bg-gold hover:bg-gold/90 text-white h-11 font-semibold"
          >
            {isProtected && !showPwdInput ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Click to Enter Password
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? "Downloading..." : "Download"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
