import { spawn } from "node:child_process";
import {
  type PackageManager,
  type ValidationCommandResult,
  type ValidationKind,
} from "../types.js";
import { analyzeProject } from "./analyzer.js";

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
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      stderr += error.message;
      resolve({ exitCode: null, stdout, stderr });
    });
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
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

export async function validateUpgrade(
  rootPath = process.cwd(),
  include: ValidationKind[] = ["types", "lint", "test", "build"],
): Promise<ValidationCommandResult[]> {
  const analysis = await analyzeProject(rootPath, true);
  const results: ValidationCommandResult[] = [];

  for (const kind of include) {
    const execution = getScriptCommand(
      kind,
      analysis.packageManager,
      analysis.scripts,
    );
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
    );
    results.push({
      kind,
      command: [execution.command, ...execution.args].join(" "),
      exitCode: result.exitCode,
      status: result.exitCode === 0 ? "passed" : "failed",
      stdout: result.stdout.slice(-12000),
      stderr: result.stderr.slice(-12000),
    });
  }

  return results;
}
