import { NextRequest, NextResponse } from "next/server";
import { executeRemoteCommand } from "@/lib/terminal/client";

export const maxDuration = 600; // 10 minute timeout for installations

// Package categories for document conversion system
const PACKAGE_CATEGORIES = {
  // LibreOffice for document conversion (PDF, Word, etc.)
  documents: {
    name: "Document Conversion",
    description: "LibreOffice for PDF/Word/ODT conversions",
    packages: [
      "libreoffice-common",
      "libreoffice-writer",
      "libreoffice-calc",
      "libreoffice-impress",
    ],
    checkCommand: "which libreoffice || which soffice",
    versionCommand:
      "libreoffice --version 2>/dev/null || soffice --version 2>/dev/null",
  },
  // PDF utilities
  pdf: {
    name: "PDF Tools",
    description: "PDF processing utilities",
    packages: ["poppler-utils", "ghostscript", "qpdf"],
    checkCommand: "which pdftotext && which gs",
    versionCommand: "pdftotext -v 2>&1 | head -n 1",
  },
  // Pandoc for advanced document conversion
  pandoc: {
    name: "Pandoc",
    description: "Universal document converter",
    packages: ["pandoc"],
    checkCommand: "which pandoc",
    versionCommand: "pandoc --version | head -n 1",
  },
  // Image processing
  images: {
    name: "Image Processing",
    description: "Image conversion and manipulation",
    packages: ["imagemagick", "graphicsmagick"],
    checkCommand: "which convert",
    versionCommand: "convert --version | head -n 1",
  },
  // OCR capabilities
  ocr: {
    name: "OCR Tools",
    description: "Optical Character Recognition",
    packages: ["tesseract-ocr", "tesseract-ocr-eng"],
    checkCommand: "which tesseract",
    versionCommand: "tesseract --version 2>&1 | head -n 1",
  },
  // System utilities
  system: {
    name: "System Utilities",
    description: "Core system tools",
    packages: ["curl", "wget", "unzip", "zip", "jq"],
    checkCommand: "which curl && which wget && which unzip",
    versionCommand: "curl --version | head -n 1",
  },
};

/**
 * Background installation helper
 * Runs apt-get install in background and polls for completion
 */
async function installPackagesBackground(
  packages: string[],
  categoryKey: string
): Promise<{ success: boolean; output: string }> {
  const packagesStr = packages.join(" ");
  const logFile = `/tmp/install_${categoryKey}_${Date.now()}.log`;
  const pidFile = `/tmp/install_${categoryKey}.pid`;

  // Start installation in background
  const bgCommand = `nohup bash -c 'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ${packagesStr} > ${logFile} 2>&1; echo $? > ${logFile}.exit' & echo $! > ${pidFile}`;

  await executeRemoteCommand(bgCommand);

  // Poll for completion (max 5 minutes)
  const maxWait = 300000; // 5 minutes
  const pollInterval = 3000; // 3 seconds
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;

    // Check if exit file exists (indicates completion)
    const checkComplete = await executeRemoteCommand(
      `test -f ${logFile}.exit && cat ${logFile}.exit`
    );

    if (
      checkComplete.exitCode === 0 &&
      checkComplete.output?.trim().length > 0
    ) {
      // Installation complete, get result
      const exitCode = parseInt(checkComplete.output.trim(), 10);
      const logContent = await executeRemoteCommand(`tail -50 ${logFile}`);

      // Cleanup
      await executeRemoteCommand(`rm -f ${logFile} ${logFile}.exit ${pidFile}`);

      return {
        success: exitCode === 0,
        output: logContent.output || `Exit code: ${exitCode}`,
      };
    }
  }

  // Timeout - check if still running
  const checkPid = await executeRemoteCommand(
    `cat ${pidFile} 2>/dev/null && ps -p $(cat ${pidFile}) >/dev/null 2>&1`
  );

  return {
    success: false,
    output:
      checkPid.exitCode === 0
        ? "Installation still in progress after timeout"
        : "Installation may have failed or completed - check manually",
  };
}

type CategoryKey = keyof typeof PACKAGE_CATEGORIES;

// Simple admin key check
function isAuthorized(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    // If no admin key is configured, allow localhost only
    const host = request.headers.get("host") || "";
    return host.includes("localhost") || host.includes("127.0.0.1");
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "").trim();
  return token === adminKey;
}

