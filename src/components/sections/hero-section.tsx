import { Button } from "@/components/ui/button";
import { brandGradients } from "@/lib/utils";
import Link from "next/link";
import {
  FileText,
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    label: "Reference Management",
    description: "Convert & organize citations",
  },
  {
    icon: Zap,
    label: "Fast Processing",
    description: "Sub-second conversions",
  },
  {
    icon: Shield,
    label: "Privacy First",
    description: "Your data stays secure",
  },
];

const stats = [
  { label: "References Processed", value: "2.4M+", icon: FileText },
  { label: "Active Tools", value: "8+", icon: Sparkles },
  { label: "Global Users", value: "10K+", icon: Globe },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-linear-to-br from-primary/5 via-background to-background px-6 py-16 shadow-2xl sm:px-10 lg:py-20">
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: brandGradients.aurum,
          maskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles size={14} />
              EKD Digital Resource Hub
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Professional Tools for
              <span className="block text-primary mt-2">
                Academic Excellence
              </span>
            </h1>

            <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Transform your research workflow with our suite of powerful tools.
              From reference conversion to document processing, we provide
              enterprise-grade solutions built for researchers, academics, and
              publishers worldwide.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm backdrop-blur-sm"
                >
                  <feature.icon size={16} className="text-primary" />
                  <span className="font-medium text-foreground">
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="group">
                <Link href="/tools/ref">
                  Get Started
                  <ArrowRight
                    size={16}
                    className="ml-2 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#resources">Explore Tools</Link>
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex flex-1 flex-col gap-4 lg:max-w-md">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                  <div className="rounded-full bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                    <stat.icon size={24} className="text-primary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Info Bar */}
        <div className="mt-12 rounded-2xl border border-border/40 bg-muted/30 p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-medium text-foreground">
                Trusted by researchers worldwide
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Processing millions of references with 99.9% uptime
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/docs">
                View Documentation
                <ArrowRight size={14} className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
