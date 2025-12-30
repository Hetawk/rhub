// Remote Terminal Client for TTYD/Xterm API
// Executes commands on VPS server via HTTP/WebSocket

interface TerminalExecuteOptions {
  command: string;
  timeout?: number;
  workingDirectory?: string;
}

interface TerminalExecuteResult {
  success: boolean;
  output: string;
  exitCode: number;
  error?: string;
}

/**
 * Executes a command on the remote VPS server via TTYD terminal API
 * Uses root access provided by TTYD_KEY - no SSH password needed
 *
 * @param commandOrOptions - Either a command string or full options object
 * @param timeout - Optional timeout when using string command (default: 60000)
 */
export async function executeRemoteCommand(
  commandOrOptions: string | TerminalExecuteOptions,
  timeout?: number
): Promise<TerminalExecuteResult> {
  // Normalize input to options object
  const options: TerminalExecuteOptions =
    typeof commandOrOptions === "string"
      ? { command: commandOrOptions, timeout: timeout ?? 60000 }
      : commandOrOptions;

  const { command, timeout: cmdTimeout = 60000, workingDirectory } = options;

  const ttydKey = process.env.TTYD_KEY;
  const ttydBaseUrl = process.env.TTYD_BASE_URL;

  if (!ttydKey) {
    return {
      success: false,
      output: "",
      exitCode: 1,
      error: "TTYD_KEY not configured",
    };
  }

  if (!ttydBaseUrl) {
    return {
      success: false,
      output: "",
      exitCode: 1,
      error: "TTYD_BASE_URL not configured",
    };
  }

  try {
    const sessionId = `rhub-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;

    // Step 1: Connect (create session)
    const connectResponse = await fetch(`${ttydBaseUrl}/api/ttyd/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ttydKey}`,
      },
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(cmdTimeout),
    });

    if (!connectResponse.ok) {
      const errorText = await connectResponse.text();
      return {
        success: false,
        output: "",
        exitCode: 1,
        error: `Connection failed: ${connectResponse.status} ${errorText}`,
      };
    }

    const { sessionId: realSessionId } = await connectResponse.json();

    // Step 2: Build command
    let finalCommand = command;
    if (workingDirectory) {
      finalCommand = `cd "${workingDirectory}" && ${command}`;
    }

    // Wrap command to extract output cleanly
    const wrappedCommand = `echo "START_TEST"; ${finalCommand}; echo "END_TEST_$?"`;

    // Step 3: Execute command
    const executeResponse = await fetch(`${ttydBaseUrl}/api/ttyd/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ttydKey}`,
      },
      body: JSON.stringify({
        sessionId: realSessionId,
        command: wrappedCommand + "\n",
      }),
      signal: AbortSignal.timeout(cmdTimeout),
    });

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      return {
        success: false,
        output: "",
        exitCode: 1,
        error: `Execution failed: ${executeResponse.status} ${errorText}`,
      };
    }

    const { output: rawOutput } = await executeResponse.json();

    // Step 4: Parse output
    const output = extractOutput(rawOutput);
    const exitCode = extractExitCode(rawOutput);

    return {
      success: exitCode === 0,
      output,
      exitCode,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      exitCode: 1,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract clean output between START_TEST and END_TEST markers
 * Removes ANSI codes, prompts, and terminal artifacts
 */
function extractOutput(fullOutput: string): string {
  // Remove ANSI color codes and control sequences
  const cleanOutput = fullOutput
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/\x1b\[[\d;]*[A-Za-z]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Find "\nSTART_TEST\n" marker
  const startPattern = "\nSTART_TEST\n";
  const startIndex = cleanOutput.indexOf(startPattern);

  if (startIndex === -1) {
    return cleanOutput.trim();
  }

  // Get content after START_TEST marker
  const contentAfterStart = cleanOutput.substring(
    startIndex + startPattern.length
  );

  // Find END_TEST_ marker
  const endIndex = contentAfterStart.indexOf("END_TEST_");
  if (endIndex === -1) {
    return contentAfterStart.trim();
  }

  // Extract output between markers
  const output = contentAfterStart.substring(0, endIndex).trim();

  // Remove prompt-only lines
  const lines = output.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Remove shell prompts
    if (/^(root|hetawk|ubuntu)@[^:]+:[^#$]*[#$]$/.test(trimmed)) return false;
    return true;
  });

  return lines.join("\n").trim();
}

/**
 * Extract exit code from END_TEST_N marker
 */
function extractExitCode(fullOutput: string): number {
  const match = fullOutput.match(/END_TEST_(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Checks if Pandoc is installed on the remote server
 */
export async function checkRemotePandocInstalled(): Promise<{
  installed: boolean;
  version?: string;
  error?: string;
}> {
  const result = await executeRemoteCommand({
    command: "pandoc --version | head -1",
    timeout: 10000,
  });

  if (!result.success) {
    return {
      installed: false,
      error: result.error || "Pandoc not found",
    };
  }

  return {
    installed: true,
    version: result.output.trim(),
  };
}

/**
 * Executes multiple commands in sequence (robust error handling)
 */
export async function executeRemoteCommandSequence(
  commands: string[],
  workingDirectory?: string
): Promise<TerminalExecuteResult[]> {
  const results: TerminalExecuteResult[] = [];

  for (const command of commands) {
    const result = await executeRemoteCommand({
      command,
      workingDirectory,
    });

    results.push(result);

    // Stop on first error
    if (!result.success) {
      break;
    }
  }

  return results;
}
