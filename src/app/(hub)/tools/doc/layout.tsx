import { ReactNode } from "react";

export default function DocumentToolLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground/60">
          Tools / Document Converter
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Document Converter
        </h1>
        <p className="max-w-3xl text-sm text-foreground/70">
          Convert between document formats including PDF, Word, ODT, RTF, and
          more. Powered by LibreOffice for professional-quality document
          conversion with formatting preservation.
        </p>
      </header>
      {children}
    </div>
  );
}
