import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hashPwd(pwd: string): string {
  return createHash("sha256").update(pwd).digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.conversionJob.deleteMany();
  await prisma.resourceAction.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.downloadableFile.deleteMany();

  // Seed Reference Converter
  const refConverter = await prisma.resource.create({
    data: {
      slug: "ref",
      title: "Reference Converter",
      tagline: "Transform citation exports into clean BibTeX",
      summary:
        "Convert EndNote XML, RIS, and enriched exports into validated BibTeX entries. Built to handle complex reference lists from academic databases.",
      category: "CONVERTER",
      status: "LIVE",
      featured: true,
      metadata: {
        supportedFormats: ["xml", "ris", "enl"],
        outputFormats: ["bibtex", "biblatex"],
        features: [
          "EndNote XML parsing",
          "RIS format support",
          "LaTeX character escaping",
          "Semantic Scholar enrichment (planned)",
          "CrossRef metadata (planned)",
        ],
      },
      actions: {
        create: [
          {
            label: "Convert Now",
            description: "Start converting your references",
            type: "INTERNAL",
            url: "/tools/ref",
            order: 1,
          },
          {
            label: "View Docs",
            description: "Learn about supported formats",
            type: "DOCUMENTATION",
            url: "/docs/ref",
            order: 2,
          },
        ],
      },
    },
  });

  // Seed LaTeX to Word Converter (Coming Soon)
  const latexConverter = await prisma.resource.create({
    data: {
      slug: "latex-to-word",
      title: "LaTeX to Word",
      tagline: "Convert academic papers to Word format",
      summary:
        "Transform LaTeX documents into editable Word files while preserving formatting, equations, and citations. Perfect for journal submissions.",
      category: "CONVERTER",
      status: "DRAFT",
      featured: false,
      metadata: {
        plannedFeatures: [
          "Math equation conversion",
          "Bibliography preservation",
          "Table and figure handling",
          "Style template matching",
        ],
      },
      actions: {
        create: [
          {
            label: "Coming Soon",
            description: "This tool is under development",
            type: "DOCUMENTATION",
            url: "/docs/latex-to-word",
            order: 1,
          },
        ],
      },
    },
  });

  // Seed URL Shortener
  const urlShortener = await prisma.resource.create({
    data: {
      slug: "s",
      title: "URL Shortener",
      tagline: "Create short, memorable links",
      summary:
        "Transform long URLs into short, branded links with custom slugs. Track clicks, set expiration dates, and manage all your links in one place.",
      category: "UTILITY",
      status: "LIVE",
      featured: true,
      metadata: {
        features: [
          "Custom slug support",
          "Click tracking & analytics",
          "Optional link expiration",
          "Instant URL shortening",
          "Secure & reliable redirects",
        ],
        domain: "rhub.ekddigital.com",
        pathPrefix: "/s/",
      },
      actions: {
        create: [
          {
            label: "Shorten URL",
            description: "Start shortening links now",
            type: "INTERNAL",
            url: "/tools/s",
            order: 1,
          },
          {
            label: "View Docs",
            description: "Learn about URL shortening",
            type: "DOCUMENTATION",
            url: "/docs/s",
            order: 2,
          },
        ],
      },
    },
  });

  // Seed Image Converter
  const imgConverter = await prisma.resource.create({
    data: {
      slug: "img",
      title: "Image Converter",
      tagline: "Convert images between formats instantly",
      summary:
        "Transform SVG, PNG, JPG, and WebP images with advanced options. Resize, adjust quality, set backgrounds, and optimize for web. Fast server-side processing.",
      category: "CONVERTER",
      status: "LIVE",
      featured: true,
      metadata: {
        supportedFormats: ["svg", "png", "jpg", "webp"],
        features: [
          "SVG to PNG/JPG conversion",
          "PNG/JPG/WebP format switching",
          "Custom dimensions & sizing",
          "Quality control",
          "Background color support",
          "Fast processing",
        ],
      },
      actions: {
        create: [
          {
            label: "Convert Now",
            description: "Start converting images",
            type: "INTERNAL",
            url: "/tools/img",
            order: 1,
          },
          {
            label: "View Docs",
            description: "Learn about image conversion",
            type: "DOCUMENTATION",
            url: "/docs/img",
            order: 2,
          },
        ],
      },
    },
  });

  // Seed API Playground
  const apiPlayground = await prisma.resource.create({
    data: {
      slug: "api-playground",
      title: "API Testing Ground",
      tagline: "Test and explore EKD Digital APIs",
      summary:
        "Interactive API documentation and testing interface for all EKD Digital services. Try endpoints, view responses, and generate code snippets.",
      category: "PLAYGROUND",
      status: "DRAFT",
      featured: false,
      metadata: {
        plannedAPIs: [
          "Reference Conversion API",
          "Document Transformation API",
          "Data Processing API",
        ],
      },
      actions: {
        create: [
          {
            label: "Explore APIs",
            description: "Browse available endpoints",
            type: "INTERNAL",
            url: "/playground",
            order: 1,
          },
        ],
      },
    },
  });

  console.log("✅ Seeded resources:", {
    refConverter: refConverter.slug,
    urlShortener: urlShortener.slug,
    imgConverter: imgConverter.slug,
    latexConverter: latexConverter.slug,
    apiPlayground: apiPlayground.slug,
  });

  // Create sample conversion jobs for reference
  const sampleJob = await prisma.conversionJob.create({
    data: {
      resourceSlug: "ref",
      inputFormat: "xml",
      outputFormat: "bibtex",
      status: "COMPLETED",
      sourceName: "sample-references.xml",
      sourceSize: 15420,
      entryCount: 12,
      warningCount: 2,
      errorCount: 0,
      durationMs: 243,
      metadata: {
        options: {
          includeAbstract: false,
          includeKeywords: true,
          escapeLatex: true,
          citationStyle: "bibtex",
        },
      },
    },
  });

  console.log("✅ Created sample conversion job:", sampleJob.id);

  // Create Downloads resource
  const downloadsResource = await prisma.resource.create({
    data: {
      slug: "downloads",
      title: "Downloads",
      tagline: "Access important documents and files",
      summary:
        "Download essential documents, forms, and resources from EKD Digital and A.N.D Group of Companies. Access corporate information, account opening packages, and more.",
      category: "DOWNLOAD",
      status: "LIVE",
      featured: true,
      metadata: {
        fileTypes: ["PDF", "DOC", "XLSX"],
        categories: ["Corporate", "Banking", "Legal", "Forms"],
      },
      actions: {
        create: [
          {
            label: "Browse Downloads",
            description: "View all available files",
            type: "INTERNAL",
            url: "/downloads",
            order: 1,
          },
        ],
      },
    },
  });

  // Create downloadable file for Bank Info (public for 3 hours, then password-protected)
  const publicUntil = new Date();
  publicUntil.setHours(publicUntil.getHours() + 3);

  const bankInfoFile = await prisma.downloadableFile.create({
    data: {
      title: "A.N.D GROUP OF COMPANIES LLC - Corporate Account Opening Package",
      description:
        "Complete corporate banking information and account opening package for A.N.D Group of Companies LLC. Includes company details, beneficial ownership information, and required documentation for financial institutions. Public access for 3 hours, then password-protected.",
      fileName: "Bank_Info.pdf",
      filePath: "public/secrets/Bank_Info.pdf",
      fileSize: 10849715,
      fileType: "application/pdf",
      category: "Corporate Banking",
      accessLevel: "public",
      password: hashPwd("UBA"),
      publicUntil: publicUntil,
      isActive: true,
    },
  });

  console.log("✅ Seeded downloads resource:", downloadsResource.slug);
  console.log("✅ Created downloadable file:", bankInfoFile.fileName);

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@ekddigital.com",
      password: hashedPassword,
      name: "Admin User",
      role: "superadmin",
      isActive: true,
    },
  });

  console.log("✅ Created admin user:", adminUser.email);
  console.log("   Password: admin123");
  console.log("🎉 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
