// LaTeX Tools Configuration
// Modeled after image converter tools-config.ts

export interface LaTeXTool {
  slug: string;
  name: string;
  description: string;
  category: "conversion" | "utility";
  inputFormat: string[];
  outputFormat: string[];
  supportedJournals: string[];
  features: string[];
  icon: string;
}

export const latexTools: Record<string, LaTeXTool> = {
  "latex-to-word": {
    slug: "latex-to-word",
    name: "LaTeX to Word Converter",
    description:
      "Convert LaTeX documents to Microsoft Word (DOCX) format with automatic journal detection",
    category: "conversion",
    inputFormat: ["tex", "latex", "zip"],
    outputFormat: ["docx", "odt"],
    supportedJournals: [
      "Elsevier (elsarticle) - CMIG, KBS, MIA, NeuroC",
      "Springer Nature (sn-jnl) - AIR, Nature, Basic, APA, Chicago",
      "IEEE (IEEEtran, ieeecolor) - Transactions, TMI",
      "ACM (acmart) - Conferences, Journals",
      "Generic article class",
    ],
    features: [
      "Publication-quality output optimized for submissions",
      "Automatic journal type detection",
      "Manual journal override option",
      "ZIP file upload support",
      "Preserves bibliography formatting",
      "High-quality figure conversion",
      "Table formatting preservation",
      "Font management system",
      "Multiple quality levels",
      "Metadata preservation",
    ],
    icon: "FileText",
  },
  "word-to-latex": {
    slug: "word-to-latex",
    name: "Word to LaTeX Converter",
    description: "Convert Microsoft Word documents to LaTeX format",
    category: "conversion",
    inputFormat: ["docx", "doc", "odt"],
    outputFormat: ["tex", "latex"],
    supportedJournals: [
      "Elsevier template",
      "Springer Nature template",
      "IEEE template",
      "ACM template",
      "Generic article template",
    ],
    features: [
      "Target journal selection",
      "Automatic formatting conversion",
      "Table conversion",
      "Figure extraction",
      "Bibliography generation",
      "Equation recognition",
    ],
    icon: "FileCode",
  },
};

export const getLatexTool = (slug: string): LaTeXTool | undefined => {
  return latexTools[slug];
};

export const getAllLatexTools = (): LaTeXTool[] => {
  return Object.values(latexTools);
};

export const getLatexToolByCategory = (
  category: "conversion" | "utility"
): LaTeXTool[] => {
  return Object.values(latexTools).filter((tool) => tool.category === category);
};

// Supported file extensions
export const supportedInputExtensions = [".tex", ".latex", ".zip"] as const;
export const supportedOutputExtensions = [".docx", ".odt"] as const;

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB

// Conversion timeout (in milliseconds)
export const CONVERSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