/**
 * GET: Check installation status of packages
 *
 * Usage:
 *   curl -X GET http://localhost:3000/api/v1/admin/install
 *   curl -X GET http://localhost:3000/api/v1/admin/install?category=documents
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as CategoryKey | null;

    // Check specific category or all
    const categoriesToCheck = category
      ? { [category]: PACKAGE_CATEGORIES[category] }
      : PACKAGE_CATEGORIES;

    if (category && !PACKAGE_CATEGORIES[category]) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown category: ${category}`,
          availableCategories: Object.keys(PACKAGE_CATEGORIES),
        },
        { status: 400 }
      );
    }

    const results: Record<
      string,
      {
        name: string;
        description: string;
        installed: boolean;
        version: string | null;
        packages: string[];
      }
    > = {};

    // Check each category in parallel
    const checkPromises = Object.entries(categoriesToCheck).map(
      async ([key, config]) => {
        try {
          // Check if installed
          const checkResult = await executeRemoteCommand(config.checkCommand);
          const installed = checkResult.exitCode === 0;

          // Get version if installed
          let version: string | null = null;
          if (installed) {
            const versionResult = await executeRemoteCommand(
              config.versionCommand
            );
            version = versionResult.output?.trim() || null;
          }

          results[key] = {
            name: config.name,
            description: config.description,
            installed,
            version,
            packages: config.packages,
          };
        } catch (error) {
          results[key] = {
            name: config.name,
            description: config.description,
            installed: false,
            version: null,
            packages: config.packages,
          };
        }
      }
    );

    await Promise.all(checkPromises);

    // Calculate summary
    const total = Object.keys(results).length;
    const installedCount = Object.values(results).filter(
      (r) => r.installed
    ).length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total,
        installed: installedCount,
        missing: total - installedCount,
        allInstalled: installedCount === total,
      },
      categories: results,
      availableCategories: Object.keys(PACKAGE_CATEGORIES),
    });
  } catch (error) {
    console.error("[Admin Install] Error checking status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Install packages by category
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/v1/admin/install \
 *     -H "Content-Type: application/json" \
 *     -d '{"category": "documents"}'
 *
 *   curl -X POST http://localhost:3000/api/v1/admin/install \
 *     -H "Content-Type: application/json" \
 *     -d '{"category": "all"}'
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization for installation
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized. Provide valid admin key in Authorization header.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category, force = false } = body as {
      category: CategoryKey | "all";
      force?: boolean;
    };

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: "Category is required",
          availableCategories: [...Object.keys(PACKAGE_CATEGORIES), "all"],
        },
        { status: 400 }
      );
    }

    // Determine which categories to install
    const categoriesToInstall =
      category === "all"
        ? PACKAGE_CATEGORIES
        : { [category]: PACKAGE_CATEGORIES[category as CategoryKey] };

    if (category !== "all" && !PACKAGE_CATEGORIES[category as CategoryKey]) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown category: ${category}`,
          availableCategories: [...Object.keys(PACKAGE_CATEGORIES), "all"],
        },
        { status: 400 }
      );
    }

    const installResults: Record<
      string,
      {
        name: string;
        success: boolean;
        output: string;
        duration: number;
      }
    > = {};

    let overallSuccess = true;

    // Install each category
    for (const [key, config] of Object.entries(categoriesToInstall)) {
      const startTime = Date.now();

      try {
        // Check if already installed (unless force is true)
        if (!force) {
          const checkResult = await executeRemoteCommand(config.checkCommand);
          if (checkResult.exitCode === 0) {
            installResults[key] = {
              name: config.name,
              success: true,
              output: "Already installed, skipped.",
              duration: Date.now() - startTime,
            };
            continue;
          }
        }

        // Update package list first (quick command)
        console.log(`[Admin Install] Updating package list for ${key}`);
        await executeRemoteCommand("sudo apt-get update -qq");

        // Install packages using background approach for reliability
        console.log(
          `[Admin Install] Installing ${key}: ${config.packages.join(" ")}`
        );
        const result = await installPackagesBackground(config.packages, key);

        if (!result.success) overallSuccess = false;

        installResults[key] = {
          name: config.name,
          success: result.success,
          output: result.output,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        overallSuccess = false;
        installResults[key] = {
          name: config.name,
          success: false,
          output:
            error instanceof Error ? error.message : "Installation failed",
          duration: Date.now() - startTime,
        };
      }
    }

    return NextResponse.json({
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      category: category,
      results: installResults,
      message: overallSuccess
        ? "All packages installed successfully"
        : "Some packages failed to install",
    });
  } catch (error) {
    console.error("[Admin Install] Installation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
