import type { SourceFormat } from "./format-detector";

export type CitationStyle = "bibtex" | "biblatex" | "acm";

export interface ConversionOptions {
  includeAbstract?: boolean;
  includeKeywords?: boolean;
  includeNotes?: boolean;
  escapeLatex?: boolean;
  preserveFormatting?: boolean;
  customFields?: string[];
  citationStyle?: CitationStyle;
  suppressWarnings?: boolean;
}

export interface ConversionResult {
  bibtex: string;
  entryCount: number;
  warnings: string[];
  processingTime: number;
  format: SourceFormat;
}

export interface ReferenceEntry {
  id: string;
  type: string;
  title?: string;
  author?: string;
  year?: string;
  journal?: string;
  booktitle?: string;
  volume?: string;
  number?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords?: string;
  note?: string;
  publisher?: string;
  address?: string;
  isbn?: string;
  issn?: string;
  [key: string]: string | undefined;
}
