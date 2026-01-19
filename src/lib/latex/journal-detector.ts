// Journal Detection Engine for LaTeX Documents
// Ported from scripts/backup/conversion_ref/src/processors/journal_detector.sh

import {
  JournalType,
  DocumentClass,
  JournalDetectionResult,
  JOURNAL_PATTERNS,
} from "./types";

interface DetectionScore {
  elsevier: number;
  springerNature: number;
  ieee: number;
  acm: number;
  scores: Record<string, number>;
}

/**
 * Detects journal type from LaTeX document content
 * Analyzes first 100-150 lines for faster detection
 */
export function detectJournalType(texContent: string): JournalDetectionResult {
  const lines = texContent.split("\n").slice(0, 150).join("\n");

  const scores: DetectionScore = {
    elsevier: 0,
    springerNature: 0,
    ieee: 0,
    acm: 0,
    scores: {},
  };

  const detectedPatterns: string[] = [];
  let documentClass: DocumentClass = "unknown";
  let classOptions: string[] = [];

  // Detect document class
  const docClassMatch = lines.match(/\\documentclass\[([^\]]*)\]\{([^}]+)\}/);
  if (docClassMatch) {
    const options = docClassMatch[1];
    const className = docClassMatch[2];

    classOptions = options ? options.split(",").map((opt) => opt.trim()) : [];

    // Check Elsevier
    if (
      JOURNAL_PATTERNS.ELSEVIER.documentClass.includes(
        className as (typeof JOURNAL_PATTERNS.ELSEVIER.documentClass)[number]
      )
    ) {
      scores.elsevier += JOURNAL_PATTERNS.ELSEVIER.confidence.documentClass;
      documentClass = "elsarticle";
      detectedPatterns.push(`Document class: ${className}`);
    }

    // Check Springer Nature
    if (
      JOURNAL_PATTERNS.SPRINGER_NATURE.documentClass.includes(
        className as (typeof JOURNAL_PATTERNS.SPRINGER_NATURE.documentClass)[number]
      )
    ) {
      scores.springerNature +=
        JOURNAL_PATTERNS.SPRINGER_NATURE.confidence.documentClass;
      documentClass = "sn-jnl";
      detectedPatterns.push(`Document class: ${className}`);
    }

    // Check IEEE
    if (
      JOURNAL_PATTERNS.IEEE.documentClass.includes(
        className as (typeof JOURNAL_PATTERNS.IEEE.documentClass)[number]
      )
    ) {
      scores.ieee += JOURNAL_PATTERNS.IEEE.confidence.documentClass;
      documentClass = className.includes("ieeecolor")
        ? "ieeecolor"
        : "IEEEtran";
      detectedPatterns.push(`Document class: ${className}`);
    }

    // Check ACM
    if (
      JOURNAL_PATTERNS.ACM.documentClass.includes(
        className as (typeof JOURNAL_PATTERNS.ACM.documentClass)[number]
      )
    ) {
      scores.acm += JOURNAL_PATTERNS.ACM.confidence.documentClass;
      documentClass = "acmart";
      detectedPatterns.push(`Document class: ${className}`);
    }
  }

  // Check Elsevier-specific commands
  for (const [command, score] of Object.entries(
    JOURNAL_PATTERNS.ELSEVIER.confidence.commands
  )) {
    if (lines.includes(command)) {
      scores.elsevier += score;
      detectedPatterns.push(`Elsevier: ${command}`);
    }
  }

  // Check Springer Nature-specific commands
  for (const [command, score] of Object.entries(
    JOURNAL_PATTERNS.SPRINGER_NATURE.confidence.commands
  )) {
    if (lines.includes(command)) {
      scores.springerNature += score;
      detectedPatterns.push(`Springer Nature: ${command}`);
    }
  }

  // Check IEEE-specific commands
  for (const [command, score] of Object.entries(
    JOURNAL_PATTERNS.IEEE.confidence.commands
  )) {
    if (lines.includes(command)) {
      scores.ieee += score;
      detectedPatterns.push(`IEEE: ${command}`);
    }
  }

  // Check ACM-specific commands
  for (const [command, score] of Object.entries(
    JOURNAL_PATTERNS.ACM.confidence.commands
  )) {
    if (lines.includes(command)) {
      scores.acm += score;
      detectedPatterns.push(`ACM: ${command}`);
    }
  }

  // Determine best match
  const maxScore = Math.max(
    scores.elsevier,
    scores.springerNature,
    scores.ieee,
    scores.acm
  );

  let journalType: JournalType = "GENERIC";
  let confidence = 0;

  if (scores.elsevier === maxScore && maxScore > 0) {
    journalType = "ELSEVIER";
    confidence = scores.elsevier;
  } else if (scores.springerNature === maxScore && maxScore > 0) {
    journalType = "SPRINGER_NATURE";
    confidence = scores.springerNature;
  } else if (scores.ieee === maxScore && maxScore > 0) {
    journalType = "IEEE";
    confidence = scores.ieee;
  } else if (scores.acm === maxScore && maxScore > 0) {
    journalType = "ACM";
    confidence = scores.acm;
  }

  // Detect logo requirements
  const requiresLogo = detectLogoRequirement(lines, journalType);
  const logoName = detectLogoName(lines);

  // Detect bibliography style
  const bibStyle = detectBibStyle(lines);

  return {
    journalType,
    documentClass,
    confidence,
    detectedPatterns,
    classOptions,
    bibStyle,
    requiresLogo,
    logoName,
  };
}

