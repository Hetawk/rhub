// LaTeX ZIP File Handler
// Handles ZIP extraction, main.tex detection, and asset resolution

import { promises as fs } from "fs";
import path from "path";
import AdmZip from "adm-zip";

export interface ZipContents {
  mainTexFile: string;
  mainTexContent: string;
  workingDir: string;
  allFiles: string[];
  texFiles: string[];
  bibFiles: string[];
  figureFiles: string[];
  styleFiles: string[];
}

/**
 * Extracts ZIP file and identifies the main LaTeX file
 */
export async function extractAndAnalyzeZip(
  zipBuffer: Buffer,
  tempDir: string
): Promise<ZipContents> {
  try {
    // Extract ZIP
    const zip = new AdmZip(zipBuffer);
    const extractPath = path.join(tempDir, "latex_project");

    zip.extractAllTo(extractPath, true);

    // Find all files recursively
    const allFiles = await findAllFiles(extractPath);

    // Categorize files
    const texFiles = allFiles.filter((f) => /\.(tex|latex)$/i.test(f));
    const bibFiles = allFiles.filter((f) => /\.bib$/i.test(f));
    const figureFiles = allFiles.filter((f) =>
      /\.(png|jpg|jpeg|pdf|eps|svg|tif|tiff)$/i.test(f)
    );
    const styleFiles = allFiles.filter((f) => /\.(sty|cls|bst)$/i.test(f));

    // Find main .tex file
    const mainTexFile = await findMainTexFile(texFiles, extractPath);

    if (!mainTexFile) {
      throw new Error(
        "No main LaTeX file found. Please ensure your ZIP contains a main .tex file with \\documentclass"
      );
    }

    // Read main tex content
    const mainTexContent = await fs.readFile(mainTexFile, "utf-8");

    return {
      mainTexFile,
      mainTexContent,
      workingDir: extractPath,
      allFiles,
      texFiles,
      bibFiles,
      figureFiles,
      styleFiles,
    };
  } catch (error) {
    throw new Error(
      `Failed to extract ZIP file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Recursively finds all files in a directory
 */
async function findAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip hidden files and common build directories
      if (
        entry.name.startsWith(".") ||
        ["node_modules", "__pycache__", "build", "dist"].includes(entry.name)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Finds the main .tex file by analyzing content
 * Priority:
 * 1. Files with \documentclass (most reliable)
 * 2. Files named main.tex, paper.tex, document.tex
 * 3. If only one .tex file, use that
 * 4. Largest .tex file (likely the main document)
 */
async function findMainTexFile(
  texFiles: string[],
  _workingDir: string
): Promise<string | null> {
  if (texFiles.length === 0) {
    return null;
  }

  // If only one .tex file, use it
  if (texFiles.length === 1) {
    return texFiles[0];
  }

  // Check for files with \documentclass
  const filesWithDocClass: Array<{
    file: string;
    priority: number;
    size: number;
  }> = [];

  for (const texFile of texFiles) {
    try {
      const content = await fs.readFile(texFile, "utf-8");
      const stats = await fs.stat(texFile);

      // Skip files that are clearly not main documents
      if (content.includes("\\input{") || content.includes("\\include{")) {
        // This might be including the main doc, check for documentclass
        if (!content.includes("\\documentclass")) {
          continue;
        }
      }

      if (content.includes("\\documentclass")) {
        const basename = path.basename(texFile).toLowerCase();
        let priority = 0;

        // Higher priority for common main file names
        if (basename === "main.tex") priority = 100;
        else if (basename === "paper.tex") priority = 90;
        else if (basename === "document.tex") priority = 80;
        else if (basename === "manuscript.tex") priority = 70;
        else if (basename.includes("main")) priority = 60;
        else priority = 50;

        filesWithDocClass.push({
          file: texFile,
          priority,
          size: stats.size,
        });
      }
    } catch {
      // Skip files that can't be read
      continue;
    }
  }

  if (filesWithDocClass.length > 0) {
    // Sort by priority first, then by size
    filesWithDocClass.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.size - a.size;
    });

    return filesWithDocClass[0].file;
  }

  // Fallback: check for common names without documentclass check
  const mainPatterns = [
    "main.tex",
    "paper.tex",
    "document.tex",
    "manuscript.tex",
  ];
  for (const pattern of mainPatterns) {
    const found = texFiles.find(
      (f) => path.basename(f).toLowerCase() === pattern
    );
    if (found) return found;
  }

  // Last resort: return the largest .tex file
  let largestFile = texFiles[0];
  let largestSize = 0;

  for (const texFile of texFiles) {
    try {
      const stats = await fs.stat(texFile);
      if (stats.size > largestSize) {
        largestSize = stats.size;
        largestFile = texFile;
      }
    } catch {
      continue;
    }
  }

  return largestFile;
}

/**
 * Resolves asset paths referenced in LaTeX document
 * Handles \includegraphics, \input, \include, \bibliography
 */
export function resolveAssetPaths(
  texContent: string,
  _workingDir: string
): {
  figures: string[];
  inputs: string[];
  bibliographies: string[];
} {
  const figures: string[] = [];
  const inputs: string[] = [];
  const bibliographies: string[] = [];

  // Match \includegraphics[options]{path}
  const graphicsRegex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
  let match;

  while ((match = graphicsRegex.exec(texContent)) !== null) {
    figures.push(match[1]);
  }

  // Match \input{path} and \include{path}
  const inputRegex = /\\(?:input|include)\{([^}]+)\}/g;

  while ((match = inputRegex.exec(texContent)) !== null) {
    inputs.push(match[1]);
  }

  // Match \bibliography{path}
  const bibRegex = /\\bibliography\{([^}]+)\}/g;

  while ((match = bibRegex.exec(texContent)) !== null) {
    // Bibliography can have multiple comma-separated files
    const bibPaths = match[1].split(",").map((p) => p.trim());
    bibliographies.push(...bibPaths);
  }

  return { figures, inputs, bibliographies };
}

/**
 * Validates that all referenced assets exist
 */
export async function validateAssets(
  assetPaths: { figures: string[]; inputs: string[]; bibliographies: string[] },
  workingDir: string,
  allFiles: string[]
): Promise<{ missing: string[]; warnings: string[] }> {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check figures
  for (const figure of assetPaths.figures) {
    const resolved = await resolveAssetPath(figure, workingDir, allFiles, [
      ".png",
      ".jpg",
      ".jpeg",
      ".pdf",
      ".eps",
      ".svg",
    ]);

    if (!resolved) {
      missing.push(`Figure: ${figure}`);
    }
  }

  // Check input files
  for (const input of assetPaths.inputs) {
    const resolved = await resolveAssetPath(input, workingDir, allFiles, [
      ".tex",
    ]);

    if (!resolved) {
      warnings.push(`Input file not found: ${input}`);
    }
  }

  // Check bibliography files
  for (const bib of assetPaths.bibliographies) {
    const resolved = await resolveAssetPath(bib, workingDir, allFiles, [
      ".bib",
    ]);

    if (!resolved) {
      warnings.push(`Bibliography not found: ${bib}`);
    }
  }

  return { missing, warnings };
}

/**
 * Resolves a single asset path with common LaTeX search patterns
 */
async function resolveAssetPath(
  assetPath: string,
  workingDir: string,
  allFiles: string[],
  extensions: string[]
): Promise<string | null> {
  // Try exact path first
  for (const ext of ["", ...extensions]) {
    const testPath = assetPath + ext;
    const fullPath = path.join(workingDir, testPath);

    if (allFiles.some((f) => f === fullPath)) {
      return fullPath;
    }
  }

  // Try searching all subdirectories
  const basename = path.basename(assetPath);

  for (const ext of ["", ...extensions]) {
    const testName = basename + ext;
    const found = allFiles.find((f) => path.basename(f) === testName);

    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Cleanup temporary extraction directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Log but don't throw - cleanup failure shouldn't break conversion
    console.error("Failed to cleanup temp directory:", error);
  }
}
