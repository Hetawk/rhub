// API Route for setting up document conversion dependencies on VPS
// Installs LibreOffice and required packages

import { NextRequest, NextResponse } from "next/server";
import { executeRemoteCommand } from "@/lib/terminal/client";

export const maxDuration = 300; // 5 minutes for installation

interface SetupResult {
  success: boolean;
  message: string;
  steps: {
    step: string;
    success: boolean;
    output?: string;
    error?: string;
  }[];
  libreofficeVersion?: string;
}

/**
 * GET - Check current LibreOffice installation status
 */
export async function GET(): Promise<NextResponse<SetupResult>> {
  const steps: SetupResult["steps"] = [];

  // Check if LibreOffice is installed
  const checkResult = await executeRemoteCommand({
    command:
      "libreoffice --version 2>/dev/null || soffice --version 2>/dev/null | head -1",
    timeout: 15000,
  });

  if (checkResult.success && checkResult.output?.includes("LibreOffice")) {
    return NextResponse.json({
      success: true,
      message: "LibreOffice is already installed",
      steps: [
        {
          step: "Check LibreOffice",
          success: true,
          output: checkResult.output.trim(),
        },
      ],
      libreofficeVersion: checkResult.output.trim(),
    });
  }

  return NextResponse.json({
    success: false,
    message: "LibreOffice is not installed on the VPS",
    steps: [
      {
        step: "Check LibreOffice",
        success: false,
        error: "LibreOffice not found",
      },
    ],
  });
}

/**
 * POST - Install LibreOffice and dependencies on VPS
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<SetupResult>> {
  const steps: SetupResult["steps"] = [];

  try {
    // Optional: Check if a specific action is requested
    const body = await req.json().catch(() => ({}));
    const action = body.action || "install";

    if (action === "check") {
      // Just check status
      const checkResult = await executeRemoteCommand({
        command: "libreoffice --version 2>/dev/null | head -1",
        timeout: 15000,
      });

      return NextResponse.json({
        success:
          checkResult.success && !!checkResult.output?.includes("LibreOffice"),
        message: checkResult.output?.includes("LibreOffice")
          ? "LibreOffice is installed"
          : "LibreOffice is not installed",
        steps: [
          {
            step: "Check LibreOffice",
            success: !!checkResult.output?.includes("LibreOffice"),
            output: checkResult.output || undefined,
          },
        ],
        libreofficeVersion: checkResult.output?.includes("LibreOffice")
          ? checkResult.output.trim()
          : undefined,
      });
    }

    // Step 1: Update package lists
    console.log("[DOC-SETUP] Updating package lists...");
    const updateResult = await executeRemoteCommand({
      command: "apt-get update",
      timeout: 120000, // 2 minutes
    });

    steps.push({
      step: "Update package lists",
      success: updateResult.success,
      output: updateResult.output?.slice(0, 500),
      error: updateResult.error,
    });

    if (!updateResult.success) {
      return NextResponse.json({
        success: false,
        message: "Failed to update package lists",
        steps,
      });
    }

    // Step 2: Install LibreOffice (using libreoffice-common as suggested by system)
    console.log("[DOC-SETUP] Installing LibreOffice...");
    const installResult = await executeRemoteCommand({
      command:
        "DEBIAN_FRONTEND=noninteractive apt-get install -y libreoffice-common libreoffice-writer",
      timeout: 600000, // 10 minutes - this can take a while
    });

    steps.push({
      step: "Install LibreOffice",
      success: installResult.success,
      output: installResult.output?.slice(-1000), // Last 1000 chars
      error: installResult.error,
    });

    // Check if command succeeded but LibreOffice still not available
    // This happens when apt says success but package wasn't fully installed
    if (installResult.success) {
      const quickCheck = await executeRemoteCommand({
        command: "which libreoffice || which soffice",
        timeout: 10000,
      });

      if (!quickCheck.success || !quickCheck.output?.includes("/")) {
        // Try alternative package
        console.log(
          "[DOC-SETUP] First install incomplete, trying alternative..."
        );
        const altResult = await executeRemoteCommand({
          command:
            "DEBIAN_FRONTEND=noninteractive apt-get install -y libreoffice",
          timeout: 600000,
        });

        steps.push({
          step: "Install LibreOffice (full package)",
          success: altResult.success,
          output: altResult.output?.slice(-1000),
          error: altResult.error,
        });
      }
    }

    if (!installResult.success) {
      // Try alternative: full package
      console.log("[DOC-SETUP] Trying full install...");
      const minimalResult = await executeRemoteCommand({
        command:
          "DEBIAN_FRONTEND=noninteractive apt-get install -y libreoffice",
        timeout: 600000, // 10 minutes
      });

      steps.push({
        step: "Install LibreOffice (fallback)",
        success: minimalResult.success,
        output: minimalResult.output?.slice(-1000),
        error: minimalResult.error,
      });

      if (!minimalResult.success) {
        return NextResponse.json({
          success: false,
          message: "Failed to install LibreOffice",
          steps,
        });
      }
    }

    // Step 3: Create working directories
    console.log("[DOC-SETUP] Creating working directories...");
    const mkdirResult = await executeRemoteCommand({
      command:
        "mkdir -p /tmp/doc_conversions/input /tmp/doc_conversions/output && chmod -R 755 /tmp/doc_conversions",
      timeout: 10000,
    });

    steps.push({
      step: "Create directories",
      success: mkdirResult.success,
      output: mkdirResult.output,
      error: mkdirResult.error,
    });

    // Step 4: Verify installation
    console.log("[DOC-SETUP] Verifying installation...");
    const verifyResult = await executeRemoteCommand({
      command: "libreoffice --version | head -1",
      timeout: 15000,
    });

    steps.push({
      step: "Verify LibreOffice",
      success:
        verifyResult.success && !!verifyResult.output?.includes("LibreOffice"),
      output: verifyResult.output,
      error: verifyResult.error,
    });

    const isInstalled =
      verifyResult.success && verifyResult.output?.includes("LibreOffice");

    return NextResponse.json({
      success: isInstalled,
      message: isInstalled
        ? "LibreOffice installed successfully"
        : "Installation completed but verification failed",
      steps,
      libreofficeVersion: isInstalled ? verifyResult.output?.trim() : undefined,
    });
  } catch (error) {
    console.error("[DOC-SETUP] Error:", error);
    return NextResponse.json({
      success: false,
      message: `Setup failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      steps,
    });
  }
}
