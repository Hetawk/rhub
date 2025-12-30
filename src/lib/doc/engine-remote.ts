// Document Conversion Engine - Remote Execution via TTYD Terminal
// Executes LibreOffice on VPS server instead of locally
// Follows the same pattern as latex/engine-remote.ts

import { executeRemoteCommand } from "@/lib/terminal/client";

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

// Remote work directory on VPS
const REMOTE_WORK_DIR = "/tmp/doc_conversions";

/**
 * Checks if LibreOffice is installed on the remote server
 */
export async function checkRemoteLibreOfficeInstalled(): Promise<{
  installed: boolean;
  version?: string;
  error?: string;
}> {
  const result = await executeRemoteCommand({
    command:
      "libreoffice --version 2>/dev/null || soffice --version 2>/dev/null | head -1",
    timeout: 15000,
  });

  if (!result.success || !result.output?.includes("LibreOffice")) {
    return {
      installed: false,
      error: result.error || "LibreOffice not found on remote server",
    };
  }

  return {
    installed: true,
    version: result.output.trim(),
  };
}

/**
 * Sets up remote directory structure for document conversion
 */
async function setupRemoteEnvironment(remoteWorkDir: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Create all directories in one command for reliability
  const setupCommand = `mkdir -p "${remoteWorkDir}/input" "${remoteWorkDir}/output" && chmod -R 755 "${remoteWorkDir}"`;

  const result = await executeRemoteCommand({
    command: setupCommand,
    timeout: 15000,
  });

  if (!result.success) {
    return {
      success: false,
      error: `Setup failed: ${result.error || result.output}`,
    };
  }

  // Verify directories exist
  const verifyResult = await executeRemoteCommand({
    command: `test -d "${remoteWorkDir}/input" && test -d "${remoteWorkDir}/output" && echo "OK"`,
    timeout: 5000,
  });

  if (!verifyResult.success || !verifyResult.output?.includes("OK")) {
    return {
      success: false,
      error:
        "Directory verification failed - directories may not have been created",
    };
  }

  return { success: true };
}

/**
 * Uploads file to remote server using base64 encoding
 * Uses a more reliable approach with proper file creation and chunking
 */
async function uploadFileToRemote(
  buffer: Buffer,
  remotePath: string
): Promise<{ success: boolean; error?: string }> {
  const base64Content = buffer.toString("base64");

  // For large files, we need to chunk the upload
  const chunkSize = 32000; // ~32KB chunks to be safe with command line limits

  if (base64Content.length > chunkSize) {
    // Create empty file first using touch (more reliable than >)
    const createResult = await executeRemoteCommand({
      command: `touch "${remotePath}.b64" && chmod 644 "${remotePath}.b64"`,
      timeout: 10000,
    });

    if (!createResult.success) {
      return {
        success: false,
        error: `Failed to create file: ${
          createResult.error || createResult.output
        }`,
      };
    }

    // Upload in chunks using printf (more reliable than echo -n)
    const totalChunks = Math.ceil(base64Content.length / chunkSize);
    for (let i = 0; i < base64Content.length; i += chunkSize) {
      const chunk = base64Content.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;

      // Use printf with proper escaping - avoid special characters in shell
      const appendResult = await executeRemoteCommand({
        command: `printf '%s' '${chunk}' >> "${remotePath}.b64"`,
        timeout: 30000,
      });

      if (!appendResult.success) {
        // Cleanup on failure
        await executeRemoteCommand({
          command: `rm -f "${remotePath}.b64"`,
          timeout: 5000,
        });
        return {
          success: false,
          error: `Failed to upload chunk ${chunkNum}/${totalChunks}: ${
            appendResult.error || appendResult.output
          }`,
        };
      }
    }

    // Decode the complete base64 file
    const decodeResult = await executeRemoteCommand({
      command: `base64 -d "${remotePath}.b64" > "${remotePath}" && rm -f "${remotePath}.b64"`,
      timeout: 60000,
    });

    if (!decodeResult.success) {
      return {
        success: false,
        error: `Failed to decode uploaded file: ${
          decodeResult.error || decodeResult.output
        }`,
      };
    }
  } else {
    // Small file - upload in one go using printf
    const uploadResult = await executeRemoteCommand({
      command: `printf '%s' '${base64Content}' | base64 -d > "${remotePath}"`,
      timeout: 30000,
    });

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || "Upload failed" };
    }
  }

  // Verify the file was created and has content
  const verifyResult = await executeRemoteCommand({
    command: `test -f "${remotePath}" && test -s "${remotePath}" && echo "OK"`,
    timeout: 5000,
  });

  if (!verifyResult.success || !verifyResult.output?.includes("OK")) {
    return {
      success: false,
      error: "File verification failed - file may be empty or not created",
    };
  }

  return { success: true };
}

/**
 * Downloads converted file from remote server
 */
async function downloadFileFromRemote(
  remotePath: string
): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
  // Get file as base64
  const result = await executeRemoteCommand({
    command: `base64 "${remotePath}" | tr -d '\\n'`,
    timeout: 60000,
  });

  if (!result.success || !result.output) {
    return { success: false, error: result.error || "Download failed" };
  }

  try {
    const buffer = Buffer.from(result.output.trim(), "base64");
    return { success: true, buffer };
  } catch (error) {
    return {
      success: false,
      error: `Failed to decode file: ${
        error instanceof Error ? error.message : "Unknown"
      }`,
    };
  }
}

