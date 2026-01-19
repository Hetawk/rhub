import { Metadata } from "next";
import Link from "next/link";
import {
  Book,
  FileCode,
  Wrench,
  Zap,
  ArrowRight,
  Code2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Documentation | EKD Digital Resource Hub",
  description:
    "Comprehensive documentation for all tools and resources available on the EKD Digital Resource Hub platform.",
};

const docSections = [
  {
    title: "Getting Started",
    icon: Zap,
    description: "Quick start guides and tutorials",
    items: [
      { name: "Introduction", href: "#" },
      { name: "Quick Start Guide", href: "#" },
      { name: "Platform Overview", href: "#" },
    ],
  },
  {
    title: "Reference Converter",
    icon: FileText,
    description: "Convert XML, RIS, and EndNote to BibTeX",
    items: [
      { name: "Overview", href: "#" },
      { name: "Supported Formats", href: "#" },
      { name: "Usage Guide", href: "#" },
      { name: "API Reference", href: "#" },
    ],
  },
  {
    title: "API Documentation",
    icon: Code2,
    description: "RESTful API for programmatic access",
    items: [
      { name: "Authentication", href: "#" },
      { name: "Endpoints", href: "#" },
      { name: "Rate Limits", href: "#" },
      { name: "SDKs & Libraries", href: "#" },
    ],
  },
  {
    title: "Tools & Resources",
    icon: Wrench,
    description: "Browse all available tools",
    items: [
      { name: "Reference Converter", href: "/tools/ref" },
      { name: "LaTeX to Word (Coming Soon)", href: "#" },
      { name: "API Playground (Coming Soon)", href: "#" },
      { name: "Request a Tool", href: "#" },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-ekd-maroon to-ekd-navy shadow-lg">
            <Book className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Documentation
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything you need to know about using the EKD Digital Resource Hub
          platform. Explore our guides, API documentation, and tool-specific
          tutorials.
        </p>
      </div>

      {/* Search placeholder */}
      <div className="mb-12">
        <div className="relative">
          <input
            type="search"
            placeholder="Search documentation..."
            className="w-full px-4 py-3 pl-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/50"
            disabled
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Search coming soon
        </p>
      </div>

      {/* Documentation Sections */}
      <div className="grid gap-8 sm:grid-cols-2 mb-12">
        {docSections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-ekd-gold/50 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-ekd-maroon/10 to-ekd-navy/10 group-hover:from-ekd-maroon/20 group-hover:to-ekd-navy/20 transition-colors">
                  <Icon className="h-5 w-5 text-ekd-gold" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {section.title}
                </h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {section.description}
              </p>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="group/link flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-1" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Need Help Section */}
      <div className="rounded-lg border border-border bg-linear-to-br from-ekd-navy/5 to-ekd-maroon/5 p-8 text-center">
        <FileCode className="mx-auto mb-4 h-12 w-12 text-ekd-gold" />
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Need More Help?
        </h2>
        <p className="mb-6 text-muted-foreground">
          Can&apos;t find what you&apos;re looking for? Our team is here to
          help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link
              href="https://ekddigital.com/contact"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact Support
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/api">Explore API</Link>
          </Button>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-12 rounded-lg border border-ekd-gold/20 bg-ekd-gold/5 p-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ekd-gold/20 shrink-0 mt-0.5">
            <span className="text-sm font-bold text-ekd-gold">i</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Documentation In Progress
            </h3>
            <p className="text-sm text-muted-foreground">
              We&apos;re actively building comprehensive documentation for all
              tools and features. Check back soon for detailed guides and
              tutorials. In the meantime, explore our live tools and reach out
              if you need assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
