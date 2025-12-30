import { NextRequest, NextResponse } from "next/server";
import {
  convertDocument,
  detectDocumentFormat,
  validateDocumentFormat,
  isConversionSupported,
  type DocumentFormat,
} from "@/lib/doc/engine-remote";
import { getConversionBySlug, formats } from "@/lib/doc/conversions-config";
import { getDocumentTool } from "@/lib/doc/tools-config";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fromFormat = formData.get("from") as string | null;
    const toFormat = formData.get("to") as string | null;
    const conversionSlug = formData.get("slug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine formats
    let inputFormat: DocumentFormat;
    let outputFormat: DocumentFormat;

    if (conversionSlug) {
      // First check tools-config (e.g., pdf-to-word)
      const tool = getDocumentTool(conversionSlug);
      if (tool) {
        // Get format from tool config
        inputFormat = tool.inputFormat[0] as DocumentFormat;
        outputFormat = tool.outputFormat[0] as DocumentFormat;
      } else {
        // Try conversions-config
        const conversion = getConversionBySlug(conversionSlug);
        if (!conversion) {
          return NextResponse.json(
            { error: "Invalid conversion type" },
            { status: 400 }
          );
        }
        inputFormat = conversion.from.id as DocumentFormat;
        outputFormat = conversion.to.id as DocumentFormat;
      }
    } else {
      // Manual format specification
      if (!toFormat || !validateDocumentFormat(toFormat)) {
        return NextResponse.json(
          { error: "Invalid output format" },
          { status: 400 }
        );
      }

      // Detect input format if not provided
      const detected = fromFormat || detectDocumentFormat(buffer, file.name);
      if (detected === "unknown" || !validateDocumentFormat(detected)) {
        return NextResponse.json(
          {
            error:
              "Unsupported input format. Please upload a PDF, Word, ODT, RTF, HTML, or TXT file.",
          },
          { status: 400 }
        );
      }

      inputFormat = detected as DocumentFormat;
      outputFormat = toFormat as DocumentFormat;
    }

    // Validate conversion is supported
    if (!isConversionSupported(inputFormat, outputFormat)) {
      return NextResponse.json(
        {
          error: `Conversion from ${inputFormat.toUpperCase()} to ${outputFormat.toUpperCase()} is not supported`,
        },
        { status: 400 }
      );
    }

    // Perform conversion
    const result = await convertDocument(buffer, inputFormat, {
      format: outputFormat,
      quality: "high",
      preserveFormatting: true,
    });

    // Log conversion to database
    try {
      await prisma.conversionJob.create({
        data: {
          resourceSlug: "doc",
          inputFormat: inputFormat,
          outputFormat: outputFormat,
          status: "COMPLETED",
          sourceName: file.name,
          sourceSize: buffer.length,
          entryCount: 1,
          warningCount: result.warnings.length,
          errorCount: 0,
          durationMs: result.processingTime,
          metadata: {
            outputSize: result.size,
            pages: result.pages,
            warnings: result.warnings,
          },
        },
      });
    } catch (dbError) {
      // Log error but don't fail the conversion
      console.error("Failed to log conversion:", dbError);
    }

    // Get MIME type for output
    const outputMime =
      formats[outputFormat]?.mime || "application/octet-stream";
    const outputExt = formats[outputFormat]?.ext || `.${outputFormat}`;

    // Generate output filename
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const outputFilename = `${baseName}${outputExt}`;

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": outputMime,
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "X-Processing-Time": String(result.processingTime),
        "X-Output-Size": String(result.size),
        "X-Warnings": String(result.warnings.length),
      },
    });
  } catch (error) {
    console.error("Document conversion error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Conversion failed";

    // Log failed conversion
    try {
      await prisma.conversionJob.create({
        data: {
          resourceSlug: "doc",
          inputFormat: "unknown",
          outputFormat: "unknown",
          status: "FAILED",
          sourceName: "unknown",
          sourceSize: 0,
          entryCount: 0,
          warningCount: 0,
          errorCount: 1,
          durationMs: Date.now() - startTime,
          metadata: {
            error: errorMessage,
          },
        },
      });
    } catch {
      // Ignore database errors
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET endpoint to check conversion status and supported formats
export async function GET() {
  return NextResponse.json({
    status: "ok",
    supportedFormats: Object.keys(formats),
    message: "Document conversion API is ready",
  });
}
