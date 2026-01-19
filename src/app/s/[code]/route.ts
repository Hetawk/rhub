import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Find the short URL by code or custom slug
    const shortUrl = await prisma.shortUrl.findFirst({
      where: {
        OR: [{ shortCode: code }, { customSlug: code }],
        isActive: true,
      },
    });

    if (!shortUrl) {
      // Redirect to 404 page or home with error
      return NextResponse.redirect(new URL("/?error=not-found", request.url));
    }

    // Check if expired
    if (shortUrl.expiresAt && shortUrl.expiresAt < new Date()) {
      return NextResponse.redirect(new URL("/?error=expired", request.url));
    }

    // Update click count and last click time
    await prisma.shortUrl.update({
      where: { id: shortUrl.id },
      data: {
        clicks: { increment: 1 },
        lastClickAt: new Date(),
        metadata: {
          ...(typeof shortUrl.metadata === "object" ? shortUrl.metadata : {}),
          lastUserAgent: request.headers.get("user-agent"),
          lastReferer: request.headers.get("referer"),
        },
      },
    });

    // Redirect to original URL
    return NextResponse.redirect(shortUrl.originalUrl, { status: 302 });
  } catch (error) {
    console.error("Error redirecting short URL:", error);
    return NextResponse.redirect(new URL("/?error=server", request.url));
  }
}