/**
 * Runs LibreOffice conversion on remote server
 */
async function runRemoteLibreOfficeConversion(
  remoteWorkDir: string,
  inputFilename: string,
  outputFormat: DocumentFormat,
  warnings: string[]
): Promise<{ success: boolean; outputFile?: string; error?: string }> {
  const inputPath = `${remoteWorkDir}/input/${inputFilename}`;
  const outputDir = `${remoteWorkDir}/output`;

  // Map format to LibreOffice filter
  const filterMap: Record<DocumentFormat, string> = {
    pdf: "pdf",
    docx: "docx:MS Word 2007 XML",
    doc: "doc:MS Word 97",
    odt: "odt",
    rtf: "rtf",
    txt: "txt:Text",
    html: "html",
  };

  const filter = filterMap[outputFormat] || outputFormat;

  // Run LibreOffice conversion
  const conversionCommand = `cd ${outputDir} && libreoffice --headless --convert-to "${filter}" --outdir "${outputDir}" "${inputPath}" 2>&1`;

  const result = await executeRemoteCommand({
    command: conversionCommand,
    timeout: 120000, // 2 minute timeout for large documents
  });

  if (!result.success) {
    // Try with soffice as fallback
    const fallbackCommand = `cd ${outputDir} && soffice --headless --convert-to "${filter}" --outdir "${outputDir}" "${inputPath}" 2>&1`;
    const fallbackResult = await executeRemoteCommand({
      command: fallbackCommand,
      timeout: 120000,
    });

    if (!fallbackResult.success) {
      return {
        success: false,
        error: `LibreOffice conversion failed: ${
          result.output || result.error
        }`,
      };
    }

    if (fallbackResult.output) {
      warnings.push(`LibreOffice output: ${fallbackResult.output}`);
    }
  } else if (result.output) {
    // Check for warnings in output
    if (result.output.toLowerCase().includes("warning")) {
      warnings.push(`LibreOffice: ${result.output}`);
    }
  }

  // Find the output file
  const findResult = await executeRemoteCommand({
    command: `ls -1 ${outputDir}/ | head -1`,
    timeout: 10000,
  });

  if (!findResult.success || !findResult.output?.trim()) {
    return { success: false, error: "No output file produced" };
  }

  const outputFilename = findResult.output.trim();
  return {
    success: true,
    outputFile: `${outputDir}/${outputFilename}`,
  };
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
 * Main conversion function - executes on remote VPS server
 */
export async function convertDocument(
  inputBuffer: Buffer,
  fromFormat: DocumentFormat,
  options: DocumentConversionOptions
): Promise<DocumentConversionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Generate unique session ID
  const sessionId = `doc_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}`;
  const remoteWorkDir = `${REMOTE_WORK_DIR}/${sessionId}`;

  try {
    // Step 1: Check if LibreOffice is available on remote server
    const loCheck = await checkRemoteLibreOfficeInstalled();
    if (!loCheck.installed) {
      throw new Error(
        "LibreOffice not found on remote server. Please install LibreOffice on the VPS."
      );
    }

    // Step 2: Setup remote environment
    const setupResult = await setupRemoteEnvironment(remoteWorkDir);
    if (!setupResult.success) {
      throw new Error(
        `Failed to setup remote environment: ${setupResult.error}`
      );
    }

    // Step 3: Upload input file to remote server
    const inputFilename = `input.${fromFormat}`;
    const remotePath = `${remoteWorkDir}/input/${inputFilename}`;

    const uploadResult = await uploadFileToRemote(inputBuffer, remotePath);
    if (!uploadResult.success) {
      throw new Error(`Failed to upload file: ${uploadResult.error}`);
    }

    // Step 4: Run LibreOffice conversion on remote server
    const conversionResult = await runRemoteLibreOfficeConversion(
      remoteWorkDir,
      inputFilename,
      options.format,
      warnings
    );

    if (!conversionResult.success || !conversionResult.outputFile) {
      throw new Error(conversionResult.error || "Remote conversion failed");
    }

    // Step 5: Download converted file
    const downloadResult = await downloadFileFromRemote(
      conversionResult.outputFile
    );
    if (!downloadResult.success || !downloadResult.buffer) {
      throw new Error(
        `Failed to download converted file: ${downloadResult.error}`
      );
    }

    // Step 6: Cleanup remote directory
    await cleanupRemoteDirectory(remoteWorkDir);

    const processingTime = Date.now() - startTime;

    return {
      buffer: downloadResult.buffer,
      format: options.format,
      size: downloadResult.buffer.length,
      processingTime,
      warnings,
    };
  } catch (error) {
    // Cleanup on error
    await cleanupRemoteDirectory(remoteWorkDir).catch(() => {});

    throw new Error(
      `Document conversion failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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
    const ext = filename.split(".").pop()?.toLowerCase();
    if (
      ext &&
      ["pdf", "docx", "doc", "odt", "rtf", "txt", "html"].includes(ext)
    ) {
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
