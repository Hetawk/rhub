import { NextRequest, NextResponse } from "next/server";
import { executeRemoteCommand } from "@/lib/terminal/client";

export const maxDuration = 300; // 5 minute timeout (Vercel hobby limit)

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

interface SetupStep {
  name: string;
  command: string;
  required: boolean;
}

const SETUP_STEPS: SetupStep[] = [
  {
    name: "Update package list",
    command: "sudo apt-get update -qq",
    required: true,
  },
  {
    name: "Install LibreOffice (Core)",
    command:
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y libreoffice-common libreoffice-writer",
    required: true,
  },
  {
    name: "Install LibreOffice (Extended)",
    command:
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y libreoffice-calc libreoffice-impress",
    required: false,
  },
  {
    name: "Install PDF Tools",
    command:
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y poppler-utils ghostscript qpdf",
    required: false,
  },
  {
    name: "Install Pandoc",
    command: "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y pandoc",
    required: false,
  },
  {
    name: "Install ImageMagick",
    command:
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y imagemagick",
    required: false,
  },
  {
    name: "Create work directories",
    command:
      "mkdir -p /tmp/doc_conversions/input /tmp/doc_conversions/output && chmod 777 /tmp/doc_conversions /tmp/doc_conversions/input /tmp/doc_conversions/output",
    required: true,
  },
  {
    name: "Verify LibreOffice installation",
    command: "libreoffice --version || soffice --version",
    required: true,
  },
];

/**
 * GET: Check setup status
 *
 * Usage:
 *   curl -X GET http://localhost:3000/api/v1/admin/setup
 */
export async function GET() {
  try {
    const checks = {
      libreoffice: false,
      pandoc: false,
      pdfTools: false,
      imagemagick: false,
      workDirs: false,
    };

    // Check LibreOffice
    const loResult = await executeRemoteCommand(
      "which libreoffice || which soffice"
    );
    checks.libreoffice = loResult.exitCode === 0;

    // Check Pandoc
    const pandocResult = await executeRemoteCommand("which pandoc");
    checks.pandoc = pandocResult.exitCode === 0;

    // Check PDF tools
    const pdfResult = await executeRemoteCommand("which pdftotext");
    checks.pdfTools = pdfResult.exitCode === 0;

    // Check ImageMagick
    const imResult = await executeRemoteCommand("which convert");
    checks.imagemagick = imResult.exitCode === 0;

    // Check work directories
    const dirResult = await executeRemoteCommand(
      "test -d /tmp/doc_conversions/input && test -d /tmp/doc_conversions/output && echo OK"
    );
    checks.workDirs = dirResult.output?.includes("OK") || false;

    const allReady = checks.libreoffice && checks.workDirs;
    const fullyReady = Object.values(checks).every((v) => v);

    return NextResponse.json({
      success: true,
      ready: allReady,
      fullyConfigured: fullyReady,
      checks,
      message: fullyReady
        ? "System fully configured for document conversion"
        : allReady
        ? "Core requirements met. Optional packages can be installed."
        : "System needs setup - run POST /api/v1/admin/setup",
      curlExample: "curl -X POST http://localhost:3000/api/v1/admin/setup",
    });
  } catch (error) {
    console.error("[Admin Setup] Check error:", error);
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
 * POST: Run full setup for document conversion system
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/v1/admin/setup
 *   curl -X POST http://localhost:3000/api/v1/admin/setup -d '{"full": true}'
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
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

    let body: { full?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    const runFull = body.full === true;
    const startTime = Date.now();

    const results: Array<{
      step: string;
      success: boolean;
      output: string;
      duration: number;
      required: boolean;
    }> = [];

    let overallSuccess = true;

    // Filter steps based on full flag
    const stepsToRun = runFull
      ? SETUP_STEPS
      : SETUP_STEPS.filter((s) => s.required);

    for (const step of stepsToRun) {
      const stepStart = Date.now();

      try {
        console.log(`[Admin Setup] Running: ${step.name}`);
        const result = await executeRemoteCommand(step.command);

        const success = result.exitCode === 0;
        if (step.required && !success) {
          overallSuccess = false;
        }

        results.push({
          step: step.name,
          success,
          output: (result.output || result.error || "No output").substring(
            0,
            500
          ),
          duration: Date.now() - stepStart,
          required: step.required,
        });
      } catch (error) {
        if (step.required) overallSuccess = false;

        results.push({
          step: step.name,
          success: false,
          output: error instanceof Error ? error.message : "Step failed",
          duration: Date.now() - stepStart,
          required: step.required,
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    // Final verification
    let verified = false;
    try {
      const verifyResult = await executeRemoteCommand(
        "(libreoffice --version || soffice --version) && test -d /tmp/doc_conversions/input && echo VERIFIED"
      );
      verified = verifyResult.output?.includes("VERIFIED") || false;
    } catch {
      verified = false;
    }

    return NextResponse.json({
      success: overallSuccess && verified,
      verified,
      timestamp: new Date().toISOString(),
      totalDuration: `${totalDuration}ms`,
      mode: runFull ? "full" : "required-only",
      steps: results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      nextSteps:
        overallSuccess && verified
          ? [
              "System is ready for document conversion",
              "Test with: POST /api/tools/doc/convert",
            ]
          : [
              "Check failed steps above",
              "Ensure VPS has proper sudo access",
              "Retry with: POST /api/v1/admin/setup",
            ],
    });
  } catch (error) {
    console.error("[Admin Setup] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