/**
 * Detects if journal requires logo inclusion
 */
function detectLogoRequirement(
  content: string,
  journalType: JournalType
): boolean {
  // IEEE journals with logos
  if (journalType === "IEEE") {
    return (
      content.includes("\\includegraphics") &&
      (content.includes("LOGO-") || content.includes("logo"))
    );
  }

  // Some Springer journals use logos
  if (
    journalType === "SPRINGER_NATURE" &&
    content.includes("\\includegraphics")
  ) {
    return true;
  }

  return false;
}

/**
 * Detects logo filename from document
 */
function detectLogoName(content: string): string | undefined {
  const logoMatch = content.match(
    /\\includegraphics.*?\{([^}]*[Ll][Oo][Gg][Oo][^}]*)\}/
  );
  if (logoMatch) {
    return logoMatch[1];
  }

  // Check for IEEE TMI logo specifically
  if (content.includes("LOGO-tmi-web")) {
    return "LOGO-tmi-web.eps";
  }

  return undefined;
}

/**
 * Detects bibliography style
 */
function detectBibStyle(content: string): string | undefined {
  // Check for \bibliographystyle command
  const bibStyleMatch = content.match(/\\bibliographystyle\{([^}]+)\}/);
  if (bibStyleMatch) {
    return bibStyleMatch[1];
  }

  // Infer from document class
  if (content.includes("elsarticle")) {
    return "elsarticle-num";
  }

  if (content.includes("acmart")) {
    return "ACM-Reference-Format";
  }

  if (content.includes("IEEEtran") || content.includes("ieeecolor")) {
    return "IEEEtran";
  }

  if (content.includes("sn-jnl")) {
    // Springer has multiple styles, check class options
    if (content.includes("sn-nature")) return "sn-nature";
    if (content.includes("sn-mathphys")) return "sn-mathphys-num";
    if (content.includes("sn-apa")) return "sn-apa";
    if (content.includes("sn-chicago")) return "sn-chicago";
    return "sn-basic";
  }

  return undefined;
}

/**
 * Extracts document metadata from LaTeX content
 */
export function extractDocumentMetadata(texContent: string) {
  return {
    title: extractBetweenCommands(texContent, "\\title{"),
    journal:
      extractBetweenCommands(texContent, "\\journal{") ||
      extractBetweenCommands(texContent, "\\journalname{"),
    authors: extractAuthors(texContent),
    abstract: extractBetweenEnvironment(texContent, "abstract"),
    keywords: extractKeywords(texContent),
    packages: extractPackages(texContent),
    hasAbstract: texContent.includes("\\begin{abstract}"),
    hasKeywords:
      texContent.includes("\\begin{keyword}") ||
      texContent.includes("\\keywords{"),
    hasBibliography:
      texContent.includes("\\bibliography{") ||
      texContent.includes("\\begin{thebibliography}"),
  };
}

function extractBetweenCommands(
  content: string,
  startCmd: string
): string | undefined {
  const startIndex = content.indexOf(startCmd);
  if (startIndex === -1) return undefined;

  let braceCount = 0;
  let result = "";
  let started = false;

  for (let i = startIndex + startCmd.length; i < content.length; i++) {
    const char = content[i];

    if (char === "{") {
      braceCount++;
      started = true;
      if (braceCount > 1) result += char;
    } else if (char === "}") {
      braceCount--;
      if (braceCount === 0) break;
      result += char;
    } else if (started) {
      result += char;
    }
  }

  return result.trim() || undefined;
}

function extractBetweenEnvironment(
  content: string,
  envName: string
): string | undefined {
  const beginPattern = new RegExp(
    `\\\\begin\\{${envName}\\}([\\s\\S]*?)\\\\end\\{${envName}\\}`
  );
  const match = content.match(beginPattern);
  return match ? match[1].trim() : undefined;
}

function extractAuthors(content: string): number {
  const authorMatches = content.match(/\\author(\[.*?\])?\{/g);
  return authorMatches ? authorMatches.length : 0;
}

function extractKeywords(content: string): string | undefined {
  // Elsevier style
  const kwMatch1 = extractBetweenEnvironment(content, "keyword");
  if (kwMatch1) return kwMatch1;

  // Generic style
  const kwMatch2 = extractBetweenCommands(content, "\\keywords{");
  if (kwMatch2) return kwMatch2;

  // IEEE style
  const kwMatch3 = extractBetweenEnvironment(content, "IEEEkeywords");
  if (kwMatch3) return kwMatch3;

  return undefined;
}

function extractPackages(content: string): string[] {
  const packageMatches = content.matchAll(/\\usepackage(\[.*?\])?\{([^}]+)\}/g);
  const packages: string[] = [];

  for (const match of packageMatches) {
    packages.push(match[2]);
  }

  return packages;
}
