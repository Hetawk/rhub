export type ResourceCategory =
  | "converter"
  | "dataset"
  | "playground"
  | "api"
  | "guide"
  | "utility";

export type ResourceStatus = "live" | "beta" | "upcoming";

export interface ResourceAction {
  label: string;
  description?: string;
  href: string;
  intent?: "primary" | "secondary" | "ghost";
}

export interface ResourceDefinition {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  category: ResourceCategory;
  status: ResourceStatus;
  icon: string;
  accent: string;
  actions: ResourceAction[];
  metrics?: {
    label: string;
    value: string;
  }[];
}

export const featuredResources: ResourceDefinition[] = [
  {
    slug: "reference-converter",
    title: "Reference Converter",
    tagline: "Convert XML, RIS, and EndNote exports to modern BibTeX instantly",
    summary:
      "A cloud-ready version of our desktop converter with API enrichment, LaTeX escaping, and multi-format presets.",
    category: "converter",
    status: "beta",
    icon: "Sparkles",
    accent: "#C8A061",
    actions: [
      {
        label: "Open converter",
        href: "/resources/reference-converter",
        intent: "primary",
      },
      {
        label: "View API",
        href: "/resources/reference-converter/api",
        intent: "secondary",
      },
    ],
    metrics: [
      { label: "Formats", value: "XML · RIS · EndNote" },
      { label: "Speed", value: "~5k refs/min" },
    ],
  },
  {
    slug: "metadata-toolkit",
    title: "Metadata Toolkit",
    tagline: "Validate and enrich citations with Semantic Scholar & CrossRef",
    summary:
      "Batch quality checks, duplicate detection, and enrichment cues for bibliographies.",
    category: "utility",
    status: "upcoming",
    icon: "Shield",
    accent: "#182E5F",
    actions: [
      {
        label: "Join waitlist",
        href: "/resources/metadata-toolkit",
      },
    ],
  },
  {
    slug: "latex-snippets",
    title: "LaTeX Snippets Library",
    tagline: "Reusable citation-ready building blocks for EKD teams",
    summary:
      "Curated LaTeX macros, ACM/IEEE templates, and typography tokens aligned with EKD brand.",
    category: "guide",
    status: "live",
    icon: "FileText",
    accent: "#8E0E00",
    actions: [
      {
        label: "Browse library",
        href: "/resources/latex-snippets",
        intent: "primary",
      },
    ],
  },
];
