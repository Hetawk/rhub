"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  Video,
  Music,
  CheckCircle,
  ExternalLink,
  Eye,
  Clock,
  User,
} from "lucide-react";
import type { Platform, DownloadFormat } from "@/lib/vid/platforms-config";
import { detectPlatform } from "@/lib/vid/platforms-config";

// Utility function
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

interface VideoInfo {
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  description: string;
  views: number;
  uploadDate: string;
  availableQualities: string[];
}

export function VideoDownloader() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat | null>(
    null
  );
  const [selectedQuality, setSelectedQuality] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError("");
    setSuccess(false);
    setVideoInfo(null);
    setPlatform(null);
    setSelectedFormat(null);
    setSelectedQuality("");

    if (value.trim()) {
      const detected = detectPlatform(value);
      setPlatform(detected);
    }
  };

  const handleGetInfo = async () => {
    if (!url.trim()) {
      setError("Please enter a video URL");
      return;
    }

    if (!platform) {
      setError("Unsupported platform or invalid URL");
      return;
    }

    setLoading(true);
    setError("");
    setVideoInfo(null);

    try {
      const response = await fetch(
        `/api/tools/vid/download?url=${encodeURIComponent(url)}&platform=${
          platform.id
        }`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch video info");
      }

      const info = await response.json();
      setVideoInfo(info);

      // Auto-select first format and quality
      if (platform.supportedFormats.length > 0) {
        setSelectedFormat(platform.supportedFormats[0]);
        const defaultQuality =
          platform.supportedFormats[0].type === "video"
            ? platform.videoQualities[0]?.id
            : platform.audioQualities[0]?.id;
        setSelectedQuality(defaultQuality || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get video info");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url || !selectedFormat || !selectedQuality) {
      setError("Please select format and quality");
      return;
    }

    setDownloading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/tools/vid/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formatId: selectedFormat.id,
          qualityId: selectedQuality,
          action: "download",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Download failed");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const fileName =
        response.headers.get("Content-Disposition")?.split("filename=")[1] ||
        `video${selectedFormat.ext}`;

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName.replace(/"/g, "");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Video Downloader
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Download videos from YouTube with multiple quality options
        </p>
      </div>

      {/* Supported Platforms */}
      <Card className="p-4 bg-gold/5 border-gold/20">
        <div className="flex flex-wrap gap-3 items-center justify-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Available:
          </span>
          <Badge
            variant="secondary"
            className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
          >
            ✓ YouTube
          </Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Coming Soon:
          </span>
          {["Instagram", "TikTok", "Twitter/X", "Vimeo"].map((name) => (
            <Badge
              key={name}
              variant="secondary"
              className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700"
            >
              {name}
            </Badge>
          ))}
        </div>
      </Card>

      {/* URL Input */}
      <Card className="p-6 space-y-4 border-2 border-gold/20">
        <div className="flex items-center gap-3 mb-4">
          <Video className="w-6 h-6 text-gold" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Enter Video URL
          </h2>
        </div>

        <div className="flex gap-3">
          <Input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleGetInfo}
            disabled={loading || !url.trim()}
            className="bg-gold hover:bg-gold/90 text-dark-brown font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Get Info"
            )}
          </Button>
        </div>

        {platform && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-2xl">{platform.icon}</span>
            <span>
              Detected: <strong>{platform.displayName}</strong>
            </span>
          </div>
        )}
      </Card>

      {/* Video Info */}
      {videoInfo && (
        <Card className="p-6 space-y-4 border-2 border-green-500/30 bg-green-500/5">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="w-40 h-24 object-cover rounded-lg border-2 border-gold/20"
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                {videoInfo.title}
              </h3>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{videoInfo.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(videoInfo.duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{videoInfo.views.toLocaleString()} views</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-gold hover:text-gold/80"
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Original
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Format and Quality Selection */}
      {videoInfo && platform && (
        <Card className="p-6 space-y-4 border-2 border-gold/20">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Download Options
          </h3>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {platform.supportedFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => {
                    setSelectedFormat(format);
                    const defaultQuality =
                      format.type === "video"
                        ? platform.videoQualities[0]?.id
                        : platform.audioQualities[0]?.id;
                    setSelectedQuality(defaultQuality || "");
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedFormat?.id === format.id
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-gray-300 dark:border-gray-700 hover:border-gold/50"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {format.type === "video" ? (
                      <Video className="w-6 h-6" />
                    ) : (
                      <Music className="w-6 h-6" />
                    )}
                    <span className="font-semibold">{format.name}</span>
                    <span className="text-xs text-gray-500">{format.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Selection */}
          {selectedFormat && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quality
              </label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-gold focus:ring-2 focus:ring-gold/20"
              >
                {selectedFormat.type === "video"
                  ? platform.videoQualities.map((quality) => (
                      <option key={quality.id} value={quality.id}>
                        {quality.label} - {quality.resolution}
                      </option>
                    ))
                  : platform.audioQualities.map((quality) => (
                      <option key={quality.id} value={quality.id}>
                        {quality.label}
                      </option>
                    ))}
              </select>
            </div>
          )}

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={downloading || !selectedFormat || !selectedQuality}
            className="w-full h-12 bg-gold hover:bg-gold/90 text-dark-brown font-bold text-base"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download {selectedFormat?.name}
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400">
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Download started! Check your downloads folder.
        </Alert>
      )}
    </div>
  );
}
