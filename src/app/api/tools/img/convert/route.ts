import { NextRequest, NextResponse } from "next/server";
import {
  convertImage,
  detectImageFormat,
  validateImageFormat,
  type ImageFormat,
} from "@/lib/img/engine";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fromFormat = formData.get("from") as string | null;
    const toFormat = formData.get("to") as string | null;
    const width = formData.get("width") as string | null;
    const height = formData.get("height") as string | null;
    const quality = formData.get("quality") as string | null;
    const bgColor = formData.get("bgColor") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!toFormat || !validateImageFormat(toFormat)) {
      return NextResponse.json(
        { error: "Invalid output format" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect input format if not provided
    const detectedFormat = fromFormat || detectImageFormat(buffer);
    if (detectedFormat === "unknown") {
      return NextResponse.json(
        { error: "Unsupported input format" },
        { status: 400 }
      );
    }

    // Convert image with high quality settings
    const result = await convertImage(buffer, detectedFormat as ImageFormat, {
      format: toFormat as ImageFormat,
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality: quality ? parseInt(quality) : 95,
      backgroundColor: bgColor || undefined,
      lossless: false,
      effort: 6,
    });

    // Log conversion to database
    await prisma.conversionJob.create({
      data: {
        resourceSlug: "img",
        inputFormat: detectedFormat,
        outputFormat: toFormat,
        status: "COMPLETED",
        sourceName: file.name,
        sourceSize: buffer.length,
        entryCount: 1,
        warningCount: 0,
        errorCount: 0,
        durationMs: result.processingTime,
        metadata: {
          width: result.width,
          height: result.height,
          outputSize: result.size,
          options: {
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null,
            quality: quality ? parseInt(quality) : null,
            backgroundColor: bgColor,
          },
        },
      },
    });

    // Return converted image with proper content type
    const contentType: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml",
      ico: "image/x-icon",
      gif: "image/gif",
      bmp: "image/bmp",
      tiff: "image/tiff",
    };

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": contentType[toFormat] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.name.replace(
          /\.[^.]+$/,
          ""
        )}.${toFormat}"`,
        "X-Processing-Time": result.processingTime.toString(),
        "X-Output-Size": result.size.toString(),
        "X-Dimensions": `${result.width}x${result.height}`,
      },
    });
  } catch (error) {
    console.error("Image conversion error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Conversion failed",
      },
      { status: 500 }
    );
  }
}
