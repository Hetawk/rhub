// Document Tools Configuration
// Modeled after latex/tools-config.ts for consistency

export interface DocumentTool {
  slug: string;
  name: string;
  description: string;
  category: "conversion" | "utility";
  inputFormat: string[];
  outputFormat: string[];
  features: string[];
  icon: string;
}

export const documentTools: Record<string, DocumentTool> = {
  "pdf-to-word": {
    slug: "pdf-to-word",
    name: "PDF to Word Converter",
    description:
      "Convert PDF documents to editable Microsoft Word (DOCX) format with preserved formatting",
    category: "conversion",
    inputFormat: ["pdf"],
    outputFormat: ["docx"],
    features: [
      "Text extraction and formatting preservation",
      "Image and graphics extraction",
      "Table structure recognition",
      "Font style preservation",
      "Multi-page document support",
      "Fast server-side processing",
    ],
    icon: "FileText",
  },
  "word-to-pdf": {
    slug: "word-to-pdf",
    name: "Word to PDF Converter",
    description:
      "Convert Microsoft Word documents to PDF format for sharing and printing",
    category: "conversion",
    inputFormat: ["docx", "doc"],
    outputFormat: ["pdf"],
    features: [
      "High-quality PDF output",
      "Font embedding support",
      "Hyperlink preservation",
      "Image quality retention",
      "Multi-page support",
      "Professional formatting",
    ],
    icon: "FileOutput",
  },
  "pdf-to-text": {
    slug: "pdf-to-text",
    name: "PDF to Text Extractor",
    description:
      "Extract plain text content from PDF documents for analysis or editing",
    category: "conversion",
    inputFormat: ["pdf"],
    outputFormat: ["txt"],
    features: [
      "Full text extraction",
      "Page structure awareness",
      "Whitespace handling",
      "Multi-column support",
      "Unicode support",
      "Batch processing ready",
    ],
    icon: "FileType",
  },
  "odt-to-word": {
    slug: "odt-to-word",
    name: "ODT to Word Converter",
    description:
      "Convert OpenDocument Text files to Microsoft Word format for compatibility",
    category: "conversion",
    inputFormat: ["odt"],
    outputFormat: ["docx"],
    features: [
      "Style preservation",
      "Image conversion",
      "Table formatting",
      "List handling",
      "Cross-platform compatibility",
      "LibreOffice optimized",
    ],
    icon: "FileCode",
  },
  "doc-to-docx": {
    slug: "doc-to-docx",
    name: "DOC to DOCX Converter",
    description:
      "Upgrade legacy .doc files to modern .docx format for better compatibility",
    category: "conversion",
    inputFormat: ["doc"],
    outputFormat: ["docx"],
    features: [
      "Legacy format support",
      "Modern format output",
      "Full content preservation",
      "Formatting retention",
      "Reduced file size",
      "Better compatibility",
    ],
    icon: "FileUp",
  },
  "html-to-pdf": {
    slug: "html-to-pdf",
    name: "HTML to PDF Converter",
    description: "Convert web pages and HTML files to PDF documents",
    category: "conversion",
    inputFormat: ["html"],
    outputFormat: ["pdf"],
    features: [
      "CSS styling support",
      "Image embedding",
      "Link preservation",
      "Page layout control",
      "Print-ready output",
      "Web page capture",
    ],
    icon: "Globe",
  },
};

export const getDocumentTool = (slug: string): DocumentTool | undefined => {
  return documentTools[slug];
};

export const getAllDocumentTools = (): DocumentTool[] => {
  return Object.values(documentTools);
};

export const getDocumentToolByCategory = (
  category: "conversion" | "utility"
): DocumentTool[] => {
  return Object.values(documentTools).filter(
    (tool) => tool.category === category
  );
};

export const getFeaturedDocumentTools = (): DocumentTool[] => {
  // Return the most commonly used tools
  return [
    documentTools["pdf-to-word"],
    documentTools["word-to-pdf"],
    documentTools["pdf-to-text"],
  ];
};

// Supported file extensions
export const supportedInputExtensions = [
  ".pdf",
  ".docx",
  ".doc",
  ".odt",
  ".rtf",
  ".txt",
  ".html",
] as const;
export const supportedOutputExtensions = [
  ".pdf",
  ".docx",
  ".odt",
  ".rtf",
  ".txt",
  ".html",
] as const;

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB

// Conversion timeout (in milliseconds)
export const CONVERSION_TIMEOUT = 2 * 60 * 1000; // 2 minutes
