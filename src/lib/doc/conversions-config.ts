// Document conversion configurations - scalable and modular
// Follows the same pattern as image conversions-config.ts

export interface DocumentFormat {
  id: string;
  name: string;
  ext: string;
  mime: string;
  category: "office" | "portable" | "text" | "web";
  description: string;
}

export interface ConversionRoute {
  slug: string;
  from: DocumentFormat;
  to: DocumentFormat;
  title: string;
  description: string;
  featured: boolean;
  notes?: string;
}

// Supported document formats
export const formats: Record<string, DocumentFormat> = {
  pdf: {
    id: "pdf",
    name: "PDF",
    ext: ".pdf",
    mime: "application/pdf",
    category: "portable",
    description: "Portable Document Format",
  },
  docx: {
    id: "docx",
    name: "Word (DOCX)",
    ext: ".docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "office",
    description: "Microsoft Word Document",
  },
  doc: {
    id: "doc",
    name: "Word (DOC)",
    ext: ".doc",
    mime: "application/msword",
    category: "office",
    description: "Legacy Microsoft Word Document",
  },
  odt: {
    id: "odt",
    name: "ODT",
    ext: ".odt",
    mime: "application/vnd.oasis.opendocument.text",
    category: "office",
    description: "OpenDocument Text",
  },
  rtf: {
    id: "rtf",
    name: "RTF",
    ext: ".rtf",
    mime: "application/rtf",
    category: "office",
    description: "Rich Text Format",
  },
  txt: {
    id: "txt",
    name: "Plain Text",
    ext: ".txt",
    mime: "text/plain",
    category: "text",
    description: "Plain Text Document",
  },
  html: {
    id: "html",
    name: "HTML",
    ext: ".html",
    mime: "text/html",
    category: "web",
    description: "Web Page",
  },
};

