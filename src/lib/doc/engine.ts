// Document Conversion Engine
// Supports PDF to Word, Word to PDF, and other document conversions
// Uses LibreOffice for high-quality document conversion on the server

import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";

export type DocumentFormat =
  | "pdf"
  | "docx"
  | "doc"
  | "odt"
  | "rtf"
  | "txt"
  | "html";

export interface DocumentConversionOptions {
  format: DocumentFormat;
  quality?: "draft" | "standard" | "high";
  preserveFormatting?: boolean;
  embedFonts?: boolean;
  ocrEnabled?: boolean;
}

export interface DocumentConversionResult {
  buffer: Buffer;
  format: DocumentFormat;
  pages?: number;
  size: number;
  processingTime: number;
  warnings: string[];
}

// Check if LibreOffice is available
async function findLibreOffice(): Promise<string | null> {
  const possiblePaths = [
    // macOS
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    // Linux
    "/usr/bin/libreoffice",
    "/usr/bin/soffice",
    "/usr/local/bin/libreoffice",
    // Windows
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ];

  for (const loPath of possiblePaths) {
    try {
      await fs.access(loPath);
      return loPath;
    } catch {
      // Path doesn't exist, continue
    }
  }

  // Try to find via which command
  return new Promise((resolve) => {
    const which = spawn("which", ["libreoffice"]);
    let output = "";
    which.stdout.on("data", (data) => {
      output += data.toString();
    });
    which.on("close", (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim());
      } else {
        resolve(null);
      }
    });
    which.on("error", () => resolve(null));
  });
}

// Convert using LibreOffice
async function convertWithLibreOffice(
  inputBuffer: Buffer,
  inputExt: string,
  outputFormat: DocumentFormat,
  _options: DocumentConversionOptions
): Promise<DocumentConversionResult> {
  const start = Date.now();
  const warnings: string[] = [];

  const loPath = await findLibreOffice();
  if (!loPath) {
    throw new Error(
      "LibreOffice not found. Please install LibreOffice for document conversion."
    );
  }

  // Create temp directory
  const tempDir = path.join(os.tmpdir(), `doc-convert-${randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const inputFile = path.join(tempDir, `input${inputExt}`);
  const outputDir = tempDir;

  try {
    // Write input file
    await fs.writeFile(inputFile, inputBuffer);

    // Map output format to LibreOffice filter
    const filterMap: Record<DocumentFormat, string> = {
      pdf: "pdf",
      docx: "docx",
      doc: "doc",
      odt: "odt",
      rtf: "rtf",
      txt: "txt",
      html: "html",
    };

    const filter = filterMap[outputFormat];
    if (!filter) {
      throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    // Run LibreOffice conversion
    await new Promise<void>((resolve, reject) => {
      const args = [
        "--headless",
        "--convert-to",
        filter,
        "--outdir",
        outputDir,
        inputFile,
      ];

      const proc = spawn(loPath, args);

      let stderr = "";
      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`LibreOffice conversion failed: ${stderr}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to start LibreOffice: ${err.message}`));
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        proc.kill();
        reject(new Error("Conversion timeout"));
      }, 60000);
    });

    // Find output file
    const files = await fs.readdir(outputDir);
    const outputFile = files.find(
      (f) =>
        f.startsWith("input.") &&
        f !== `input${inputExt}` &&
        !f.endsWith(inputExt)
    );

    if (!outputFile) {
      throw new Error("Conversion produced no output file");
    }

    const outputPath = path.join(outputDir, outputFile);
    const buffer = await fs.readFile(outputPath);

    return {
      buffer,
      format: outputFormat,
      size: buffer.length,
      processingTime: Date.now() - start,
      warnings,
    };
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Detect document format from buffer
export function detectDocumentFormat(
  buffer: Buffer,
  filename?: string
): DocumentFormat | "unknown" {
  // Check magic bytes
  const header = buffer.subarray(0, 8);

  // PDF: starts with %PDF
  if (header.toString("ascii").startsWith("%PDF")) {
    return "pdf";
  }

  // ZIP-based formats (docx, odt)
  if (header[0] === 0x50 && header[1] === 0x4b) {
    // Check for specific signatures inside
    const content = buffer.toString("utf8", 0, 2000);
    if (content.includes("word/document.xml") || filename?.endsWith(".docx")) {
      return "docx";
    }
    if (content.includes("content.xml") || filename?.endsWith(".odt")) {
      return "odt";
    }
  }

  // RTF: starts with {\rtf
  if (buffer.toString("ascii", 0, 5) === "{\\rtf") {
    return "rtf";
  }

  // DOC (older format): D0 CF 11 E0
  if (
    header[0] === 0xd0 &&
    header[1] === 0xcf &&
    header[2] === 0x11 &&
    header[3] === 0xe0
  ) {
    return "doc";
  }

  // HTML
  const start = buffer.toString("utf8", 0, 100).toLowerCase();
  if (
    start.includes("<!doctype html") ||
    start.includes("<html") ||
    start.includes("<?xml")
  ) {
    return "html";
  }

  // Fallback to filename extension
  if (filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    if (["pdf", "docx", "doc", "odt", "rtf", "txt", "html"].includes(ext)) {
      return ext as DocumentFormat;
    }
  }

  // Assume plain text
  return "txt";
}

// Validate document format
export function validateDocumentFormat(
  format: string
): format is DocumentFormat {
  return ["pdf", "docx", "doc", "odt", "rtf", "txt", "html"].includes(format);
}

// Main conversion function
export async function convertDocument(
  inputBuffer: Buffer,
  fromFormat: DocumentFormat,
  options: DocumentConversionOptions
): Promise<DocumentConversionResult> {
  try {
    // Use LibreOffice for conversion
    const inputExt = `.${fromFormat}`;
    const result = await convertWithLibreOffice(
      inputBuffer,
      inputExt,
      options.format,
      options
    );

    return result;
  } catch (error) {
    throw new Error(
      `Document conversion failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Get supported conversions
export function getSupportedConversions(): Array<{
  from: DocumentFormat;
  to: DocumentFormat[];
}> {
  return [
    { from: "pdf", to: ["docx", "doc", "odt", "rtf", "txt", "html"] },
    { from: "docx", to: ["pdf", "odt", "rtf", "txt", "html"] },
    { from: "doc", to: ["pdf", "docx", "odt", "rtf", "txt", "html"] },
    { from: "odt", to: ["pdf", "docx", "doc", "rtf", "txt", "html"] },
    { from: "rtf", to: ["pdf", "docx", "odt", "txt", "html"] },
    { from: "html", to: ["pdf", "docx", "odt", "rtf", "txt"] },
    { from: "txt", to: ["pdf", "docx", "odt", "rtf", "html"] },
  ];
}

// Check if conversion is supported
export function isConversionSupported(
  from: DocumentFormat,
  to: DocumentFormat
): boolean {
  const supported = getSupportedConversions().find((c) => c.from === from);
  return supported ? supported.to.includes(to) : false;
}
