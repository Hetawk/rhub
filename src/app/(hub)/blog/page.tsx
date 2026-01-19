import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Rss, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blog | EKD Digital Resource Hub",
  description:
    "Latest updates, tutorials, and insights from the EKD Digital team.",
};

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-ekd-maroon to-ekd-navy shadow-lg">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Blog & Updates
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Stay updated with the latest news, tutorials, and insights from the
          EKD Digital team.
        </p>
      </div>

      <div className="rounded-lg border border-ekd-gold/20 bg-ekd-gold/5 p-8 text-center mb-12">
        <Rss className="mx-auto mb-4 h-12 w-12 text-ekd-gold" />
        <h2 className="mb-2 text-2xl font-bold text-foreground">Coming Soon</h2>
        <p className="mb-6 text-muted-foreground max-w-lg mx-auto">
          We&apos;re preparing insightful content about research tools,
          development best practices, and platform updates. Subscribe to stay
          notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link
              href="https://ekddigital.com/contact"
              target="_blank"
              rel="noopener noreferrer"
            >
              Subscribe
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href="https://www.ekddigital.com/resources/blog"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Main Blog
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <Calendar className="h-8 w-8 text-ekd-gold mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Weekly Updates
          </h3>
          <p className="text-sm text-muted-foreground">
            Get weekly updates on new features, tools, and improvements to the
            platform.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <BookOpen className="h-8 w-8 text-ekd-gold mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Tutorials & Guides
          </h3>
          <p className="text-sm text-muted-foreground">
            Step-by-step tutorials to help you get the most out of our tools and
            resources.
          </p>
        </div>
      </div>
    </div>
  );
}
