import { NextRequest, NextResponse } from "next/server";
import { downloadVideo, getVideoInfo } from "@/lib/vid/engine";
import { validateUrl, getPlatformById } from "@/lib/vid/platforms-config";
import { prisma } from "@/lib/prisma";
import type { VideoQuality, AudioQuality } from "@/lib/vid/platforms-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, formatId, qualityId, action } = body as {
      url?: string;
      formatId?: string;
      qualityId?: string;
      action?: "info" | "download";
    };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL and detect platform
    const validation = validateUrl(url);
    if (!validation.valid || !validation.platform) {
      return NextResponse.json(
        { error: validation.error || "Invalid URL" },
        { status: 400 }
      );
    }

    const { platform, videoId } = validation;

    // Handle info request
    if (action === "info") {
      const info = await getVideoInfo(url, platform);
      return NextResponse.json(info);
    }

    // Handle download request
    if (!formatId || !qualityId) {
      return NextResponse.json(
        { error: "Format and quality are required for download" },
        { status: 400 }
      );
    }

    const format = platform.supportedFormats.find((f) => f.id === formatId);
    if (!format) {
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 400 }
      );
    }

    const quality =
      format.type === "video"
        ? platform.videoQualities.find((q) => q.id === qualityId)
        : platform.audioQualities.find((q) => q.id === qualityId);

    if (!quality) {
      return NextResponse.json(
        { error: "Unsupported quality" },
        { status: 400 }
      );
    }

    // Download video
    const result = await downloadVideo({
      url,
      platform,
      format,
      quality: quality as VideoQuality | AudioQuality,
      videoId: videoId!,
    });

    // Log download to database
    await prisma.conversionJob.create({
      data: {
        resourceSlug: `vid-${platform.id}`,
        inputFormat: platform.name,
        outputFormat: format.id,
        status: "COMPLETED",
        sourceName: result.metadata.title || "video",
        sourceSize: result.size,
        entryCount: 1,
        warningCount: 0,
        errorCount: 0,
        durationMs: result.processingTime,
        metadata: {
          platform: platform.name,
          formatType: format.type,
          quality: qualityId,
          duration: result.duration,
          author: result.metadata.author,
          views: result.metadata.views,
        },
      },
    });

    // Return video file
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": format.mime,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "X-Processing-Time": result.processingTime.toString(),
        "X-File-Size": result.size.toString(),
        "X-Duration": result.duration?.toString() || "0",
        "X-Platform": platform.name,
      },
    });
  } catch (error) {
    console.error("Video download error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Download failed",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for video info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const platformId = searchParams.get("platform");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let platform;
    if (platformId) {
      platform = getPlatformById(platformId);
      if (!platform) {
        return NextResponse.json(
          { error: "Invalid platform" },
          { status: 400 }
        );
      }
    } else {
      const validation = validateUrl(url);
      if (!validation.valid || !validation.platform) {
        return NextResponse.json(
          { error: validation.error || "Invalid URL" },
          { status: 400 }
        );
      }
      platform = validation.platform;
    }

    const info = await getVideoInfo(url, platform);
    return NextResponse.json(info);
  } catch (error) {
    console.error("Get video info error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get info",
      },
      { status: 500 }
    );
  }
}
