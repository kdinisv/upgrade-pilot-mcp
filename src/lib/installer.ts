import { exec } from "node:child_process";
import type { PackageManager, ProjectAnalysis } from "../types.js";
import { analyzeProject } from "./analyzer.js";
import { truncateOutput } from "./validation.js";

export interface PackageSpec {
  name: string;
  version: string;
  dev?: boolean | undefined;
}

export interface InstallCommand {
  bin: string;
  args: string[];
}

export interface InstallResult {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  packages: PackageSpec[];
}

export function buildInstallCommand(
  pm: PackageManager,
  packages: PackageSpec[],
): InstallCommand[] {
  const prod = packages.filter((p) => !p.dev);
  const dev = packages.filter((p) => p.dev);
  const commands: InstallCommand[] = [];

  for (const [group, isDev] of [
    [prod, false],
    [dev, true],
  ] as const) {
    if (group.length === 0) continue;
    const specs = group.map((p) => `${p.name}@${p.version}`);

    switch (pm) {
      case "yarn": {
        const args = ["add"];
        if (isDev) args.push("--dev");
        args.push(...specs);
        commands.push({ bin: "yarn", args });
        break;
      }
      case "pnpm": {
        const args = ["add"];
        if (isDev) args.push("--save-dev");
        args.push(...specs);
        commands.push({ bin: "pnpm", args });
        break;
      }
      default: {
        const args = ["install"];
        if (isDev) args.push("--save-dev");
        args.push(...specs);
        commands.push({ bin: "npm", args });
        break;
      }
    }
  }

  return commands;
}

export async function installUpgrade(
  rootPath = process.cwd(),
  packages: PackageSpec[],
  analysis?: ProjectAnalysis,
): Promise<InstallResult[]> {
  const { packageManager } =
    analysis ?? (await analyzeProject(rootPath, false));
  const commands = buildInstallCommand(packageManager, packages);
  const results: InstallResult[] = [];

  for (const cmd of commands) {
    const fullCommand = [cmd.bin, ...cmd.args].join(" ");
    const result = await new Promise<InstallResult>((resolve) => {
      exec(
        fullCommand,
        { cwd: rootPath, timeout: 120_000 },
        (error, stdout, stderr) => {
          resolve({
            command: fullCommand,
            exitCode: error ? ((error as any).code ?? 1) : 0,
            stdout: truncateOutput(stdout),
            stderr: truncateOutput(stderr),
            packages,
          });
        },
      );
    });
    results.push(result);
  }

  return results;
}
