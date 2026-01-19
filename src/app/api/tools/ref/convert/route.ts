import { NextResponse } from "next/server";
import { runConversion } from "@/lib/ref/engine";
import type { ConversionOptions } from "@/lib/ref/types";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, options, fileName } = body as {
      content?: string;
      options?: ConversionOptions;
      fileName?: string | null;
    };

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Provide XML or RIS content for conversion" },
        { status: 400 }
      );
    }

    const conversion = await runConversion(content, options ?? {});

    await prisma.conversionJob.create({
      data: {
        resourceSlug: "reference-converter",
        inputFormat: conversion.format,
        outputFormat: options?.citationStyle ?? "bibtex",
        status: conversion.entryCount > 0 ? "COMPLETED" : "FAILED",
        sourceName: fileName ?? null,
        sourceSize: Buffer.byteLength(content, "utf8"),
        entryCount: conversion.entryCount,
        warningCount: conversion.warnings.length,
        durationMs: conversion.processingTime,
        metadata: {
          citationStyle: options?.citationStyle ?? "bibtex",
          includeAbstract: options?.includeAbstract ?? false,
          includeKeywords: options?.includeKeywords ?? true,
          includeNotes: options?.includeNotes ?? false,
          escapeLatex: options?.escapeLatex ?? true,
        },
      },
    });

    return NextResponse.json(conversion);
  } catch (error) {
    console.error("Conversion API error", error);
    return NextResponse.json(
      { error: "Unable to complete conversion" },
      { status: 500 }
    );
  }
}
