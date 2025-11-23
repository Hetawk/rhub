// LaTeX Conversion Engine - Remote Execution via TTYD Terminal
// Executes Pandoc on VPS server instead of locally

import { promises as fs } from "fs";
import path from "path";
import { ZipContents, resolveAssetPaths, validateAssets } from "./zip-handler";
import { DEFAULT_SETTINGS } from "./types";
import {
  executeRemoteCommand,
  checkRemotePandocInstalled,
} from "@/lib/terminal/client";
import type { ConversionResult, JournalDetectionResult } from "./types";

export interface ConversionContext {
  zipContents: ZipContents;
  journalDetection: JournalDetectionResult;
  tempDir: string;
  outputPath: string;
  manualJournal?: string;
}

// Use /tmp for both work directory and templates (accessible to all users)
const REMOTE_WORK_DIR = "/tmp/latex_conversions";
const REMOTE_TEMPLATES_DIR = "/tmp/latex_templates";

/**
 * Main conversion engine
 * Orchestrates the complete LaTeX to Word conversion process using remote execution
 */
export async function convertLatexToWord(
  context: ConversionContext
): Promise<ConversionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    // Step 1: Validate assets locally
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

    // Step 2: Create unique remote directory
    const remoteSessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
    const remoteWorkDir = `${REMOTE_WORK_DIR}/${remoteSessionId}`;

    // Step 3: Setup remote environment
    const setupResult = await setupRemoteEnvironment(remoteWorkDir);
    if (!setupResult.success) {
      throw new Error(
        `Failed to setup remote environment: ${setupResult.error}`
      );
    }

    // Step 4: Upload files to remote server
    await uploadFilesToRemote(context.zipContents, remoteWorkDir, warnings);

    // Step 5: Select and prepare template
    const templateName = selectTemplateName(context.journalDetection);

    // Step 6: Run Pandoc conversion remotely
    const conversionResult = await runRemotePandocConversion(
      remoteWorkDir,
      templateName,
      warnings
    );

    if (!conversionResult.success) {
      throw new Error(conversionResult.error || "Remote conversion failed");
    }

    // Step 7: Download converted file
    const outputFile = await downloadConvertedFile(
      remoteWorkDir,
      context.outputPath
    );

    // Step 8: Cleanup remote directory
    await cleanupRemoteDirectory(remoteWorkDir);

    // Step 9: Gather statistics
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
 * Sets up remote directory structure
 */
async function setupRemoteEnvironment(remoteWorkDir: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const commands = [
    `mkdir -p ${remoteWorkDir}`,
    `mkdir -p ${remoteWorkDir}/input`,
    `mkdir -p ${remoteWorkDir}/output`,
    `chmod 755 ${remoteWorkDir}`,
  ];

  for (const command of commands) {
    const result = await executeRemoteCommand({ command, timeout: 10000 });
    if (!result.success) {
      return {
        success: false,
        error: `Setup failed: ${result.output || result.error}`,
      };
    }
  }

  return { success: true };
}

/**
 * Uploads local files to remote server using base64 encoding
 */
async function uploadFilesToRemote(
  zipContents: ZipContents,
  remoteWorkDir: string,
  warnings: string[]
): Promise<void> {
  const filesToUpload = [
    ...zipContents.texFiles,
    ...zipContents.bibFiles,
    ...zipContents.figureFiles,
    ...zipContents.styleFiles,
  ];

  // Upload files in batches to avoid overwhelming the connection
  const batchSize = 5;
  for (let i = 0; i < filesToUpload.length; i += batchSize) {
    const batch = filesToUpload.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (localPath) => {
        try {
          const content = await fs.readFile(localPath);
          const base64Content = content.toString("base64");

          // Get relative path from working directory
          const relativePath = path.relative(zipContents.workingDir, localPath);
          const remotePath = `${remoteWorkDir}/input/${relativePath}`;

          // Create directory structure remotely
          const remoteDir = path.dirname(remotePath);
          await executeRemoteCommand({
            command: `mkdir -p "${remoteDir}"`,
            timeout: 5000,
          });

          // Upload file using base64 encoding (handles binary files)
          const uploadResult = await executeRemoteCommand({
            command: `echo "${base64Content}" | base64 -d > "${remotePath}"`,
            timeout: 30000,
          });

          if (!uploadResult.success) {
            warnings.push(`Failed to upload: ${relativePath}`);
          }
        } catch (error) {
          warnings.push(
            `Error uploading ${localPath}: ${
              error instanceof Error ? error.message : "Unknown"
            }`
          );
        }
      })
    );
  }
}

/**
 * Selects template name based on journal detection
 */
function selectTemplateName(detection: JournalDetectionResult): string {
  const templateMap: Record<string, string> = {
    ELSEVIER: "elsevier_publication.yaml",
    SPRINGER_NATURE: "springer_publication.yaml",
    IEEE: "ieee_publication.yaml",
    ACM: "acm_publication.yaml",
    GENERIC: "generic_publication.yaml",
  };

  return templateMap[detection.journalType] || "generic_publication.yaml";
}

/**
 * Runs Pandoc conversion on remote server
 */
