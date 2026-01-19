import { ReactNode } from "react";

export default function ReferenceToolLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground/60">
          Tools / Reference Converter
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Reference Converter
        </h1>
        <p className="max-w-3xl text-sm text-foreground/70">
          Parse XML, RIS, and EndNote exports, enrich with semantic APIs, and
          output clean BibTeX compatible with ACM, IEEE, and BibLaTeX styles.
          All conversions run server-side with audit logs for EKD Digital teams.
        </p>
      </header>
      {children}
    </div>
  );
}
