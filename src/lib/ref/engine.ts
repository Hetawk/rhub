import { detectFormat } from "./format-detector";
import { parseXmlToReferences } from "./xml-parser";
import { parseRisToReferences } from "./ris-parser";
import type {
  ConversionOptions,
  ConversionResult,
  ReferenceEntry,
} from "./types";

export async function runConversion(
  content: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const format = detectFormat(content);
  let references: ReferenceEntry[] = [];

  switch (format) {
    case "xml":
    case "endnote":
      references = parseXmlToReferences(content, options, warnings);
      break;
    case "ris":
      references = parseRisToReferences(content, options, warnings);
      break;
    default:
      warnings.push(
        "Unsupported format detected. Provide EndNote XML or RIS exports."
      );
  }

  if (references.length === 0) {
    return {
      bibtex: "",
      entryCount: 0,
      warnings,
      processingTime: Date.now() - start,
      format,
    };
  }

  const style = options.citationStyle ?? "bibtex";
  const bibtex = references
    .map((entry) => formatEntry(entry, style))
    .join("\n\n");

  return {
    bibtex,
    entryCount: references.length,
    warnings,
    processingTime: Date.now() - start,
    format,
  };
}

function formatEntry(
  entry: ReferenceEntry,
  style: ConversionOptions["citationStyle"]
) {
  const { type = "misc", id = "ref", ...fields } = entry;

  if (style === "biblatex") {
    if (fields.journal) {
      fields.journaltitle = fields.journal;
      delete fields.journal;
    }
    if (fields.address) {
      fields.location = fields.address;
      delete fields.address;
    }
  }

  const formattedFields = Object.entries(fields)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([key, value]) => `  ${key} = {${value}}`)
    .join(",\n");

  return `@${type}{${id},\n${formattedFields}\n}`;
}
