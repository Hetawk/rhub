import { NextRequest, NextResponse } from "next/server";
import { executeRemoteCommand } from "@/lib/terminal/client";

export const maxDuration = 120; // 2 minute timeout for status checks

interface SystemInfo {
  os: string | null;
  kernel: string | null;
  uptime: string | null;
  hostname: string | null;
}

interface DiskInfo {
  total: string | null;
  used: string | null;
  available: string | null;
  usagePercent: string | null;
}

interface MemoryInfo {
  total: string | null;
  used: string | null;
  available: string | null;
  usagePercent: string | null;
}

interface ServiceStatus {
  name: string;
  running: boolean;
  enabled?: boolean;
}

interface DirectoryStatus {
  path: string;
  exists: boolean;
  writable: boolean;
}

/**
 * GET: Check comprehensive system status for document conversion
 *
 * Usage:
 *   curl -X GET http://localhost:3000/api/v1/admin/status
 *   curl -X GET http://localhost:3000/api/v1/admin/status?detailed=true
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get("detailed") === "true";

  try {
    const startTime = Date.now();

    // Connection test
    let connected = false;
    let connectionError: string | null = null;

    try {
      const testResult = await executeRemoteCommand("echo 'CONNECTED'");
      connected =
        testResult.exitCode === 0 && testResult.output?.includes("CONNECTED");
    } catch (error) {
      connectionError =
        error instanceof Error ? error.message : "Connection failed";
    }

    if (!connected) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          error: connectionError || "Failed to connect to VPS",
          ttydUrl: process.env.TTYD_BASE_URL || "Not configured",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Basic system info
    const systemInfo: SystemInfo = {
      os: null,
      kernel: null,
      uptime: null,
      hostname: null,
    };

    // Gather system info in parallel
    const [osResult, kernelResult, uptimeResult, hostnameResult] =
      await Promise.all([
        executeRemoteCommand(
          "cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'"
        ),
        executeRemoteCommand("uname -r"),
        executeRemoteCommand("uptime -p"),
        executeRemoteCommand("hostname"),
      ]);

    systemInfo.os = osResult.output?.trim() || null;
    systemInfo.kernel = kernelResult.output?.trim() || null;
    systemInfo.uptime = uptimeResult.output?.trim() || null;
    systemInfo.hostname = hostnameResult.output?.trim() || null;

    // Document conversion tools status
    const tools: Record<
      string,
      { installed: boolean; version: string | null }
    > = {};

    // Use 'which' to detect installation, then get version separately
    const toolChecks = [
      {
        name: "libreoffice",
        whichCmd: "which libreoffice || which soffice",
        versionCmd:
          "libreoffice --version 2>/dev/null || soffice --version 2>/dev/null | head -n 1",
      },
      {
        name: "pandoc",
        whichCmd: "which pandoc",
        versionCmd: "pandoc --version 2>/dev/null | head -n 1",
      },
      {
        name: "pdftotext",
        whichCmd: "which pdftotext",
        versionCmd: "pdftotext -v 2>&1 | head -n 1",
      },
      {
        name: "convert",
        whichCmd: "which convert",
        versionCmd: "convert --version 2>/dev/null | head -n 1",
      },
      {
        name: "tesseract",
        whichCmd: "which tesseract",
        versionCmd: "tesseract --version 2>&1 | head -n 1",
      },
      {
        name: "ghostscript",
        whichCmd: "which gs",
        versionCmd: "gs --version 2>/dev/null",
      },
    ];

    const toolResults = await Promise.all(
      toolChecks.map(async ({ name, whichCmd, versionCmd }) => {
        // First check if command exists
        const whichResult = await executeRemoteCommand(whichCmd);
        const installed =
          whichResult.exitCode === 0 && !!whichResult.output?.trim();

        // Get version if installed
        let version: string | null = null;
        if (installed) {
          const versionResult = await executeRemoteCommand(versionCmd);
          version = versionResult.output?.trim() || null;
        }

        return { name, installed, version };
      })
    );

    toolResults.forEach(({ name, installed, version }) => {
      tools[name] = { installed, version };
    });

    // Work directories status
    const workDirs: DirectoryStatus[] = [];
    const dirsToCheck = [
      "/tmp/doc_conversions",
      "/tmp/doc_conversions/input",
      "/tmp/doc_conversions/output",
    ];

    for (const dir of dirsToCheck) {
      const existsResult = await executeRemoteCommand(
        `test -d ${dir} && echo EXISTS`
      );
      const exists = existsResult.output?.includes("EXISTS") || false;

      let writable = false;
      if (exists) {
        const writeResult = await executeRemoteCommand(
          `touch ${dir}/.test_write 2>/dev/null && rm ${dir}/.test_write && echo WRITABLE`
        );
        writable = writeResult.output?.includes("WRITABLE") || false;
      }

      workDirs.push({ path: dir, exists, writable });
    }

    // Detailed info (if requested)
    let diskInfo: DiskInfo | null = null;
    let memoryInfo: MemoryInfo | null = null;
    let services: ServiceStatus[] | null = null;

    if (detailed) {
      // Disk usage
      const diskResult = await executeRemoteCommand(
        "df -h / | tail -n 1 | awk '{print $2,$3,$4,$5}'"
      );
      if (diskResult.output) {
        const [total, used, available, usagePercent] = diskResult.output
          .trim()
          .split(" ");
        diskInfo = { total, used, available, usagePercent };
      }

      // Memory usage
      const memResult = await executeRemoteCommand(
        "free -h | grep Mem | awk '{print $2,$3,$7}'"
      );
      if (memResult.output) {
        const [total, used, available] = memResult.output.trim().split(" ");
        const memPercentResult = await executeRemoteCommand(
          "free | grep Mem | awk '{printf(\"%.1f%%\", $3/$2*100)}'"
        );
        memoryInfo = {
          total,
          used,
          available,
          usagePercent: memPercentResult.output?.trim() || null,
        };
      }

      // Service status
      services = [];
      const servicesToCheck = ["ssh", "cron"];
      for (const svc of servicesToCheck) {
        const statusResult = await executeRemoteCommand(
          `systemctl is-active ${svc} 2>/dev/null`
        );
        services.push({
          name: svc,
          running: statusResult.output?.trim() === "active",
        });
      }
    }

    const duration = Date.now() - startTime;

    // Calculate overall readiness for document conversion
    const requiredTools = ["libreoffice"];
    const allRequiredInstalled = requiredTools.every(
      (t) => tools[t]?.installed
    );
    const allDirsReady = workDirs.every((d) => d.exists && d.writable);
    const ready = allRequiredInstalled && allDirsReady;

    return NextResponse.json({
      success: true,
      connected: true,
      ready,
      readyMessage: ready
        ? "System is ready for document conversion"
        : "System needs configuration - run POST /api/v1/admin/setup",
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      system: systemInfo,
      tools,
      workDirectories: workDirs,
      ...(detailed && {
        disk: diskInfo,
        memory: memoryInfo,
        services,
      }),
      endpoints: {
        status: "GET /api/v1/admin/status",
        statusDetailed: "GET /api/v1/admin/status?detailed=true",
        install: "POST /api/v1/admin/install",
        installCheck: "GET /api/v1/admin/install",
        setup: "POST /api/v1/admin/setup",
      },
    });
  } catch (error) {
    console.error("[Admin Status] Error:", error);
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
