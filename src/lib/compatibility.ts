import { exec } from "node:child_process";
import semver from "semver";

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
  return new Promise((resolve) => {
    exec(
      `npm view ${pkg}@${version} peerDependencies --json`,
      { timeout: 30_000 },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve({});
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve({ peerDependencies: parsed });
        } catch {
          resolve({});
        }
      },
    );
  });
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
        if (installingVersion && !semver.satisfies(installingVersion, peerRange)) {
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
