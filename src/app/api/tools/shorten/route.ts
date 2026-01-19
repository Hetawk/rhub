import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { z } from "zod";

const shortenSchema = z.object({
  url: z.string().url({ message: "Please provide a valid URL" }),
  customSlug: z
    .string()
    .min(3, { message: "Custom slug must be at least 3 characters" })
    .max(50, { message: "Custom slug must be at most 50 characters" })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "Custom slug can only contain letters, numbers, hyphens, and underscores",
    })
    .optional(),
  expiresIn: z.number().positive().optional(), // Days until expiration
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = shortenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { url, customSlug, expiresIn } = validation.data;

    // Check if custom slug is already taken
    if (customSlug) {
      const existing = await prisma.shortUrl.findUnique({
        where: { customSlug },
      });

      if (existing) {
        return NextResponse.json(
          {
            error: "This custom slug is already taken. Please choose another.",
          },
          { status: 409 }
        );
      }
    }

    // Generate unique short code
    let shortCode = nanoid(7);
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const existing = await prisma.shortUrl.findUnique({
        where: { shortCode },
      });

      if (!existing) break;

      shortCode = nanoid(7);
      attempts++;
    }

    if (attempts === maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique short code. Please try again." },
        { status: 500 }
      );
    }

    // Calculate expiration date if provided
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : null;

    // Create short URL
    const shortUrl = await prisma.shortUrl.create({
      data: {
        originalUrl: url,
        shortCode,
        customSlug: customSlug || null,
        expiresAt,
        metadata: {
          userAgent: request.headers.get("user-agent"),
          createdFrom: "web",
        },
      },
    });

    // Build the short URL
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://rhub.ekddigital.com";
    const slug = customSlug || shortCode;
    const shortUrlFull = `${baseUrl}/s/${slug}`;

    return NextResponse.json({
      success: true,
      data: {
        id: shortUrl.id,
        originalUrl: shortUrl.originalUrl,
        shortUrl: shortUrlFull,
        shortCode: shortUrl.shortCode,
        customSlug: shortUrl.customSlug,
        createdAt: shortUrl.createdAt,
        expiresAt: shortUrl.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error creating short URL:", error);
    return NextResponse.json(
      { error: "Failed to create short URL. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve URL statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Code parameter is required" },
        { status: 400 }
      );
    }

    // Try to find by short code or custom slug
    const shortUrl = await prisma.shortUrl.findFirst({
      where: {
        OR: [{ shortCode: code }, { customSlug: code }],
        isActive: true,
      },
    });

    if (!shortUrl) {
      return NextResponse.json(
        { error: "Short URL not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (shortUrl.expiresAt && shortUrl.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This short URL has expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: shortUrl.id,
        originalUrl: shortUrl.originalUrl,
        shortCode: shortUrl.shortCode,
        customSlug: shortUrl.customSlug,
        clicks: shortUrl.clicks,
        createdAt: shortUrl.createdAt,
        lastClickAt: shortUrl.lastClickAt,
        expiresAt: shortUrl.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error fetching short URL stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch URL statistics" },
      { status: 500 }
    );
  }
}
