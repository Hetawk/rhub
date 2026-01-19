import ytdl from "@distube/ytdl-core";
import type {
  Platform,
  VideoQuality,
  AudioQuality,
  DownloadFormat,
} from "./platforms-config";

export interface DownloadOptions {
  url: string;
  platform: Platform;
  format: DownloadFormat;
  quality?: VideoQuality | AudioQuality;
  videoId: string;
}

export interface DownloadResult {
  buffer: Buffer;
  fileName: string;
  format: string;
  size: number;
  duration?: number;
  processingTime: number;
  metadata: {
    title?: string;
    author?: string;
    thumbnail?: string;
    description?: string;
    views?: number;
    uploadDate?: string;
  };
}

export interface VideoInfo {
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  description: string;
  views: number;
  uploadDate: string;
  availableQualities: string[];
}

/**
 * Get video information without downloading
 */
export async function getVideoInfo(
  url: string,
  platform: Platform
): Promise<VideoInfo> {
  try {
    switch (platform.id) {
      case "yt":
        return await getYouTubeInfo(url);
      case "ig":
        return await getInstagramInfo(url);
      case "tk":
        return await getTikTokInfo(url);
      case "tw":
        return await getTwitterInfo(url);
      case "vm":
        return await getVimeoInfo(url);
      default:
        throw new Error(`Unsupported platform: ${platform.name}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to get video info: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Download video or audio from supported platforms
 */
export async function downloadVideo(
  options: DownloadOptions
): Promise<DownloadResult> {
  try {
    switch (options.platform.id) {
      case "yt":
        return await downloadYouTube(options);
      case "ig":
        return await downloadInstagram(options);
      case "tk":
        return await downloadTikTok(options);
      case "tw":
        return await downloadTwitter(options);
      case "vm":
        return await downloadVimeo(options);
      default:
        throw new Error(`Unsupported platform: ${options.platform.name}`);
    }
  } catch (error) {
    throw new Error(
      `Download failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * YouTube download implementation
 */

// Enhanced YouTube configuration with multiple bypass strategies
function getYTDLOptions() {
  return {
    requestOptions: {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Sec-Ch-Ua":
          '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        "Upgrade-Insecure-Requests": "1",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        DNT: "1",
        // Add cookie to appear as logged-in user (optional, helps with bot detection)
        Cookie: process.env.YOUTUBE_COOKIES || "",
      },
    },
    // Use iOS client which has fewer bot detection measures
    clients: ["ios", "web"],
    poToken: process.env.YOUTUBE_PO_TOKEN,
    visitorData: process.env.YOUTUBE_VISITOR_DATA,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

async function getYouTubeInfo(url: string): Promise<VideoInfo> {
  try {
    const info = await ytdl.getInfo(url, getYTDLOptions());

    // Get available qualities
    const formats = ytdl.filterFormats(info.formats, "videoandaudio");
    const availableQualities = [
      ...new Set(formats.map((f) => f.qualityLabel).filter(Boolean)),
    ] as string[];

    return {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail:
        info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]
          ?.url || "",
      description: info.videoDetails.description || "",
      views: parseInt(info.videoDetails.viewCount),
      uploadDate: info.videoDetails.uploadDate || "",
      availableQualities,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch YouTube info: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function downloadYouTube(
  options: DownloadOptions
): Promise<DownloadResult> {
  const start = Date.now();
  const info = await ytdl.getInfo(options.url, getYTDLOptions());

  let stream;
  let fileName = sanitizeFileName(info.videoDetails.title);

  if (options.format.type === "audio") {
    // Download audio only
    stream = ytdl(options.url, {
      ...getYTDLOptions(),
      quality: "highestaudio",
      filter: "audioonly",
    });

    fileName = `${fileName}${options.format.ext}`;
  } else {
    // Download video with audio
    const videoQuality = options.quality as VideoQuality;
    const qualityLabel = videoQuality?.label || "highest";

    stream = ytdl(options.url, {
      ...getYTDLOptions(),
      quality: qualityLabel.includes("1080p")
        ? "highestvideo"
        : qualityLabel.includes("720p")
        ? "highest"
        : "lowest",
      filter: "videoandaudio",
    });

    fileName = `${fileName}${options.format.ext}`;
  }

  // Collect stream data into buffer
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        fileName,
        format: options.format.id,
        size: buffer.length,
        duration: parseInt(info.videoDetails.lengthSeconds),
        processingTime: Date.now() - start,
        metadata: {
          title: info.videoDetails.title,
          author: info.videoDetails.author.name,
          thumbnail:
            info.videoDetails.thumbnails[
              info.videoDetails.thumbnails.length - 1
            ]?.url,
          description: info.videoDetails.description || undefined,
          views: parseInt(info.videoDetails.viewCount),
          uploadDate: info.videoDetails.uploadDate,
        },
      });
    });
    stream.on("error", reject);
  });
}

/**
 * Instagram download implementation
 */
async function getInstagramInfo(_url: string): Promise<VideoInfo> {
  // Instagram requires different approach - using public API or scraping
  // For now, return placeholder that will be implemented with proper library
  throw new Error(
    "Instagram info fetching requires instagram-private-api or similar library"
  );
}

async function downloadInstagram(
  _options: DownloadOptions
): Promise<DownloadResult> {
  // Instagram download implementation
  // This would use instagram-url-direct or similar library
  throw new Error(
    "Instagram download requires instagram-url-direct or similar library"
  );
}

/**
 * TikTok download implementation
 */
async function getTikTokInfo(_url: string): Promise<VideoInfo> {
  throw new Error("TikTok info fetching requires tiktok-scraper or API");
}

async function downloadTikTok(
  _options: DownloadOptions
): Promise<DownloadResult> {
  throw new Error("TikTok download requires tiktok-scraper or API");
}

/**
 * Twitter/X download implementation
 */
async function getTwitterInfo(_url: string): Promise<VideoInfo> {
  throw new Error("Twitter info fetching requires twitter-api-v2 or scraping");
}

async function downloadTwitter(
  _options: DownloadOptions
): Promise<DownloadResult> {
  throw new Error("Twitter download requires twitter-api-v2 or scraping");
}

/**
 * Vimeo download implementation
 */
async function getVimeoInfo(_url: string): Promise<VideoInfo> {
  throw new Error("Vimeo info fetching requires vimeo API");
}

async function downloadVimeo(
  _options: DownloadOptions
): Promise<DownloadResult> {
  throw new Error("Vimeo download requires vimeo API");
}

/**
 * Sanitize filename for safe file system storage
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .substring(0, 200); // Limit length
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
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
