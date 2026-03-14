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
): InstallCommand {
  const specs = packages.map((p) => `${p.name}@${p.version}`);
  const hasDev = packages.some((p) => p.dev);

  switch (pm) {
    case "yarn": {
      const args = ["add"];
      if (hasDev) args.push("--dev");
      args.push(...specs);
      return { bin: "yarn", args };
    }
    case "pnpm": {
      const args = ["add"];
      if (hasDev) args.push("--save-dev");
      args.push(...specs);
      return { bin: "pnpm", args };
    }
    default: {
      const args = ["install"];
      if (hasDev) args.push("--save-dev");
      args.push(...specs);
      return { bin: "npm", args };
    }
  }
}

export async function installUpgrade(
  rootPath = process.cwd(),
  packages: PackageSpec[],
  analysis?: ProjectAnalysis,
): Promise<InstallResult> {
  const { packageManager } =
    analysis ?? (await analyzeProject(rootPath, false));
  const cmd = buildInstallCommand(packageManager, packages);
  const fullCommand = [cmd.bin, ...cmd.args].join(" ");

  return new Promise((resolve) => {
    exec(
      fullCommand,
      { cwd: rootPath, timeout: 120_000 },
      (error, stdout, stderr) => {
        resolve({
          command: fullCommand,
          exitCode: error ? (error as any).code ?? 1 : 0,
          stdout: truncateOutput(stdout),
          stderr: truncateOutput(stderr),
          packages,
        });
      },
    );
  });
}