async function runRemotePandocConversion(
  remoteWorkDir: string,
  templateName: string,
  warnings: string[]
): Promise<{ success: boolean; error?: string }> {
  // Find main .tex file in remote directory
  const findMainResult = await executeRemoteCommand({
    command: `find ${remoteWorkDir}/input -name "*.tex" -type f | head -1`,
    timeout: 10000,
  });

  if (!findMainResult.success || !findMainResult.output) {
    return {
      success: false,
      error: "Could not find main .tex file on remote server",
    };
  }

  const mainTexPath = findMainResult.output.trim();
  const outputPath = `${remoteWorkDir}/output/converted.docx`;
  const templatePath = `${REMOTE_TEMPLATES_DIR}/${templateName}`;

  // Build Pandoc command with robust error handling
  const pandocCommand = `
    cd ${remoteWorkDir}/input && \\
    pandoc "${mainTexPath}" \\
      -o "${outputPath}" \\
      --from=latex \\
      --to=docx \\
      --standalone \\
      --citeproc \\
      --number-sections \\
      --toc \\
      --reference-links \\
      --variable mainfont="${DEFAULT_SETTINGS.fontFamily}" \\
      --variable fontsize=${DEFAULT_SETTINGS.fontSize}pt \\
      --variable linestretch=${DEFAULT_SETTINGS.lineSpacing} \\
      ${templatePath && `--metadata-file="${templatePath}"`} \\
      2>&1
  `.trim();

  const conversionResult = await executeRemoteCommand({
    command: pandocCommand,
    timeout: 180000, // 3 minutes for conversion
  });

  // Parse warnings from Pandoc output
  if (conversionResult.output) {
    const warningLines = conversionResult.output
      .split("\n")
      .filter(
        (line) =>
          line.toLowerCase().includes("warning") ||
          line.toLowerCase().includes("error")
      )
      .slice(0, 10);

    warnings.push(...warningLines);
  }

  if (!conversionResult.success) {
    return {
      success: false,
      error: `Pandoc conversion failed: ${
        conversionResult.output || conversionResult.error
      }`,
    };
  }

  // Verify output file was created
  const verifyResult = await executeRemoteCommand({
    command: `test -f "${outputPath}" && echo "exists"`,
    timeout: 5000,
  });

  if (verifyResult.output.trim() !== "exists") {
    return {
      success: false,
      error: "Output file was not created",
    };
  }

  return { success: true };
}

/**
 * Downloads converted DOCX file from remote server
 */
async function downloadConvertedFile(
  remoteWorkDir: string,
  localOutputPath: string
): Promise<string> {
  const remotePath = `${remoteWorkDir}/output/converted.docx`;

  // Download file using base64 encoding
  const downloadResult = await executeRemoteCommand({
    command: `base64 "${remotePath}"`,
    timeout: 60000,
  });

  if (!downloadResult.success) {
    throw new Error("Failed to download converted file from remote server");
  }

  // Decode base64 and save locally
  const buffer = Buffer.from(downloadResult.output, "base64");
  const outputFile = path.join(localOutputPath, "output.docx");

  await fs.writeFile(outputFile, buffer);

  return outputFile;
}

/**
 * Cleans up remote directory after conversion
 */
async function cleanupRemoteDirectory(remoteWorkDir: string): Promise<void> {
  await executeRemoteCommand({
    command: `rm -rf "${remoteWorkDir}"`,
    timeout: 10000,
  });
}

/**
 * Gathers conversion statistics
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

  // Count tables
  const tableMatches = zipContents.mainTexContent.match(/\\begin\{table\*?\}/g);
  const tableCount = tableMatches ? tableMatches.length : 0;

  return {
    outputSize: stats.size,
    bibEntryCount,
    tableCount,
  };
}

/**
 * Checks if Pandoc is installed on remote server
 */
export async function checkPandocInstalled(): Promise<boolean> {
  const result = await checkRemotePandocInstalled();
  return result.installed;
}

/**
 * Ensures remote templates directory exists and templates are uploaded
 */
export async function ensureRemoteTemplates(): Promise<{
  success: boolean;
  error?: string;
}> {
  // Create templates directory
  const mkdirResult = await executeRemoteCommand({
    command: `mkdir -p ${REMOTE_TEMPLATES_DIR}`,
    timeout: 15000,
  });

  if (!mkdirResult.success) {
    return {
      success: false,
      error: "Failed to create remote templates directory",
    };
  }

  // Upload each template file
  const templates = [
    "elsevier_publication.yaml",
    "ieee_publication.yaml",
    "springer_publication.yaml",
    "acm_publication.yaml",
    "generic_publication.yaml",
  ];

  for (const templateName of templates) {
    const localPath = path.join(
      process.cwd(),
      "src/lib/latex/templates",
      templateName
    );

    try {
      const content = await fs.readFile(localPath, "utf-8");
      const base64Content = Buffer.from(content).toString("base64");

      const uploadResult = await executeRemoteCommand({
        command: `echo "${base64Content}" | base64 -d > "${REMOTE_TEMPLATES_DIR}/${templateName}"`,
        timeout: 20000,
      });

      if (!uploadResult.success) {
        return {
          success: false,
          error: `Failed to upload template: ${templateName}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error reading template ${templateName}: ${
          error instanceof Error ? error.message : "Unknown"
        }`,
      };
    }
  }

  return { success: true };
}
