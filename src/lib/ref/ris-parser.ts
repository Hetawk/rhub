import type { ConversionOptions, ReferenceEntry } from "./types";
import { escapeLatex } from "./latex";

interface RisEntry {
  [tag: string]: string[];
}

const tagMap: Record<string, keyof ReferenceEntry | undefined> = {
  TY: "type",
  TI: "title",
  T1: "title",
  T2: "booktitle",
  T3: "journal",
  JO: "journal",
  JF: "journal",
  AU: "author",
  A1: "author",
  PY: "year",
  Y1: "year",
  VL: "volume",
  IS: "number",
  SP: "pages",
  EP: "pages",
  SN: "issn",
  DO: "doi",
  UR: "url",
  AB: "abstract",
  KW: "keywords",
  N1: "note",
  PB: "publisher",
  CY: "address",
};

export function parseRisToReferences(
  content: string,
  options: ConversionOptions,
  warnings: string[]
): ReferenceEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: ReferenceEntry[] = [];
  let current: RisEntry | null = null;
  let index = 0;

  const pushCurrent = () => {
    if (!current) return;
    const mapped = mapRisEntry(current, ++index, options);
    if (mapped) {
      entries.push(mapped);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("ER  -")) {
      pushCurrent();
      continue;
    }

    const match = line.match(/^([A-Z0-9]{2})  -\s?(.*)$/);
    if (!match) continue;

    const [, tag, value] = match;
    if (tag === "TY") {
      pushCurrent();
      current = { TY: [value] };
      continue;
    }

    if (!current) {
      warnings.push(
        `Encountered RIS field ${tag} before TY tag; skipping line: "${line}"`
      );
      continue;
    }

    if (!current[tag]) {
      current[tag] = [];
    }
    current[tag]?.push(value);
  }

  pushCurrent();
  return entries;
}

function mapRisEntry(
  entry: RisEntry,
  position: number,
  options: ConversionOptions
): ReferenceEntry | null {
  const reference: ReferenceEntry = {
    id: generateKey(entry, position),
    type: normalizeType(entry.TY?.[0]),
  };

  Object.entries(tagMap).forEach(([tag, field]) => {
    if (!field) return;
    const values = entry[tag];
    if (!values || values.length === 0) return;

    if (field === "author") {
      reference.author = values.join(" and ");
      return;
    }

    if (field === "pages") {
      const start = entry.SP?.[0];
      const end = entry.EP?.[0];
      reference.pages = start && end ? `${start}--${end}` : values[0];
      return;
    }

    const value = values[0];
    if (field === "keywords" && !options.includeKeywords) return;
    if (field === "abstract" && !options.includeAbstract) return;
    if (field === "note" && !options.includeNotes) return;

    const key = field as keyof ReferenceEntry;
    reference[key] = value as ReferenceEntry[typeof key];
  });

  if (options.escapeLatex) {
    Object.keys(reference).forEach((key) => {
      const value = reference[key];
      if (typeof value === "string") {
        reference[key] = escapeLatex(value);
      }
    });
  }

  return reference.title || reference.author ? reference : null;
}

function normalizeType(type?: string): string {
  if (!type) return "misc";
  const normalized = type.toLowerCase();
  if (normalized.includes("journal")) return "article";
  if (normalized.includes("book")) return "book";
  if (normalized.includes("thesis")) return "phdthesis";
  if (normalized.includes("conf") || normalized.includes("proc")) {
    return "inproceedings";
  }
  return "misc";
}

function generateKey(entry: RisEntry, position: number): string {
  const author = entry.AU?.[0] || "ref";
  const year = entry.PY?.[0] || entry.Y1?.[0] || "00";
  const base =
    author
      .split(" ")
      .pop()
      ?.replace(/[^a-z]/gi, "") ?? "ref";
  return `${base.toLowerCase()}${year}${position}`;
}
