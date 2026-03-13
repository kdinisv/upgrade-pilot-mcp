import { execFile } from "node:child_process";
import { promisify } from "node:util";
import semver from "semver";
import { type ProjectAnalysis, type UpgradePathResult } from "../types.js";
import { analyzeProject } from "./analyzer.js";

const execFileAsync = promisify(execFile);
const latestVersionCache = new Map<string, string | null>();

function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function sanitizeRange(versionRange: string): string {
  if (versionRange.startsWith("workspace:")) {
    return versionRange.slice("workspace:".length);
  }
  return versionRange;
}

async function resolveLatestVersion(
  packageName: string,
): Promise<string | null> {
  if (latestVersionCache.has(packageName)) {
    return latestVersionCache.get(packageName) ?? null;
  }

  try {
    const { stdout } = await execFileAsync(
      getNpmCommand(),
      ["view", packageName, "version", "--json"],
      { timeout: 10000, windowsHide: true },
    );
    const latestVersion = JSON.parse(stdout.trim()) as string;
    latestVersionCache.set(packageName, latestVersion);
    return latestVersion;
  } catch {
    latestVersionCache.set(packageName, null);
    return null;
  }
}

export async function detectUpgradePaths(
  rootPath = process.cwd(),
  targets?: string[],
  analysis?: ProjectAnalysis,
): Promise<UpgradePathResult[]> {
  const projectAnalysis = analysis ?? (await analyzeProject(rootPath, false));
  const selectedTargets = new Set(
    targets && targets.length > 0
      ? targets
      : projectAnalysis.supportedDependencies.map((d) => d.name),
  );
  const candidates = projectAnalysis.supportedDependencies.filter((d) =>
    selectedTargets.has(d.name),
  );

  const results = await Promise.all(
    candidates.map(async (dependency): Promise<UpgradePathResult> => {
      const currentRange = dependency.versionRange;
      const normalizedRange = sanitizeRange(currentRange);
      const currentVersion =
        semver.minVersion(normalizedRange)?.version ?? null;
      const currentMajor = currentVersion
        ? (semver.parse(currentVersion)?.major ?? null)
        : null;
      const latestVersion = await resolveLatestVersion(dependency.name);
      const latestMajor = latestVersion
        ? (semver.parse(latestVersion)?.major ?? null)
        : null;
      const notes: string[] = [];

      if (currentVersion === null) {
        notes.push(`Could not normalize installed range ${currentRange}.`);
      }
      if (latestVersion === null) {
        notes.push("Could not resolve the latest published version from npm.");
      }

      if (currentMajor === null || latestMajor === null) {
        return {
          packageName: dependency.name,
          currentRange,
          currentVersion,
          currentMajor,
          latestVersion,
          latestMajor,
          status: "unknown",
          suggestedSteps: [],
          notes,
        };
      }

      if (latestMajor < currentMajor || latestVersion === currentVersion) {
        return {
          packageName: dependency.name,
          currentRange,
          currentVersion,
          currentMajor,
          latestVersion,
          latestMajor,
          status: "up-to-date",
          suggestedSteps: [`Keep ${dependency.name} on ${latestVersion}.`],
          notes,
        };
      }

      if (latestMajor === currentMajor) {
        return {
          packageName: dependency.name,
          currentRange,
          currentVersion,
          currentMajor,
          latestVersion,
          latestMajor,
          status: "minor-or-patch",
          suggestedSteps: [
            `Upgrade ${dependency.name} within major ${currentMajor} to ${latestVersion}.`,
          ],
          notes,
        };
      }

      const stepMajors: number[] = [];
      for (let major = currentMajor + 1; major <= latestMajor; major += 1) {
        stepMajors.push(major);
      }

      return {
        packageName: dependency.name,
        currentRange,
        currentVersion,
        currentMajor,
        latestVersion,
        latestMajor,
        status:
          latestMajor - currentMajor === 1 ? "direct-major" : "multi-major",
        suggestedSteps: stepMajors.map(
          (major) =>
            `Upgrade ${dependency.name} to ^${major}.0.0 and validate before the next jump.`,
        ),
        notes,
      };
    }),
  );

  return results.sort((left, right) =>
    left.packageName.localeCompare(right.packageName),
  );
}
