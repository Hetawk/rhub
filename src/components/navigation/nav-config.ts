import {
  Home,
  Wrench,
  BookOpen,
  Code2,
  Layers,
  Sparkles,
  Link2,
  Download,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon?: LucideIcon;
  description?: string;
  badge?: string;
  external?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Main navigation links
export const mainNavItems: NavItem[] = [
  {
    name: "Home",
    href: "/",
    icon: Home,
  },
  {
    name: "Resources",
    href: "/#resources",
    icon: Layers,
    description: "Browse all available tools",
  },
  {
    name: "Downloads",
    href: "/downloads",
    icon: Download,
    description: "Access important documents",
  },
  {
    name: "Documentation",
    href: "/docs",
    icon: BookOpen,
    badge: "Coming Soon",
  },
  {
    name: "API",
    href: "/api",
    icon: Code2,
    badge: "Coming Soon",
  },
];

// Featured resources for quick access
export const featuredResources: NavItem[] = [
  {
    name: "Converters",
    href: "/#converters",
    icon: Wrench,
    description: "Reference, LaTeX, Word & more",
  },
  {
    name: "Image Tools",
    href: "/tools/img",
    icon: Sparkles,
    description: "Convert between 8+ formats",
  },
  {
    name: "URL Shortener",
    href: "/tools/s",
    icon: Link2,
    description: "Create short, branded links",
  },
  {
    name: "Downloads",
    href: "/downloads",
    icon: Download,
    description: "Access important documents",
  },
];

// Footer navigation sections
export const footerNavSections: NavSection[] = [
  {
    title: "Resources",
    items: [
      { name: "All Resources", href: "/#resources" },
      { name: "Converters", href: "/#converters" },
      { name: "URL Shortener", href: "/tools/s" },
      { name: "Image Tools", href: "/tools/img" },
      { name: "Downloads", href: "/downloads" },
    ],
  },
  {
    title: "Converters",
    items: [
      { name: "Reference to BibTeX", href: "/tools/ref" },
      { name: "LaTeX to Word", href: "/tools/latex" },
      { name: "Word to LaTeX", href: "#" },
    ],
  },
  {
    title: "Documentation",
    items: [
      { name: "Getting Started", href: "/docs" },
      { name: "API Reference", href: "#" },
      { name: "Guides", href: "#" },
      { name: "Examples", href: "#" },
    ],
  },
  {
    title: "Company",
    items: [
      {
        name: "About EKD Digital",
        href: "https://ekddigital.com",
        external: true,
      },
      {
        name: "Our Services",
        href: "https://ekddigital.com/services",
        external: true,
      },
      {
        name: "Contact",
        href: "https://ekddigital.com/contact",
        external: true,
      },
      {
        name: "Careers",
        href: "https://ekddigital.com/careers",
        external: true,
      },
    ],
  },
  {
    title: "Legal",
    items: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Cookie Policy", href: "#" },
    ],
  },
];

// Social media links
export const socialLinks = [
  {
    name: "Email",
    href: "mailto:support@ekddigital.com",
    icon: "Mail",
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/ekddigital",
    icon: "Linkedin",
  },
  {
    name: "GitHub",
    href: "https://github.com/ekddigital",
    icon: "Github",
  },
  {
    name: "Twitter",
    href: "https://twitter.com/ekddigital",
    icon: "Twitter",
  },
];
