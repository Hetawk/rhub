// API Route for installing LibreOffice with maximum timeout
// Single-purpose install endpoint

import { NextResponse } from "next/server";
import { executeRemoteCommand } from "@/lib/terminal/client";

export const maxDuration = 300; // 5 minute timeout (Vercel hobby limit)

export async function POST(): Promise<NextResponse> {
  console.log("[INSTALL] Starting LibreOffice installation...");

  // Single focused install command with maximum timeout
  const result = await executeRemoteCommand({
    command: `
      export DEBIAN_FRONTEND=noninteractive && \
      apt-get update -qq && \
      apt-get install -y -qq libreoffice-common libreoffice-writer 2>&1 && \
      echo "INSTALL_COMPLETE" && \
      which libreoffice || which soffice || echo "BINARY_NOT_FOUND"
    `,
    timeout: 540000, // 9 minutes
  });

  console.log("[INSTALL] Result:", {
    success: result.success,
    outputLength: result.output?.length,
    hasComplete: result.output?.includes("INSTALL_COMPLETE"),
  });

  // Check for success indicators
  const isComplete = result.output?.includes("INSTALL_COMPLETE");
  const hasBinary =
    result.output?.includes("/usr/bin") || result.output?.includes("/usr/lib");
  const noBinary = result.output?.includes("BINARY_NOT_FOUND");

  if (isComplete && !noBinary && hasBinary) {
    return NextResponse.json({
      success: true,
      message: "LibreOffice installed successfully",
      output: result.output?.slice(-2000),
    });
  }

  // If not complete, check what we got
  const verifyResult = await executeRemoteCommand({
    command: "dpkg -l | grep -i libreoffice | head -10",
    timeout: 15000,
  });

  return NextResponse.json({
    success: false,
    message: "Installation may have failed or timed out",
    installOutput: result.output?.slice(-2000),
    installedPackages: verifyResult.output,
    error: result.error,
  });
}
