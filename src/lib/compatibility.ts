import { execFile } from "node:child_process";
import { promisify } from "node:util";
import semver from "semver";

const execFileAsync = promisify(execFile);

function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export interface PeerCheckResult {
  package: string;
  version: string;
  peers: Record<string, string>;
  compatible: boolean;
  conflicts: string[];
}

interface NpmViewResult {
  peerDependencies?: Record<string, string>;
}

async function npmView(pkg: string, version: string): Promise<NpmViewResult> {
  try {
    const { stdout } = await execFileAsync(
      getNpmCommand(),
      ["view", `${pkg}@${version}`, "peerDependencies", "--json"],
      { timeout: 30_000, windowsHide: true },
    );
    if (!stdout.trim()) return {};
    return { peerDependencies: JSON.parse(stdout) };
  } catch {
    return {};
  }
}

export async function checkPeerCompatibility(
  packages: Array<{ name: string; version: string }>,
): Promise<PeerCheckResult[]> {
  const versionMap = new Map(packages.map((p) => [p.name, p.version]));

  const results = await Promise.all(
    packages.map(async (pkg): Promise<PeerCheckResult> => {
      const info = await npmView(pkg.name, pkg.version);
      const peers = info.peerDependencies ?? {};
      const conflicts: string[] = [];

      for (const [peerName, peerRange] of Object.entries(peers)) {
        const installingVersion = versionMap.get(peerName);
        if (
          installingVersion &&
          !semver.satisfies(installingVersion, peerRange)
        ) {
          conflicts.push(
            `${peerName}@${installingVersion} does not satisfy ${peerRange}`,
          );
        }
      }

      return {
        package: pkg.name,
        version: pkg.version,
        peers,
        compatible: conflicts.length === 0,
        conflicts,
      };
    }),
  );

  return results;
}
