// Image conversion configurations - scalable and modular
export interface ConversionFormat {
  id: string;
  name: string;
  ext: string;
  mime: string;
  supportsTransparency: boolean;
  isVector: boolean;
}

export interface ConversionRoute {
  slug: string;
  from: ConversionFormat;
  to: ConversionFormat;
  title: string;
  description: string;
  featured: boolean;
}

// Supported formats
export const formats: Record<string, ConversionFormat> = {
  svg: {
    id: "svg",
    name: "SVG",
    ext: ".svg",
    mime: "image/svg+xml",
    supportsTransparency: true,
    isVector: true,
  },
  png: {
    id: "png",
    name: "PNG",
    ext: ".png",
    mime: "image/png",
    supportsTransparency: true,
    isVector: false,
  },
  jpg: {
    id: "jpg",
    name: "JPG",
    ext: ".jpg",
    mime: "image/jpeg",
    supportsTransparency: false,
    isVector: false,
  },
  webp: {
    id: "webp",
    name: "WebP",
    ext: ".webp",
    mime: "image/webp",
    supportsTransparency: true,
    isVector: false,
  },
  ico: {
    id: "ico",
    name: "ICO",
    ext: ".ico",
    mime: "image/x-icon",
    supportsTransparency: true,
    isVector: false,
  },
  gif: {
    id: "gif",
    name: "GIF",
    ext: ".gif",
    mime: "image/gif",
    supportsTransparency: true,
    isVector: false,
  },
  bmp: {
    id: "bmp",
    name: "BMP",
    ext: ".bmp",
    mime: "image/bmp",
    supportsTransparency: false,
    isVector: false,
  },
  tiff: {
    id: "tiff",
    name: "TIFF",
    ext: ".tiff",
    mime: "image/tiff",
    supportsTransparency: true,
    isVector: false,
  },
};

// Auto-generate all conversion routes
export const conversionRoutes: ConversionRoute[] = [
  // SVG conversions (vector to raster)
  {
    slug: "svg-to-png",
    from: formats.svg,
    to: formats.png,
    title: "SVG to PNG",
    description: "Convert vector SVG to PNG raster image",
    featured: true,
  },
  {
    slug: "svg-to-jpg",
    from: formats.svg,
    to: formats.jpg,
    title: "SVG to JPG",
    description: "Convert SVG to JPG with background",
    featured: true,
  },
  {
    slug: "svg-to-webp",
    from: formats.svg,
    to: formats.webp,
    title: "SVG to WebP",
    description: "Convert SVG to modern WebP format",
    featured: false,
  },
  {
    slug: "svg-to-ico",
    from: formats.svg,
    to: formats.ico,
    title: "SVG to ICO",
    description: "Convert SVG to favicon ICO",
    featured: false,
  },

  // PNG conversions
  {
    slug: "png-to-svg",
    from: formats.png,
    to: formats.svg,
    title: "PNG to SVG",
    description: "Vectorize PNG image to SVG (tracing)",
    featured: true,
  },
  {
    slug: "png-to-jpg",
    from: formats.png,
    to: formats.jpg,
    title: "PNG to JPG",
    description: "Convert PNG to JPG with background",
    featured: true,
  },
  {
    slug: "png-to-webp",
    from: formats.png,
    to: formats.webp,
    title: "PNG to WebP",
    description: "Convert PNG to WebP for better compression",
    featured: false,
  },
  {
    slug: "png-to-ico",
    from: formats.png,
    to: formats.ico,
    title: "PNG to ICO",
    description: "Create favicon from PNG",
    featured: false,
  },
  {
    slug: "png-to-gif",
    from: formats.png,
    to: formats.gif,
    title: "PNG to GIF",
    description: "Convert PNG to GIF format",
    featured: false,
  },
  {
    slug: "png-to-bmp",
    from: formats.png,
    to: formats.bmp,
    title: "PNG to BMP",
    description: "Convert PNG to BMP bitmap",
    featured: false,
  },

  // JPG conversions
  {
    slug: "jpg-to-png",
    from: formats.jpg,
    to: formats.png,
    title: "JPG to PNG",
    description: "Convert JPG to PNG with transparency support",
    featured: true,
  },
  {
    slug: "jpg-to-svg",
    from: formats.jpg,
    to: formats.svg,
    title: "JPG to SVG",
    description: "Vectorize JPG image to SVG",
    featured: false,
  },
  {
    slug: "jpg-to-webp",
    from: formats.jpg,
    to: formats.webp,
    title: "JPG to WebP",
    description: "Convert JPG to WebP format",
    featured: false,
  },
  {
    slug: "jpg-to-ico",
    from: formats.jpg,
    to: formats.ico,
    title: "JPG to ICO",
    description: "Create favicon from JPG",
    featured: false,
  },

  // WebP conversions
  {
    slug: "webp-to-png",
    from: formats.webp,
    to: formats.png,
    title: "WebP to PNG",
    description: "Convert WebP to PNG format",
    featured: false,
  },
  {
    slug: "webp-to-jpg",
    from: formats.webp,
    to: formats.jpg,
    title: "WebP to JPG",
    description: "Convert WebP to JPG format",
    featured: false,
  },
  {
    slug: "webp-to-svg",
    from: formats.webp,
    to: formats.svg,
    title: "WebP to SVG",
    description: "Vectorize WebP to SVG",
    featured: false,
  },

  // ICO conversions
  {
    slug: "ico-to-png",
    from: formats.ico,
    to: formats.png,
    title: "ICO to PNG",
    description: "Convert favicon ICO to PNG",
    featured: false,
  },
  {
    slug: "ico-to-jpg",
    from: formats.ico,
    to: formats.jpg,
    title: "ICO to JPG",
    description: "Convert ICO to JPG format",
    featured: false,
  },

  // GIF conversions
  {
    slug: "gif-to-png",
    from: formats.gif,
    to: formats.png,
    title: "GIF to PNG",
    description: "Convert GIF to PNG (first frame)",
    featured: false,
  },
  {
    slug: "gif-to-jpg",
    from: formats.gif,
    to: formats.jpg,
    title: "GIF to JPG",
    description: "Convert GIF to JPG format",
    featured: false,
  },

  // BMP conversions
  {
    slug: "bmp-to-png",
    from: formats.bmp,
    to: formats.png,
    title: "BMP to PNG",
    description: "Convert BMP to PNG format",
    featured: false,
  },
  {
    slug: "bmp-to-jpg",
    from: formats.bmp,
    to: formats.jpg,
    title: "BMP to JPG",
    description: "Convert BMP to JPG format",
    featured: false,
  },

  // TIFF conversions
  {
    slug: "tiff-to-png",
    from: formats.tiff,
    to: formats.png,
    title: "TIFF to PNG",
    description: "Convert TIFF to PNG format",
    featured: false,
  },
  {
    slug: "tiff-to-jpg",
    from: formats.tiff,
    to: formats.jpg,
    title: "TIFF to JPG",
    description: "Convert TIFF to JPG format",
    featured: false,
  },
];

// Helper functions
export function getConversionBySlug(slug: string): ConversionRoute | undefined {
  return conversionRoutes.find((c) => c.slug === slug);
}

export function getConversionsByFrom(formatId: string): ConversionRoute[] {
  return conversionRoutes.filter((c) => c.from.id === formatId);
}

export function getConversionsByTo(formatId: string): ConversionRoute[] {
  return conversionRoutes.filter((c) => c.to.id === formatId);
}

export function getFeaturedConversions(): ConversionRoute[] {
  return conversionRoutes.filter((c) => c.featured);
}