// All document conversion routes
export const conversionRoutes: ConversionRoute[] = [
  // PDF conversions - most common
  {
    slug: "pdf-to-word",
    from: formats.pdf,
    to: formats.docx,
    title: "PDF to Word",
    description:
      "Convert PDF documents to editable Microsoft Word format. Preserves text, images, and basic formatting.",
    featured: true,
    notes:
      "For best results, use text-based PDFs. Scanned PDFs may require OCR.",
  },
  {
    slug: "pdf-to-odt",
    from: formats.pdf,
    to: formats.odt,
    title: "PDF to ODT",
    description:
      "Convert PDF to OpenDocument format for LibreOffice and other open-source office suites.",
    featured: false,
  },
  {
    slug: "pdf-to-rtf",
    from: formats.pdf,
    to: formats.rtf,
    title: "PDF to RTF",
    description: "Convert PDF to Rich Text Format for universal compatibility.",
    featured: false,
  },
  {
    slug: "pdf-to-txt",
    from: formats.pdf,
    to: formats.txt,
    title: "PDF to Text",
    description:
      "Extract plain text from PDF documents. Useful for content analysis and text processing.",
    featured: true,
  },
  {
    slug: "pdf-to-html",
    from: formats.pdf,
    to: formats.html,
    title: "PDF to HTML",
    description:
      "Convert PDF to HTML web pages. Great for publishing PDF content online.",
    featured: false,
  },

  // Word conversions
  {
    slug: "word-to-pdf",
    from: formats.docx,
    to: formats.pdf,
    title: "Word to PDF",
    description:
      "Convert Microsoft Word documents to PDF. Perfect for sharing and printing.",
    featured: true,
  },
  {
    slug: "word-to-odt",
    from: formats.docx,
    to: formats.odt,
    title: "Word to ODT",
    description:
      "Convert Word documents to OpenDocument format for LibreOffice compatibility.",
    featured: false,
  },
  {
    slug: "word-to-rtf",
    from: formats.docx,
    to: formats.rtf,
    title: "Word to RTF",
    description:
      "Convert Word documents to Rich Text Format for wider compatibility.",
    featured: false,
  },
  {
    slug: "word-to-txt",
    from: formats.docx,
    to: formats.txt,
    title: "Word to Text",
    description:
      "Extract plain text from Word documents. Strip all formatting.",
    featured: false,
  },
  {
    slug: "word-to-html",
    from: formats.docx,
    to: formats.html,
    title: "Word to HTML",
    description: "Convert Word documents to HTML for web publishing.",
    featured: false,
  },

  // ODT conversions
  {
    slug: "odt-to-pdf",
    from: formats.odt,
    to: formats.pdf,
    title: "ODT to PDF",
    description: "Convert OpenDocument text files to PDF format.",
    featured: true,
  },
  {
    slug: "odt-to-word",
    from: formats.odt,
    to: formats.docx,
    title: "ODT to Word",
    description: "Convert OpenDocument files to Microsoft Word format.",
    featured: true,
  },
  {
    slug: "odt-to-rtf",
    from: formats.odt,
    to: formats.rtf,
    title: "ODT to RTF",
    description: "Convert OpenDocument files to Rich Text Format.",
    featured: false,
  },

  // Legacy Word (DOC) conversions
  {
    slug: "doc-to-pdf",
    from: formats.doc,
    to: formats.pdf,
    title: "DOC to PDF",
    description: "Convert legacy Word documents to PDF format.",
    featured: false,
  },
  {
    slug: "doc-to-docx",
    from: formats.doc,
    to: formats.docx,
    title: "DOC to DOCX",
    description: "Upgrade legacy .doc files to modern .docx format.",
    featured: true,
  },

  // RTF conversions
  {
    slug: "rtf-to-pdf",
    from: formats.rtf,
    to: formats.pdf,
    title: "RTF to PDF",
    description: "Convert Rich Text Format documents to PDF.",
    featured: false,
  },
  {
    slug: "rtf-to-word",
    from: formats.rtf,
    to: formats.docx,
    title: "RTF to Word",
    description: "Convert Rich Text Format to Word documents.",
    featured: false,
  },

  // HTML conversions
  {
    slug: "html-to-pdf",
    from: formats.html,
    to: formats.pdf,
    title: "HTML to PDF",
    description: "Convert web pages to PDF documents.",
    featured: true,
  },
  {
    slug: "html-to-word",
    from: formats.html,
    to: formats.docx,
    title: "HTML to Word",
    description: "Convert HTML files to Microsoft Word format.",
    featured: false,
  },

  // Text conversions
  {
    slug: "txt-to-pdf",
    from: formats.txt,
    to: formats.pdf,
    title: "Text to PDF",
    description: "Convert plain text files to PDF documents.",
    featured: false,
  },
  {
    slug: "txt-to-word",
    from: formats.txt,
    to: formats.docx,
    title: "Text to Word",
    description: "Convert plain text files to Word documents for editing.",
    featured: false,
  },
];

// Helper functions
export function getConversionBySlug(slug: string): ConversionRoute | undefined {
  return conversionRoutes.find((route) => route.slug === slug);
}

export function getConversionsFromFormat(formatId: string): ConversionRoute[] {
  return conversionRoutes.filter((route) => route.from.id === formatId);
}

export function getConversionsToFormat(formatId: string): ConversionRoute[] {
  return conversionRoutes.filter((route) => route.to.id === formatId);
}

export function getFeaturedConversions(): ConversionRoute[] {
  return conversionRoutes.filter((route) => route.featured);
}

export function getAllFormats(): DocumentFormat[] {
  return Object.values(formats);
}

export function getFormatById(id: string): DocumentFormat | undefined {
  return formats[id];
}

// Get all supported input extensions
export function getSupportedInputExtensions(): string[] {
  return [...new Set(conversionRoutes.map((r) => r.from.ext))];
}

// Get all supported output extensions
export function getSupportedOutputExtensions(): string[] {
  return [...new Set(conversionRoutes.map((r) => r.to.ext))];
}

// Get total number of conversion routes
export function getTotalConversions(): number {
  return conversionRoutes.length;
}
