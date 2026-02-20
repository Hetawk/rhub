import {
  FileText,
  Link2,
  BookOpen,
  Image as ImageIcon,
  Download,
  type LucideIcon,
} from "lucide-react";

export interface ToolConfig {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  color: string;
  bg: string;
}

export interface QuickLink {
  label: string;
  href: string;
  external?: boolean;
}

export const DASHBOARD_TOOLS: ToolConfig[] = [
  {
    icon: FileText,
    label: "LaTeX to Word",
    description: "Convert LaTeX manuscripts to Word documents",
    href: "/tools/latex",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Link2,
    label: "URL Shortener",
    description: "Shorten and manage links",
    href: "/tools/s",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: BookOpen,
    label: "Reference Tools",
    description: "BibTeX & reference converters",
    href: "/tools/ref",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: ImageIcon,
    label: "Image Tools",
    description: "Image utilities and converters",
    href: "/tools/img",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Download,
    label: "Downloads",
    description: "Templates, guides and resources",
    href: "/downloads",
    color: "text-ekd-gold",
    bg: "bg-ekd-gold/10",
  },
  {
    icon: BookOpen,
    label: "Documentation",
    description: "API reference and guides",
    href: "/docs",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
];

export const QUICK_LINKS: QuickLink[] = [
  { label: "Edit Profile", href: "/profile" },
  { label: "Debate Hub", href: "/tools/dbt" },
  { label: "API Docs", href: "/docs" },
  { label: "API Reference", href: "/api" },
  { label: "EKD Digital", href: "https://ekddigital.com", external: true },
];

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
