import { FileText, Link2, Image, Download, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ToolConfig {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  category: "converter" | "utility" | "download" | "media";
  group: "img" | "ref" | "url" | "video" | "audio" | "docs";
  status: "live" | "beta" | "coming-soon";
  featured: boolean;
  icon: LucideIcon;
  path: string;
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
    status: "live",
    featured: true,
    icon: FileText,
    path: "/tools/ref",
    metadata: {
      supportedFormats: ["xml", "ris", "enl"],
      outputFormats: ["bibtex", "biblatex"],
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

  // SVG to PNG
  {
    slug: "svg-to-png",
    title: "SVG to PNG",
    tagline: "Convert SVG vector graphics to PNG images",
    summary:
      "High-quality SVG to PNG conversion with custom dimensions, background colors, and compression.",
    category: "converter",
    group: "img",
    status: "live",
    featured: true,
    icon: Image,
    path: "/tools/img/svg-to-png",
    metadata: {
      supportedFormats: ["svg"],
      outputFormats: ["png"],
      features: ["Custom size", "Background color", "High quality"],
    },
  },

  // PNG to SVG (Coming Soon - requires vectorization)
  {
    slug: "png-to-svg",
    title: "PNG to SVG",
    tagline: "Convert PNG images to SVG vectors",
    summary:
      "Convert raster PNG images to scalable SVG vectors. Perfect for logos and icons.",
    category: "converter",
    group: "img",
    status: "coming-soon",
    featured: false,
    icon: Image,
    path: "/tools/img/png-to-svg",
    metadata: {
      note: "Vectorization feature in development",
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

  // YouTube Downloader (Coming Soon)
  {
    slug: "youtube-downloader",
    title: "YouTube Downloader",
    tagline: "Download YouTube videos and audio",
    summary:
      "Download videos from YouTube in multiple formats and qualities. Extract audio tracks.",
    category: "media",
    group: "video",
    status: "coming-soon",
    featured: false,
    icon: Video,
    path: "/tools/video/youtube-downloader",
    metadata: {
      supportedSites: ["YouTube", "Vimeo", "More coming"],
      formats: ["MP4", "WebM", "MP3", "M4A"],
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

export function getFeaturedTools(): ToolConfig[] {
  return TOOLS.filter((tool) => tool.featured && tool.status === "live");
}

export function getLiveTools(): ToolConfig[] {
  return TOOLS.filter((tool) => tool.status === "live");
}
