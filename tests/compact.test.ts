import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compactAnalysis,
  compactPaths,
  compactBreakingChanges,
  compactFindings,
  compactValidation,
} from "../src/lib/compact.js";
import type {
  ProjectAnalysis,
  UpgradePathResult,
  BreakingChangeReference,
  DeprecationFinding,
  ValidationCommandResult,
} from "../src/types.js";

describe("compact output helpers", () => {
  it("compactAnalysis should strip heavy fields", () => {
    const full: ProjectAnalysis = {
      rootPath: "/project",
      packageJsonPath: "/project/package.json",
      packageManager: "npm",
      lockfile: "package-lock.json",
      packageName: "my-app",
      packageManagerField: "npm@10.0.0",
      nodeEngines: ">=20",
      scripts: { build: "tsc", test: "jest", lint: "eslint ." },
      dependencies: [
        { name: "react", versionRange: "^18.0.0", section: "dependencies" },
        { name: "lodash", versionRange: "^4.0.0", section: "dependencies" },
      ],
      supportedDependencies: [
        { name: "react", versionRange: "^18.0.0", section: "dependencies" },
      ],
      configPresence: {
        tsconfig: ["tsconfig.json"],
        eslint: [".eslintrc.js"],
        prettier: [], postcss: [], webpack: [], rollup: [],
        vite: [], vitest: [], jest: ["jest.config.js"], mocha: [],
        babel: [], swc: [], next: [], nuxt: [], astro: [], svelte: [],
        tailwind: [], playwright: [], cypress: [], storybook: [],
        husky: [], lintStaged: [], commitlint: [], turbo: [], nx: [],
        nest: [], remix: [], angular: [], prisma: [],
      },
      detectedStack: ["react", "typescript", "jest"],
      isWorkspace: false,
      warnings: ["Node.js engine is not pinned"],
    };

    const compact = compactAnalysis(full);

    assert.strictEqual(compact.packageName, "my-app");
    assert.strictEqual(compact.packageManager, "npm");
    assert.deepStrictEqual(compact.detectedStack, ["react", "typescript", "jest"]);
    assert.deepStrictEqual(compact.warnings, ["Node.js engine is not pinned"]);
    assert.strictEqual(compact.supportedCount, 1);
    assert.strictEqual(compact.totalDependencies, 2);
    // Heavy fields removed
    assert.strictEqual("dependencies" in compact, false);
    assert.strictEqual("configPresence" in compact, false);
    assert.strictEqual("scripts" in compact, false);
  });

  it("compactPaths should keep only actionable info", () => {
    const paths: UpgradePathResult[] = [
      {
        packageName: "react",
        currentRange: "^17.0.0",
        currentVersion: "17.0.2",
        currentMajor: 17,
        latestVersion: "19.1.0",
        latestMajor: 19,
        status: "multi-major",
        suggestedSteps: [
          "Upgrade react to ^18.0.0",
          "Upgrade react to ^19.0.0",
        ],
        notes: ["Watch for breaking changes"],
      },
    ];

    const compact = compactPaths(paths);

    assert.strictEqual(compact.length, 1);
    assert.strictEqual(compact[0]!.packageName, "react");
    assert.strictEqual(compact[0]!.current, "17.0.2");
    assert.strictEqual(compact[0]!.latest, "19.1.0");
    assert.strictEqual(compact[0]!.status, "multi-major");
    assert.ok(compact[0]!.steps.length > 0);
    // Heavy fields removed
    assert.strictEqual("currentRange" in compact[0]!, false);
    assert.strictEqual("currentMajor" in compact[0]!, false);
  });

  it("compactBreakingChanges should limit risks", () => {
    const bc: BreakingChangeReference[] = [
      {
        packageName: "eslint",
        guides: [
          { title: "ESLint 9 migration", url: "https://eslint.org/docs/..." },
          { title: "Flat config guide", url: "https://eslint.org/docs/..." },
        ],
        risks: ["risk1", "risk2", "risk3"],
      },
    ];

    const compact = compactBreakingChanges(bc);
    assert.strictEqual(compact[0]!.packageName, "eslint");
    assert.strictEqual(compact[0]!.guideCount, 2);
    assert.ok(compact[0]!.topRisks.length <= 2);
  });

  it("compactFindings should keep essentials", () => {
    const findings: DeprecationFinding[] = [
      {
        ruleId: "eslint-legacy-config-file",
        packageName: "eslint",
        severity: "warning",
        filePath: ".eslintrc.js",
        line: 1,
        message: "Legacy config detected.",
        recommendation: "Migrate to flat config.",
      },
    ];

    const compact = compactFindings(findings);
    assert.strictEqual(compact[0]!.rule, "eslint-legacy-config-file");
    assert.strictEqual(compact[0]!.file, ".eslintrc.js:1");
    assert.strictEqual(compact[0]!.severity, "warning");
    assert.strictEqual("packageName" in compact[0]!, false);
  });

  it("compactValidation should strip stdout/stderr on success", () => {
    const results: ValidationCommandResult[] = [
      {
        kind: "types",
        command: "tsc --noEmit",
        exitCode: 0,
        status: "passed",
        stdout: "lots of output here",
        stderr: "",
      },
      {
        kind: "lint",
        command: "eslint .",
        exitCode: 1,
        status: "failed",
        stdout: "",
        stderr: "Error: something broke",
      },
    ];

    const compact = compactValidation(results);
    assert.strictEqual(compact[0]!.kind, "types");
    assert.strictEqual(compact[0]!.status, "passed");
    assert.strictEqual("stdout" in compact[0]!, false);
    // Failed results keep stderr
    assert.strictEqual(compact[1]!.kind, "lint");
    assert.strictEqual(compact[1]!.status, "failed");
    assert.ok("stderr" in compact[1]!);
  });
});
