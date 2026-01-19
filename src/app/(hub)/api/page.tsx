import { Metadata } from "next";
import Link from "next/link";
import { Code2, Zap, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "API Documentation | EKD Digital Resource Hub",
  description:
    "RESTful API for programmatic access to all EKD Digital Resource Hub tools.",
};

export default function ApiPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-ekd-maroon to-ekd-navy shadow-lg">
            <Code2 className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          API Documentation
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Integrate EKD Digital tools directly into your applications with our
          RESTful API.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 mb-12">
        <div className="rounded-lg border border-border bg-card p-6">
          <Zap className="h-8 w-8 text-ekd-gold mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Fast & Reliable
          </h3>
          <p className="text-sm text-muted-foreground">
            High-performance API designed for production workloads with 99.9%
            uptime.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <Shield className="h-8 w-8 text-ekd-gold mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Secure by Default
          </h3>
          <p className="text-sm text-muted-foreground">
            Industry-standard authentication and encryption protect your data.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-ekd-gold/20 bg-ekd-gold/5 p-8 text-center mb-12">
        <Clock className="mx-auto mb-4 h-12 w-12 text-ekd-gold" />
        <h2 className="mb-2 text-2xl font-bold text-foreground">Coming Soon</h2>
        <p className="mb-6 text-muted-foreground max-w-lg mx-auto">
          Our API is currently in development. Register your interest to be
          notified when it launches and get early access.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link
              href="https://ekddigital.com/contact"
              target="_blank"
              rel="noopener noreferrer"
            >
              Register Interest
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/docs">View Documentation</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Example Request
        </h3>
        <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm">
          <code>{`POST /api/tools/ref/convert
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "content": "<?xml version=\\"1.0\\"?>...",
  "format": "xml",
  "options": {
    "includeAbstract": true,
    "escapeLatex": true
  }
}`}</code>
        </pre>
      </div>
    </div>
  );
}
