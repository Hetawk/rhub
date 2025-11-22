export type SourceFormat = "xml" | "ris" | "endnote" | "unknown";

export function detectFormat(content: string): SourceFormat {
  const trimmed = content.trim();

  if (
    trimmed.startsWith("<?xml") ||
    /<\/?(record|reference|xml)/i.test(trimmed)
  ) {
    if (/EndNote|xml\/records/i.test(trimmed)) {
      return "endnote";
    }
    return "xml";
  }

  if (/^TY  -/m.test(trimmed) && /^ER  -/m.test(trimmed)) {
    return "ris";
  }

  return "unknown";
}
