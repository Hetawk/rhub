// API Route: /api/tools/latex/convert
// Handles LaTeX to Word conversion requests

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { extractAndAnalyzeZip, cleanupTempDir } from "@/lib/latex/zip-handler";
import {
  convertLatexToWord,
  checkPandocInstalled,
  ensureRemoteTemplates,
} from "@/lib/latex/engine-remote";
import { detectJournalType } from "@/lib/latex/journal-detector";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for single .tex
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB for ZIP
const CONVERSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    // Check if Pandoc is installed on remote server
    const pandocInstalled = await checkPandocInstalled();
    if (!pandocInstalled) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pandoc is not installed on the remote server. Please contact support.",
        },
        { status: 500 }
      );
    }

    // Ensure remote templates are uploaded (idempotent operation)
    const templatesResult = await ensureRemoteTemplates();
    if (!templatesResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to setup remote templates: ${templatesResult.error}`,
        },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const manualJournal = formData.get("manualJournal") as string | undefined;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isZip = fileName.endsWith(".zip");
    const isTex = fileName.endsWith(".tex") || fileName.endsWith(".latex");

    if (!isZip && !isTex) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid file type. Please upload a .tex, .latex, or .zip file.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = isZip ? MAX_ZIP_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${
            maxSize / (1024 * 1024)
          }MB.`,
        },
        { status: 400 }
      );
    }

    // Create temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "latex-convert-"));
    const outputDir = path.join(tempDir, "output");
    await fs.mkdir(outputDir);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Handle ZIP or single .tex file
    let zipContents;

    if (isZip) {
      // Extract and analyze ZIP
      zipContents = await extractAndAnalyzeZip(buffer, tempDir);
    } else {
      // Handle single .tex file
      const texPath = path.join(tempDir, file.name);
      await fs.writeFile(texPath, buffer);

      const texContent = buffer.toString("utf-8");

      zipContents = {
        mainTexFile: texPath,
        mainTexContent: texContent,
        workingDir: tempDir,
        allFiles: [texPath],
        texFiles: [texPath],
        bibFiles: [],
        figureFiles: [],
        styleFiles: [],
      };
    }

    // Detect journal type
    const journalDetection = detectJournalType(zipContents.mainTexContent);

    // Run conversion with timeout
    const conversionPromise = convertLatexToWord({
      zipContents,
      journalDetection,
      tempDir,
      outputPath: outputDir,
      manualJournal,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Conversion timeout exceeded (5 minutes)"));
      }, CONVERSION_TIMEOUT);
    });

    const result = await Promise.race([conversionPromise, timeoutPromise]);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage,
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }

    // Read the output file
    const outputFile = result.outputFile!;
    const outputBuffer = await fs.readFile(outputFile);

    // TODO: Store conversion in database
    // const conversion = await prisma.laTeXConversion.create({ ... });

    // Return file as download
    const response = new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="converted_${Date.now()}.docx"`,
        "Content-Length": outputBuffer.length.toString(),
      },
    });

    // Cleanup temp directory after response
    if (tempDir) {
      cleanupTempDir(tempDir).catch(console.error);
    }

    return response;
  } catch (error) {
    console.error("Conversion error:", error);

    // Cleanup on error
    if (tempDir) {
      cleanupTempDir(tempDir).catch(console.error);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Conversion failed",
      },
      { status: 500 }
    );
  }
}
