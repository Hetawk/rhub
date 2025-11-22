import { XMLParser } from "fast-xml-parser";
import type { ConversionOptions, ReferenceEntry } from "./types";
import { escapeLatex } from "./latex";

type LooseRecord = Record<string, unknown>;

function isLooseRecord(value: unknown): value is LooseRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

export function parseXmlToReferences(
  content: string,
  options: ConversionOptions,
  warnings: string[]
): ReferenceEntry[] {
  const data = parser.parse(content);
  const records = findRecords(data);

  if (!records || records.length === 0) {
    warnings.push("No reference records detected in XML file");
    return [];
  }

  return records
    .map((record, index) => mapRecordToReference(record, index + 1, options))
    .filter((entry): entry is ReferenceEntry => Boolean(entry));
}

function findRecords(node: unknown): LooseRecord[] {
  if (!node) return [];
  if (Array.isArray(node)) {
    return node.flatMap((value) => findRecords(value));
  }
  if (!isLooseRecord(node)) return [];

  if (Array.isArray(node.record)) {
    return node.record.filter(isLooseRecord);
  }

  const nestedKeys = ["records", "xml", "database"] as const;
  for (const key of nestedKeys) {
    if (key in node) {
      return findRecords(node[key]);
    }
  }

  if (isLooseRecord(node.EndNote) && "records" in node.EndNote) {
    return findRecords((node.EndNote as LooseRecord).records);
  }

  return Object.values(node)
    .flatMap((value) => findRecords(value))
    .filter(isLooseRecord);
}

function mapRecordToReference(
  record: LooseRecord,
  position: number,
  options: ConversionOptions
): ReferenceEntry | null {
  const entry: ReferenceEntry = {
    id: generateKey(record, position),
    type: deriveType(record),
    title: getValue(record, ["titles", "title"]),
    author: buildAuthors(record),
    year: getValue(record, ["dates", "year"]),
    journal: getValue(record, ["periodical", "full-title"]),
    booktitle: getValue(record, ["periodical", "abbr-1"]),
    volume: getValue(record, ["volume"]),
    number: getValue(record, ["number"]),
    pages: normalizePages(getValue(record, ["pages"])),
    doi: getValue(record, ["electronic-resource-num"]),
    url: getValue(record, ["urls", "related-urls", "url"]),
    abstract: options.includeAbstract
      ? getValue(record, ["abstract"])
      : undefined,
    keywords: options.includeKeywords ? extractKeywords(record) : undefined,
    note: options.includeNotes
      ? getValue(record, ["notes", "note"])
      : undefined,
    publisher: getValue(record, ["publisher"], true),
    address: getValue(record, ["publisher", "city"], true),
    isbn: getValue(record, ["isbn"]),
    issn: getValue(record, ["issn"]),
  };

  if (options.escapeLatex) {
    Object.keys(entry).forEach((key) => {
      const value = entry[key];
      if (typeof value === "string") {
        entry[key] = escapeLatex(value);
      }
    });
  }

  return entry.title || entry.author ? entry : null;
}

function getValue(
  record: LooseRecord,
  path: string[],
  deep = false
): string | undefined {
  let current: unknown = record;
  for (const key of path) {
    if (!isLooseRecord(current)) {
      return typeof current === "string" ? current : undefined;
    }
    current = current[key];
    if (current === undefined || current === null) {
      return undefined;
    }
  }

  if (typeof current === "string") {
    return current;
  }

  // Handle EndNote XML style wrapper: {style: {"#text": "value"}}
  if (isLooseRecord(current)) {
    const style = current.style;
    if (isLooseRecord(style) && typeof style["#text"] === "string") {
      return style["#text"] as string;
    }
    // Direct #text field
    if (typeof current["#text"] === "string") {
      return current["#text"] as string;
    }
  }

  if (deep && isLooseRecord(current)) {
    return Object.values(current)
      .map((value) => (typeof value === "string" ? value : ""))
      .filter(Boolean)
      .join(" ");
  }

  return undefined;
}

function buildAuthors(record: LooseRecord): string | undefined {
  const authors = (record?.contributors as LooseRecord | undefined)?.authors as
    | LooseRecord
    | LooseRecord[]
    | string
    | undefined;
  if (!authors) return undefined;

  // Helper to extract author name from EndNote XML structure
  const extractAuthorName = (author: unknown): string => {
    if (typeof author === "string") return author;
    if (!isLooseRecord(author)) return "";

    // EndNote XML: author.style.#text
    const style = author.style;
    if (isLooseRecord(style) && typeof style["#text"] === "string") {
      return style["#text"] as string;
    }

    // Fallback to direct style field
    if (typeof author.style === "string") {
      return author.style;
    }

    return "";
  };

  if (Array.isArray(authors)) {
    return authors
      .map(extractAuthorName)
      .filter(Boolean)
      .map((author) => author.trim())
      .join(" and ");
  }

  if (typeof authors === "string") return authors;

  // Single author object
  if (isLooseRecord(authors)) {
    const authorList = authors.author;
    if (Array.isArray(authorList)) {
      return authorList
        .map(extractAuthorName)
        .filter(Boolean)
        .map((author) => author.trim())
        .join(" and ");
    }
    return extractAuthorName(authorList);
  }

  return undefined;
}

function normalizePages(pages?: string): string | undefined {
  if (!pages) return undefined;
  return pages.replace(/(\d+)-(\d+)/, "$1--$2");
}

function extractKeywords(record: LooseRecord): string | undefined {
  const keywords = (record?.keywords as LooseRecord | undefined)?.keyword as
    | string
    | LooseRecord
    | LooseRecord[]
    | undefined;
  if (!keywords) return undefined;

  const extractText = (kw: unknown): string => {
    if (typeof kw === "string") return kw;
    if (!isLooseRecord(kw)) return "";
    // EndNote XML: keyword.style.#text
    const style = kw.style;
    if (isLooseRecord(style) && typeof style["#text"] === "string") {
      return style["#text"] as string;
    }
    if (typeof kw.style === "string") return kw.style;
    return "";
  };

  if (Array.isArray(keywords)) {
    return keywords.map(extractText).filter(Boolean).join(", ");
  }
  if (typeof keywords === "string") return keywords;
  return extractText(keywords);
}

function deriveType(record: LooseRecord): string {
  const refType = record["ref-type"];
  const typeName =
    isLooseRecord(refType) && typeof refType["@_name"] === "string"
      ? (refType["@_name"] as string).toLowerCase()
      : undefined;
  if (!typeName) return "misc";

  if (typeName.includes("article")) return "article";
  if (typeName.includes("book")) return "book";
  if (typeName.includes("conference")) return "inproceedings";
  if (typeName.includes("thesis")) return "phdthesis";
  if (typeName.includes("report")) return "techreport";

  return "misc";
}

function generateKey(record: LooseRecord, position: number): string {
  const author = buildAuthors(record) || "ref";
  const year = getValue(record, ["dates", "year"]) || "00";
  const base =
    author
      .split(" ")
      .pop()
      ?.replace(/[^a-z]/gi, "") ?? "ref";
  return `${base.toLowerCase()}${year}${position}`;
}
