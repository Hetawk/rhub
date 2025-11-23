import {
  FileText,
  Link2,
  Image,
  Download,
  Video,
  FileCode,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ToolConfig {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  category: "converter" | "utility" | "download" | "media";
  group: "img" | "ref" | "url" | "vid" | "audio" | "docs" | "latex" | "word";
  subcategory?: "reference" | "latex" | "word" | "image" | "video";
  status: "live" | "beta" | "coming-soon";
  featured: boolean;
  icon: LucideIcon;
  path: string;
  hasSubTools?: boolean;
  metadata?: Record<string, unknown>;
}

export const TOOLS: ToolConfig[] = [
  // Reference Converter
  {
    slug: "ref",
    title: "Reference Converter",
    tagline: "Transform citation exports into clean BibTeX",
    summary:
      "Convert EndNote XML, RIS, and enriched exports into validated BibTeX entries. Built for academic research.",
    category: "converter",
    group: "ref",
    subcategory: "reference",
    status: "live",
    featured: true,
    icon: FileText,
    path: "/tools/ref",
    metadata: {
      supportedFormats: ["xml", "ris", "enl"],
      outputFormats: ["bibtex", "biblatex"],
    },
  },

  // LaTeX Converters
  {
    slug: "latex",
    title: "LaTeX Converters",
    tagline: "Convert LaTeX documents with journal detection",
    summary:
      "Convert LaTeX to Word with automatic journal detection for Elsevier, IEEE, Springer, and ACM. Preserves formatting, figures, and bibliographies.",
    category: "converter",
    group: "latex",
    subcategory: "latex",
    status: "live",
    featured: true,
    icon: FileCode,
    path: "/tools/latex",
    hasSubTools: true,
    metadata: {
      supportedJournals: ["Elsevier", "IEEE", "Springer Nature", "ACM"],
      inputFormats: [".tex", ".latex", ".zip"],
      outputFormats: ["Word (.docx)"],
      features: [
        "Automatic journal detection",
        "ZIP file support",
        "Recursive asset resolution",
        "Bibliography processing",
      ],
    },
  },

  // URL Shortener
  {
    slug: "url-shortener",
    title: "URL Shortener",
    tagline: "Create short, memorable links",
    summary:
      "Transform long URLs into short, branded links with custom slugs, QR codes, and analytics.",
    category: "utility",
    group: "url",
    status: "live",
    featured: true,
    icon: Link2,
    path: "/tools/s",
    metadata: {
      features: [
        "Custom slugs",
        "QR codes",
        "Click tracking",
        "Link expiration",
      ],
    },
  },

  // Image Converters Hub
  {
    slug: "img",
    title: "Image Converters",
    tagline: "Convert between 8+ image formats",
    summary:
      "Professional image conversion supporting SVG, PNG, JPG, WebP, ICO, GIF, BMP, and TIFF with 25+ conversion routes.",
    category: "converter",
    group: "img",
    status: "live",
    featured: true,
    icon: Image,
    path: "/tools/img",
    metadata: {
      supportedFormats: [
        "svg",
        "png",
        "jpg",
        "webp",
        "ico",
        "gif",
        "bmp",
        "tiff",
      ],
      totalConversions: 25,
      features: ["Batch conversion", "Custom dimensions", "Quality control"],
    },
  },

  // Downloads
  {
    slug: "downloads",
    title: "Downloads",
    tagline: "Access important documents and files",
    summary:
      "Download essential documents, forms, and resources with time-based password protection.",
    category: "download",
    group: "docs",
    status: "live",
    featured: true,
    icon: Download,
    path: "/downloads",
    metadata: {
      features: [
        "Password protection",
        "Time-based access",
        "Download tracking",
      ],
    },
  },

  // YouTube Downloader
  {
    slug: "yt",
    title: "YouTube Downloader",
    tagline: "Download YouTube videos and audio",
    summary:
      "Download videos from YouTube in multiple formats and qualities. Extract audio tracks as MP3 or M4A.",
    category: "media",
    group: "vid",
    status: "live",
    featured: true,
    icon: Video,
    path: "/tools/vid/yt",
    metadata: {
      supportedSites: ["YouTube"],
      formats: ["MP4", "WebM", "MP3", "M4A"],
      qualities: ["4K", "1080p", "720p", "480p", "360p"],
    },
  },

  // Instagram Downloader
  {
    slug: "ig",
    title: "Instagram Downloader",
    tagline: "Download Instagram videos and Reels",
    summary:
      "Download Instagram Reels, IGTV videos, and posts in MP4 format without watermarks. Supports multiple quality options.",
    category: "media",
    group: "vid",
    status: "coming-soon",
    featured: false,
    icon: Video,
    path: "/tools/vid/ig",
    metadata: {
      supportedSites: ["Instagram"],
      formats: ["MP4", "MP3"],
      qualities: ["1080p", "720p", "480p"],
      features: ["No watermark", "Reels", "IGTV", "Posts"],
    },
  },
];

// Helper functions
export function getToolBySlug(slug: string): ToolConfig | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

export function getToolsByGroup(group: string): ToolConfig[] {
  return TOOLS.filter((tool) => tool.group === group);
}

export function getToolsByCategory(category: string): ToolConfig[] {
  return TOOLS.filter((tool) => tool.category === category);
}

export function getToolsBySubcategory(subcategory: string): ToolConfig[] {
  return TOOLS.filter((tool) => tool.subcategory === subcategory);
}

export function getFeaturedTools(): ToolConfig[] {
  return TOOLS.filter((tool) => tool.featured && tool.status === "live");
}

export function getLiveTools(): ToolConfig[] {
  return TOOLS.filter((tool) => tool.status === "live");
}

export function getConverterTools(): ToolConfig[] {
  return TOOLS.filter(
    (tool) => tool.category === "converter" && tool.status === "live"
  );
}
