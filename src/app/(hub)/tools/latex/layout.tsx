import { ReactNode } from "react";

export default function LaTeXToolLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground/60">
          Tools / LaTeX Converter
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          LaTeX Document Converter
        </h1>
        <p className="max-w-3xl text-sm text-foreground/70">
          Convert LaTeX documents to Microsoft Word (DOCX) with automatic
          journal detection. Supports Elsevier, Springer Nature, IEEE, and ACM
          templates with bibliography preservation and high-quality figure
          conversion.
        </p>
      </header>
      {children}
    </div>
  );
}
