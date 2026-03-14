import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ProjectAnalysis } from "../src/types.js";
import { detectUpgradePaths } from "../src/lib/upgrade-paths.js";
import { findBreakingChanges } from "../src/lib/breaking-changes.js";
import { scanRepoForDeprecations } from "../src/lib/deprecation-scanner.js";
import { validateUpgrade } from "../src/lib/validation.js";

const fakeAnalysis: ProjectAnalysis = {
  rootPath: "/fake",
  packageJsonPath: null,
  packageManager: "npm",
  lockfile: null,
  packageName: "fake-project",
  packageManagerField: null,
  nodeEngines: null,
  scripts: {},
  dependencies: [],
  supportedDependencies: [],
  configPresence: {
    hasTypeScript: false,
    hasEslint: false,
    hasPrettier: false,
    hasJest: false,
    hasVitest: false,
    hasTailwind: false,
    hasNextConfig: false,
    hasPrismaSchema: false,
  },
  detectedStack: [],
  isWorkspace: false,
  warnings: [],
};

describe("analysis caching – pass pre-built analysis", () => {
  it("detectUpgradePaths returns empty when analysis has no supported deps", async () => {
    const result = await detectUpgradePaths("/fake", undefined, fakeAnalysis);
    assert.deepStrictEqual(result, []);
  });

  it("findBreakingChanges returns empty when analysis has no supported deps", async () => {
    const result = await findBreakingChanges("/fake", undefined, fakeAnalysis);
    assert.deepStrictEqual(result, []);
  });

  it("scanRepoForDeprecations returns empty when analysis has empty stack", async () => {
    const result = await scanRepoForDeprecations(
      "/fake",
      undefined,
      100,
      fakeAnalysis,
    );
    assert.deepStrictEqual(result, []);
  });

  it("validateUpgrade uses provided analysis and skips all when no scripts", async () => {
    const result = await validateUpgrade(
      "/fake",
      ["types"],
      undefined,
      fakeAnalysis,
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].status, "skipped");
    assert.equal(result[0].kind, "types");
  });
});
