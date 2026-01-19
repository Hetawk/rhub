"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  Copy,
  Link,
  Loader2,
  CheckCircle2,
  ExternalLink,
  BarChart3,
  QrCode,
  Download,
} from "lucide-react";
import QRCodeLib from "qrcode";

interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortUrl: string;
  shortCode: string;
  customSlug: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface UrlStats {
  clicks: number;
  lastClickAt: string | null;
  createdAt: string;
}

export function UrlShortenerShell() {
  const [url, setUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [expiresIn, setExpiresIn] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShortenedUrl | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<UrlStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  // Generate QR code when result is available
  useEffect(() => {
    if (result?.shortUrl) {
      generateQRCode(result.shortUrl);
    }
  }, [result]);

  const generateQRCode = async (url: string) => {
    try {
      // Generate QR code with EKD Digital branding colors
      const qrDataUrl = await QRCodeLib.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: "#1F1C18", // EKD Dark Brown
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H", // High error correction to allow logo overlay
      });
      setQrCode(qrDataUrl);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  };

  const handleShorten = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setStats(null);

    try {
      const response = await fetch("/api/tools/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          customSlug: customSlug.trim() || undefined,
          expiresIn: expiresIn || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to shorten URL");
        return;
      }

      setResult(data.data);
      setUrl("");
      setCustomSlug("");
      setExpiresIn("");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const fetchStats = async () => {
    if (!result) return;

    setLoadingStats(true);
    try {
      const code = result.customSlug || result.shortCode;
      const response = await fetch(`/api/tools/shorten?code=${code}`);
      const data = await response.json();

      if (response.ok) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement("a");
    link.download = `qr-${
      result?.customSlug || result?.shortCode || "code"
    }.png`;
    link.href = qrCode;
    link.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Input Section */}
      <Card className="p-6 border-ekd-charcoal/10 dark:border-ekd-light-gray/10">
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-2">
              Long URL <span className="text-ekd-maroon">*</span>
            </label>
            <Textarea
              id="url"
              placeholder="https://example.com/very/long/url/that/needs/shortening..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="customSlug"
                className="block text-sm font-medium mb-2"
              >
                Custom Slug (Optional)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ekd-charcoal/60 dark:text-ekd-light-gray/60 whitespace-nowrap">
                  rhub.ekddigital.com/s/
                </span>
                <Input
                  id="customSlug"
                  placeholder="my-link"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-ekd-charcoal/50 dark:text-ekd-light-gray/50 mt-1">
                Letters, numbers, hyphens, and underscores only
              </p>
            </div>

            <div>
              <label
                htmlFor="expiresIn"
                className="block text-sm font-medium mb-2"
              >
                Expires In (Days)
              </label>
              <Input
                id="expiresIn"
                type="number"
                placeholder="Never expires"
                value={expiresIn}
                onChange={(e) =>
                  setExpiresIn(e.target.value ? Number(e.target.value) : "")
                }
                min="1"
              />
              <p className="text-xs text-ekd-charcoal/50 dark:text-ekd-light-gray/50 mt-1">
                Leave empty for permanent links
              </p>
            </div>
          </div>

          <Button
            onClick={handleShorten}
            disabled={loading || !url.trim()}
            className="w-full bg-ekd-gold hover:bg-ekd-gold/90 text-ekd-charcoal"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Shortening...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Shorten URL
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      )}

      {/* Result Section */}
      {result && (
        <Card className="p-6 border-ekd-gold/20 bg-ekd-gold/5 dark:bg-ekd-gold/10">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0" />
                  <h3 className="font-semibold text-ekd-charcoal dark:text-ekd-light-gray">
                    URL Shortened Successfully!
                  </h3>
                </div>

                <div className="bg-white dark:bg-ekd-charcoal/50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-ekd-charcoal/60 dark:text-ekd-light-gray/60 mb-1">
                      Short URL
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={result.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ekd-gold hover:text-ekd-light-gold font-medium break-all"
                      >
                        {result.shortUrl}
                      </a>
                      <ExternalLink className="h-4 w-4 text-ekd-gold/60 flex-shrink-0" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-ekd-charcoal/60 dark:text-ekd-light-gray/60 mb-1">
                      Original URL
                    </p>
                    <p className="text-sm text-ekd-charcoal/80 dark:text-ekd-light-gray/80 break-all">
                      {result.originalUrl}
                    </p>
                  </div>

                  {result.expiresAt && (
                    <div>
                      <p className="text-xs text-ekd-charcoal/60 dark:text-ekd-light-gray/60 mb-1">
                        Expires
                      </p>
                      <p className="text-sm text-ekd-charcoal/80 dark:text-ekd-light-gray/80">
                        {new Date(result.expiresAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowQrCode(!showQrCode)}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <QrCode className="mr-2 h-4 w-4" />
                {showQrCode ? "Hide QR Code" : "Show QR Code"}
              </Button>

              <Button
                onClick={fetchStats}
                disabled={loadingStats}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {loadingStats ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Stats
                  </>
                )}
              </Button>
            </div>

            {/* QR Code Display */}
            {showQrCode && qrCode && (
              <div className="bg-white dark:bg-ekd-charcoal/50 rounded-lg p-6 mt-4">
                <h4 className="font-medium mb-4 text-ekd-charcoal dark:text-ekd-light-gray text-center">
                  QR Code
                </h4>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative bg-white p-4 rounded-lg shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                    {/* Logo overlay in center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-lg shadow-md">
                      <div className="w-12 h-12 bg-ekd-gold rounded-full flex items-center justify-center">
                        <span className="text-ekd-charcoal font-bold text-xl">
                          R
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-ekd-charcoal/70 dark:text-ekd-light-gray/70 text-center max-w-sm">
                    Scan this QR code to quickly access your shortened URL
                  </p>
                  <Button
                    onClick={downloadQRCode}
                    variant="default"
                    className="bg-ekd-gold hover:bg-ekd-gold/90 text-ekd-charcoal"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            )}

            {/* Stats Display */}
            {stats && (
              <div className="bg-white dark:bg-ekd-charcoal/50 rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-3 text-ekd-charcoal dark:text-ekd-light-gray">
                  Link Statistics
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-ekd-charcoal/60 dark:text-ekd-light-gray/60">
                      Total Clicks
                    </p>
                    <p className="text-2xl font-bold text-ekd-gold">
                      {stats.clicks}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ekd-charcoal/60 dark:text-ekd-light-gray/60">
                      Last Clicked
                    </p>
                    <p className="text-sm text-ekd-charcoal dark:text-ekd-light-gray">
                      {stats.lastClickAt
                        ? new Date(stats.lastClickAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Information Section */}
      <Card className="p-6 border-ekd-charcoal/10 dark:border-ekd-light-gray/10">
        <h3 className="font-semibold mb-3 text-ekd-charcoal dark:text-ekd-light-gray">
          How It Works
        </h3>
        <ul className="space-y-2 text-sm text-ekd-charcoal/80 dark:text-ekd-light-gray/80">
          <li className="flex items-start gap-2">
            <span className="text-ekd-gold mt-0.5">•</span>
            <span>Enter any long URL you want to shorten</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ekd-gold mt-0.5">•</span>
            <span>Optionally customize the slug for a memorable link</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ekd-gold mt-0.5">•</span>
            <span>Set an expiration date if you want the link to expire</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ekd-gold mt-0.5">•</span>
            <span>
              Track clicks and view statistics for your shortened URLs
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
