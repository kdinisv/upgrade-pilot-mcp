import { exec } from "node:child_process";
import {
  type PackageManager,
  type ProjectAnalysis,
  type ValidationCommandResult,
  type ValidationKind,
} from "../types.js";
import { analyzeProject } from "./analyzer.js";

const TRUNCATION_MARKER = "\n\n...[TRUNCATED]...\n\n";

export function truncateOutput(text: string, limit = 12000): string {
  if (text.length <= limit) {
    return text;
  }
  const markerLen = TRUNCATION_MARKER.length;
  const half = Math.floor((limit - markerLen) / 2);
  return text.slice(0, half) + TRUNCATION_MARKER + text.slice(-half);
}

function getPackageManagerCommand(packageManager: PackageManager): string {
  const command = packageManager === "unknown" ? "npm" : packageManager;
  if (process.platform === "win32") {
    return `${command}.cmd`;
  }
  return command;
}

function spawnCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const fullCommand = [command, ...args].join(" ");
  return new Promise((resolve) => {
    const child = exec(
      fullCommand,
      {
        cwd,
        windowsHide: true,
        env: process.env,
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error && error.killed) {
          resolve({
            exitCode: null,
            stdout,
            stderr:
              stderr +
              `\nProcess timeout: command exceeded ${timeoutMs}ms and was killed.`,
          });
          return;
        }
        resolve({
          exitCode: child.exitCode,
          stdout,
          stderr,
        });
      },
    );
  });
}

function getScriptCommand(
  kind: ValidationKind,
  packageManager: PackageManager,
  scripts: Record<string, string>,
): { command: string; args: string[]; reason?: string } {
  const command = getPackageManagerCommand(packageManager);

  if (kind === "types") {
    const typeScriptScript = ["typecheck", "check-types", "types"].find(
      (scriptName) => Boolean(scripts[scriptName]),
    );
    if (typeScriptScript) {
      return { command, args: ["run", typeScriptScript] };
    }
    if (scripts.build?.includes("tsc") || scripts.check?.includes("tsc")) {
      return { command, args: ["exec", "tsc", "--noEmit"] };
    }
    return {
      command,
      args: [],
      reason: "No explicit type-check script detected.",
    };
  }

  if (kind === "lint") {
    if (scripts.lint) {
      return { command, args: ["run", "lint"] };
    }
    return { command, args: [], reason: "No lint script detected." };
  }

  if (kind === "test") {
    if (scripts.test) {
      return { command, args: ["run", "test"] };
    }
    return { command, args: [], reason: "No test script detected." };
  }

  if (scripts.build) {
    return { command, args: ["run", "build"] };
  }

  return { command, args: [], reason: "No build script detected." };
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function validateUpgrade(
  rootPath = process.cwd(),
  include: ValidationKind[] = ["types", "lint", "test", "build"],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  analysis?: ProjectAnalysis,
): Promise<ValidationCommandResult[]> {
  const { packageManager, scripts } =
    analysis ?? (await analyzeProject(rootPath, true));
  const results: ValidationCommandResult[] = [];

  for (const kind of include) {
    const execution = getScriptCommand(kind, packageManager, scripts);
    if (execution.args.length === 0) {
      results.push({
        kind,
        command: execution.command,
        exitCode: null,
        status: "skipped",
        stdout: "",
        stderr: "",
        reason: execution.reason ?? "No command available.",
      });
      continue;
    }

    const result = await spawnCommand(
      execution.command,
      execution.args,
      rootPath,
      timeoutMs,
    );
    results.push({
      kind,
      command: [execution.command, ...execution.args].join(" "),
      exitCode: result.exitCode,
      status: result.exitCode === 0 ? "passed" : "failed",
      stdout: truncateOutput(result.stdout),
      stderr: truncateOutput(result.stderr),
    });
  }

  return results;
}
