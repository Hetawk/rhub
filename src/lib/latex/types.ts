// LaTeX to Word Conversion Types
// Based on reference projects: conversion_ref, ekd_papers_ref, meddef_latex_ref

export type JournalType =
  | "ELSEVIER"
  | "SPRINGER_NATURE"
  | "ACM"
  | "IEEE"
  | "GENERIC";

export type DocumentClass =
  | "elsarticle" // Elsevier journals (CMIG, KBS, MIA, NeuroC)
  | "sn-jnl" // Springer Nature journals
  | "acmart" // ACM journals
  | "IEEEtran" // IEEE Transactions
  | "ieeecolor" // IEEE TMI and colorized journals
  | "article" // Generic article
  | "unknown";

export interface JournalDetectionResult {
  journalType: JournalType;
  documentClass: DocumentClass;
  confidence: number; // 0-100
  detectedPatterns: string[];
  classOptions: string[];
  bibStyle?: string;
  requiresLogo: boolean;
  logoName?: string;
}

export interface LaTeXDocument {
  mainTexFile: string;
  documentClass: DocumentClass;
  classOptions: string[];
  packages: string[];
  bibFiles: string[];
  figureFiles: string[];
  sections: string[];
  hasAbstract: boolean;
  hasKeywords: boolean;
  authorCount: number;
}

export interface ConversionOptions {
  journalId?: string;
  manualOverride: boolean;
  preserveFonts: boolean;
  preserveFormatting: boolean;
  includeBibliography: boolean;
  outputFormat: "docx" | "odt";
}

export interface ConversionResult {
  success: boolean;
  outputFile?: string;
  outputSize?: number;
  detectedJournal?: string;
  documentClass?: string;
  bibEntryCount?: number;
  figureCount?: number;
  tableCount?: number;
  warningCount?: number;
  errorMessage?: string;
  warnings?: string[];
  durationMs: number;
}

// Journal-specific patterns for auto-detection
export const JOURNAL_PATTERNS = {
  ELSEVIER: {
    documentClass: ["elsarticle", "cas-sc", "cas-dc"],
    commands: ["\\journal{", "\\ead{", "\\address[", "\\fntext["],
    confidence: {
      documentClass: 50,
      commands: {
        "\\journal{": 20,
        "\\ead{": 15,
        "\\address[": 15,
        "\\fntext[": 10,
      },
    },
  },
  SPRINGER_NATURE: {
    documentClass: ["sn-jnl"],
    commands: [
      "\\journalname",
      "\\title[",
      "\\author[",
      "\\affil[",
      "\\email{",
    ],
    classOptions: [
      "sn-mathphys-num",
      "sn-nature",
      "sn-basic",
      "sn-aps",
      "sn-vancouver",
      "sn-apa",
      "sn-chicago",
    ],
    confidence: {
      documentClass: 50,
      commands: {
        "\\journalname": 20,
        "\\title[": 15,
        "\\author[": 15,
        "\\affil[": 10,
        "\\email{": 10,
      },
    },
  },
  IEEE: {
    documentClass: ["IEEEtran", "ieeecolor"],
    commands: [
      "\\IEEEtitle",
      "\\IEEEauthor",
      "\\IEEEkeywords",
      "\\thanks{",
      "\\journalname",
    ],
    packages: ["ieeetran", "tmi"],
    confidence: {
      documentClass: 50,
      commands: {
        "\\IEEEtitle": 20,
        "\\IEEEauthor": 15,
        "\\IEEEkeywords": 15,
        "\\thanks{": 10,
        "\\journalname": 10,
      },
    },
  },
  ACM: {
    documentClass: ["acmart"],
    commands: [
      "\\acmConference",
      "\\acmYear",
      "\\acmDOI",
      "\\setcopyright",
      "\\ccsdesc",
    ],
    confidence: {
      documentClass: 50,
      commands: {
        "\\acmConference": 20,
        "\\acmYear": 15,
        "\\setcopyright": 15,
        "\\ccsdesc": 10,
      },
    },
  },
} as const;

// Default conversion settings - Optimized for publication-ready output
export const DEFAULT_SETTINGS = {
  fontSize: 12,
  lineSpacing: 1.5,
  fontFamily: "Times New Roman",
  preserveFormatting: true,
  processBibliography: true,
  preserveFonts: true,
  highQualityImages: true,
  preserveMetadata: true,
} as const;
