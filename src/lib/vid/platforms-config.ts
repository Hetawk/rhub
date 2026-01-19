// Video download platform configurations - modular and scalable
export interface VideoQuality {
  id: string;
  label: string;
  resolution: string;
  format: string;
  bitrate?: string;
}

export interface AudioQuality {
  id: string;
  label: string;
  bitrate: string;
  format: string;
}

export interface DownloadFormat {
  id: string;
  name: string;
  ext: string;
  mime: string;
  type: "video" | "audio";
  supportsQuality: boolean;
}

export interface Platform {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  urlPattern: RegExp;
  videoQualities: VideoQuality[];
  audioQualities: AudioQuality[];
  supportedFormats: DownloadFormat[];
  features: string[];
}

// Supported download formats
export const formats: Record<string, DownloadFormat> = {
  mp4: {
    id: "mp4",
    name: "MP4",
    ext: ".mp4",
    mime: "video/mp4",
    type: "video",
    supportsQuality: true,
  },
  webm: {
    id: "webm",
    name: "WebM",
    ext: ".webm",
    mime: "video/webm",
    type: "video",
    supportsQuality: true,
  },
  mp3: {
    id: "mp3",
    name: "MP3",
    ext: ".mp3",
    mime: "audio/mpeg",
    type: "audio",
    supportsQuality: true,
  },
  m4a: {
    id: "m4a",
    name: "M4A",
    ext: ".m4a",
    mime: "audio/mp4",
    type: "audio",
    supportsQuality: true,
  },
  wav: {
    id: "wav",
    name: "WAV",
    ext: ".wav",
    mime: "audio/wav",
    type: "audio",
    supportsQuality: false,
  },
};

// Video quality presets
export const videoQualities: VideoQuality[] = [
  {
    id: "2160p",
    label: "4K (2160p)",
    resolution: "3840x2160",
    format: "mp4",
    bitrate: "40-50 Mbps",
  },
  {
    id: "1440p",
    label: "2K (1440p)",
    resolution: "2560x1440",
    format: "mp4",
    bitrate: "16-20 Mbps",
  },
  {
    id: "1080p",
    label: "Full HD (1080p)",
    resolution: "1920x1080",
    format: "mp4",
    bitrate: "8-10 Mbps",
  },
  {
    id: "720p",
    label: "HD (720p)",
    resolution: "1280x720",
    format: "mp4",
    bitrate: "5 Mbps",
  },
  {
    id: "480p",
    label: "SD (480p)",
    resolution: "854x480",
    format: "mp4",
    bitrate: "2.5 Mbps",
  },
  {
    id: "360p",
    label: "Low (360p)",
    resolution: "640x360",
    format: "mp4",
    bitrate: "1 Mbps",
  },
];

// Audio quality presets
export const audioQualities: AudioQuality[] = [
  {
    id: "320k",
    label: "High (320 kbps)",
    bitrate: "320k",
    format: "mp3",
  },
  {
    id: "256k",
    label: "Very Good (256 kbps)",
    bitrate: "256k",
    format: "mp3",
  },
  {
    id: "192k",
    label: "Good (192 kbps)",
    bitrate: "192k",
    format: "mp3",
  },
  {
    id: "128k",
    label: "Standard (128 kbps)",
    bitrate: "128k",
    format: "mp3",
  },
];

// Platform configurations
export const platforms: Record<string, Platform> = {
  youtube: {
    id: "yt",
    name: "youtube",
    displayName: "YouTube",
    icon: "🎥",
    urlPattern:
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})/,
    videoQualities: videoQualities,
    audioQualities: audioQualities,
    supportedFormats: [formats.mp4, formats.webm, formats.mp3, formats.m4a],
    features: [
      "Multiple quality options",
      "Audio extraction",
      "Subtitles support",
      "Fast processing",
    ],
  },
  instagram: {
    id: "ig",
    name: "instagram",
    displayName: "Instagram",
    icon: "📸",
    urlPattern:
      /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/,
    videoQualities: [
      videoQualities.find((q) => q.id === "1080p")!,
      videoQualities.find((q) => q.id === "720p")!,
      videoQualities.find((q) => q.id === "480p")!,
    ],
    audioQualities: [
      audioQualities.find((q) => q.id === "192k")!,
      audioQualities.find((q) => q.id === "128k")!,
    ],
    supportedFormats: [formats.mp4, formats.mp3],
    features: [
      "Posts, Reels, and IGTV",
      "Audio extraction",
      "No watermark",
      "Quick download",
    ],
  },
  tiktok: {
    id: "tk",
    name: "tiktok",
    displayName: "TikTok",
    icon: "🎵",
    urlPattern: /^(https?:\/\/)?(www\.)?(tiktok\.com|vm\.tiktok\.com)/,
    videoQualities: [
      videoQualities.find((q) => q.id === "1080p")!,
      videoQualities.find((q) => q.id === "720p")!,
    ],
    audioQualities: [
      audioQualities.find((q) => q.id === "192k")!,
      audioQualities.find((q) => q.id === "128k")!,
    ],
    supportedFormats: [formats.mp4, formats.mp3],
    features: [
      "No watermark option",
      "Audio extraction",
      "HD quality",
      "Fast download",
    ],
  },
  twitter: {
    id: "tw",
    name: "twitter",
    displayName: "Twitter/X",
    icon: "🐦",
    urlPattern: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.*\/status\/\d+/,
    videoQualities: [
      videoQualities.find((q) => q.id === "1080p")!,
      videoQualities.find((q) => q.id === "720p")!,
      videoQualities.find((q) => q.id === "480p")!,
    ],
    audioQualities: [audioQualities.find((q) => q.id === "128k")!],
    supportedFormats: [formats.mp4, formats.mp3],
    features: ["HD quality", "Audio extraction", "Quick processing"],
  },
  vimeo: {
    id: "vm",
    name: "vimeo",
    displayName: "Vimeo",
    icon: "🎬",
    urlPattern: /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+/,
    videoQualities: videoQualities,
    audioQualities: audioQualities,
    supportedFormats: [formats.mp4, formats.mp3],
    features: [
      "High quality",
      "Multiple formats",
      "Audio extraction",
      "Professional content",
    ],
  },
};

// Helper functions
export function detectPlatform(url: string): Platform | null {
  for (const platform of Object.values(platforms)) {
    if (platform.urlPattern.test(url)) {
      return platform;
    }
  }
  return null;
}

export function getPlatformById(id: string): Platform | undefined {
  return Object.values(platforms).find((p) => p.id === id);
}

export function extractVideoId(url: string, platform: Platform): string | null {
  const match = url.match(platform.urlPattern);
  if (!match) return null;

  // Platform-specific ID extraction
  switch (platform.id) {
    case "yt":
      return match[5] || null;
    case "ig":
      return match[4] || null;
    case "tk":
    case "tw":
    case "vm":
      return match[0] || null;
    default:
      return null;
  }
}

export function validateUrl(url: string): {
  valid: boolean;
  platform?: Platform;
  videoId?: string;
  error?: string;
} {
  try {
    new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return { valid: false, error: "Unsupported platform" };
  }

  const videoId = extractVideoId(url, platform);
  if (!videoId) {
    return { valid: false, error: "Could not extract video ID" };
  }

  return { valid: true, platform, videoId };
}

export function getAvailableFormats(platform: Platform): DownloadFormat[] {
  return platform.supportedFormats;
}

export function getAvailableQualities(
  platform: Platform,
  formatType: "video" | "audio"
): VideoQuality[] | AudioQuality[] {
  return formatType === "video"
    ? platform.videoQualities
    : platform.audioQualities;
}
