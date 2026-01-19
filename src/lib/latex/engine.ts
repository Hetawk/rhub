// LaTeX Conversion Engine
// Handles the complete conversion pipeline from LaTeX to Word

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { ZipContents, resolveAssetPaths, validateAssets } from "./zip-handler";
import { detectJournalType } from "./journal-detector";
import { DEFAULT_SETTINGS } from "./types";
import type { ConversionResult, JournalDetectionResult } from "./types";

export interface ConversionContext {
  zipContents: ZipContents;
  journalDetection: JournalDetectionResult;
  tempDir: string;
  outputPath: string;
  manualJournal?: string;
}

/**
 * Main conversion engine
 * Orchestrates the complete LaTeX to Word conversion process
 */
export async function convertLatexToWord(
  context: ConversionContext
): Promise<ConversionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    // Step 1: Validate assets
    const assets = resolveAssetPaths(
      context.zipContents.mainTexContent,
      context.zipContents.workingDir
    );

    const validation = await validateAssets(
      assets,
      context.zipContents.workingDir,
      context.zipContents.allFiles
    );

    warnings.push(...validation.warnings);

    if (validation.missing.length > 0) {
      warnings.push(`Missing assets: ${validation.missing.join(", ")}`);
    }

    // Step 2: Select appropriate template
    const templatePath = await selectTemplate(
      context.journalDetection,
      context.manualJournal
    );

    // Step 3: Prepare Pandoc command
    const outputFile = path.join(context.outputPath, "output.docx");

    // Step 4: Run Pandoc conversion
    await runPandocConversion(
      context.zipContents.mainTexFile,
      outputFile,
      context.zipContents.workingDir,
      templatePath,
      warnings
    );

    // Step 5: Gather statistics
    const stats = await gatherConversionStats(
      outputFile,
      context.zipContents,
      assets
    );

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      outputFile,
      outputSize: stats.outputSize,
      detectedJournal: context.journalDetection.journalType,
      documentClass: context.journalDetection.documentClass,
      bibEntryCount: stats.bibEntryCount,
      figureCount: assets.figures.length,
      tableCount: stats.tableCount,
      warningCount: warnings.length,
      warnings,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    return {
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "Unknown conversion error",
      warnings,
      durationMs,
    };
  }
}

/**
 * Selects the appropriate Pandoc template based on journal type
 */
async function selectTemplate(
  detection: JournalDetectionResult,
  manualJournal?: string
): Promise<string | null> {
  // If manual journal specified, try to find its template
  if (manualJournal) {
    // TODO: Query database for journal template
    // For now, fall through to detection-based selection
  }

  // Map journal types to template files
  const templateMap: Record<string, string> = {
    ELSEVIER: "elsevier_publication.yaml",
    SPRINGER_NATURE: "springer_publication.yaml",
    IEEE: "ieee_publication.yaml",
    ACM: "acm_publication.yaml",
    GENERIC: "generic_publication.yaml",
  };

  const templateName =
    templateMap[detection.journalType] || "generic_publication.yaml";
  const templatePath = path.join(
    process.cwd(),
    "src/lib/latex/templates",
    templateName
  );

  // Check if template exists, otherwise return null (Pandoc will use defaults)
  try {
    await fs.access(templatePath);
    return templatePath;
  } catch {
    return null;
  }
}

/**
 * Runs Pandoc subprocess for LaTeX to DOCX conversion
 */
async function runPandocConversion(
  inputFile: string,
  outputFile: string,
  workingDir: string,
  templatePath: string | null,
  warnings: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Build Pandoc command
    const args = [
      inputFile,
      "-o",
      outputFile,
      "--from=latex",
      "--to=docx",
      "--standalone",
      "--bibliography-style=ieee",
      "--citeproc",
      "--number-sections",
      "--toc",
      "--reference-links",
    ];

    // Add template if available
    if (templatePath) {
      args.push("--metadata-file", templatePath);
    }

    // Add default settings
    args.push(
      "--variable",
      `mainfont=${DEFAULT_SETTINGS.fontFamily}`,
      "--variable",
      `fontsize=${DEFAULT_SETTINGS.fontSize}pt`,
      "--variable",
      `linestretch=${DEFAULT_SETTINGS.lineSpacing}`
    );

    // Execute Pandoc
    const pandoc = spawn("pandoc", args, {
      cwd: workingDir,
      env: process.env,
    });

    let stderr = "";

    pandoc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pandoc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Pandoc conversion failed: ${stderr}`));
      } else {
        // Parse Pandoc warnings from stderr
        if (stderr) {
          const warningLines = stderr
            .split("\n")
            .filter(
              (line) => line.includes("warning") || line.includes("Warning")
            )
            .slice(0, 10); // Limit to first 10 warnings

          warnings.push(...warningLines);
        }

        resolve();
      }
    });

    pandoc.on("error", (error) => {
      reject(new Error(`Failed to spawn Pandoc: ${error.message}`));
    });
  });
}

/**
 * Gathers statistics about the conversion
 */
async function gatherConversionStats(
  outputFile: string,
  zipContents: ZipContents,
  _assets: { figures: string[]; inputs: string[]; bibliographies: string[] }
): Promise<{
  outputSize: number;
  bibEntryCount: number;
  tableCount: number;
}> {
  const stats = await fs.stat(outputFile);

  // Count bibliography entries
  let bibEntryCount = 0;
  for (const bibFile of zipContents.bibFiles) {
    try {
      const content = await fs.readFile(bibFile, "utf-8");
      const entries = content.match(/@\w+\{/g);
      bibEntryCount += entries ? entries.length : 0;
    } catch {
      // Skip files that can't be read
    }
  }

  // Count tables (approximate from LaTeX content)
  const tableMatches = zipContents.mainTexContent.match(/\\begin\{table\*?\}/g);
  const tableCount = tableMatches ? tableMatches.length : 0;

  return {
    outputSize: stats.size,
    bibEntryCount,
    tableCount,
  };
}

/**
 * Checks if Pandoc is installed
 */
export async function checkPandocInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const pandoc = spawn("pandoc", ["--version"]);

    pandoc.on("close", (code) => {
      resolve(code === 0);
    });

    pandoc.on("error", () => {
      resolve(false);
    });
  });
}
