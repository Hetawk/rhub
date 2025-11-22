import {
  getConversionBySlug,
  conversionRoutes,
} from "@/lib/img/conversions-config";
import { ImageConverter } from "@/components/tools/img/image-converter";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Generate static paths for all conversions at build time
  return conversionRoutes.map((conversion) => ({
    slug: conversion.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const conversion = getConversionBySlug(slug);

  if (!conversion) {
    return {
      title: "Conversion Not Found",
    };
  }

  return {
    title: `${conversion.title} - EKD Digital Resource Hub`,
    description: conversion.description,
  };
}

export default async function ConversionPage({ params }: PageProps) {
  const { slug } = await params;
  const conversion = getConversionBySlug(slug);

  if (!conversion) {
    notFound();
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <ImageConverter conversion={conversion} />
    </div>
  );
}
