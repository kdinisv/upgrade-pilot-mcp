import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import semver from "semver";
import {
  type BreakingChangeReference,
  type CodemodChange,
  type ConfigPresence,
  type DependencyEntry,
  type DeprecationFinding,
  type PackageManager,
  type ProjectAnalysis,
  SUPPORTED_PACKAGES,
  type SupportedPackageName,
  type UpgradePathResult,
  type UpgradePlan,
} from "../types.js";
import {
  countRegexMatches,
  fileExists,
  findAllExisting,
  findFirstExisting,
  findLineNumber,
  readJsoncFile,
  readTextIfExists,
  relativeTo,
  walkFiles,
} from "./fs-utils.js";

const execFileAsync = promisify(execFile);

const PACKAGE_GUIDES: Record<string, BreakingChangeReference> = {
  typescript: {
    packageName: "typescript",
    guides: [
      {
        title: "TypeScript release notes",
        url: "https://www.typescriptlang.org/docs/handbook/release-notes/overview.html",
      },
    ],
    risks: [
      "Tighter type checking can surface latent errors.",
      "Compiler option defaults and module-resolution behavior can shift across majors.",
    ],
  },
  eslint: {
    packageName: "eslint",
    guides: [
      {
        title: "ESLint migration guide",
        url: "https://eslint.org/docs/latest/use/migrate-to-9.0.0",
      },
      {
        title: "ESLint configuration migration",
        url: "https://eslint.org/docs/latest/use/configure/migration-guide",
      },
    ],
    risks: [
      "ESLint 9 centers flat config and may break legacy config assumptions.",
      "Plugin and parser compatibility must be verified alongside the core upgrade.",
    ],
  },
  vite: {
    packageName: "vite",
    guides: [
      {
        title: "Vite migration guide",
        url: "https://vite.dev/guide/migration.html",
      },
    ],
    risks: [
      "Node.js support ranges change over time.",
      "Plugin ecosystems can lag behind new Vite majors.",
    ],
  },
  vitest: {
    packageName: "vitest",
    guides: [
      {
        title: "Vitest migration guide",
        url: "https://vitest.dev/guide/migration",
      },
    ],
    risks: [
      "Environment defaults and snapshot behavior can differ across majors.",
      "Reporter and coverage integrations should be revalidated.",
    ],
  },
  vue: {
    packageName: "vue",
    guides: [
      { title: "Vue migration guide", url: "https://v3-migration.vuejs.org/" },
    ],
    risks: [
      "Template compiler and macro semantics should be retested.",
      "Library compatibility matters as much as the framework version itself.",
    ],
  },
  nuxt: {
    packageName: "nuxt",
    guides: [
      {
        title: "Nuxt upgrade guide",
        url: "https://nuxt.com/docs/getting-started/upgrade",
      },
    ],
    risks: [
      "Nuxt upgrades often include runtime and config behavior changes.",
      "Modules and auto-import behavior need targeted validation.",
    ],
  },
  prisma: {
    packageName: "prisma",
    guides: [
      {
        title: "Prisma upgrade guides",
        url: "https://www.prisma.io/docs/orm/more/upgrade-guides",
      },
      {
        title: "Prisma release notes",
        url: "https://github.com/prisma/prisma/releases",
      },
    ],
    risks: [
      "Schema settings and generated client types can change across majors.",
      "Migration and engine behavior must be validated against the target database.",
    ],
  },
  "@prisma/client": {
    packageName: "@prisma/client",
    guides: [
      {
        title: "Prisma upgrade guides",
        url: "https://www.prisma.io/docs/orm/more/upgrade-guides",
      },
    ],
    risks: [
      "Client and CLI versions should be kept aligned.",
      "Generated client changes can cascade into TypeScript compile failures.",
    ],
  },
  express: {
    packageName: "express",
    guides: [
      {
        title: "Express change log",
        url: "https://github.com/expressjs/express/blob/master/History.md",
      },
    ],
    risks: [
      "Middleware ordering and async error handling should be revalidated.",
      "Third-party middleware compatibility may block major upgrades.",
    ],
  },
  fastify: {
    packageName: "fastify",
    guides: [
      {
        title: "Fastify migration guide",
        url: "https://fastify.dev/docs/latest/Guides/Migration-Guide/",
      },
    ],
    risks: [
      "Plugin compatibility is the main upgrade risk.",
      "Type-provider integrations should be checked after the bump.",
    ],
  },
};

const TS_CONFIG_CANDIDATES = ["tsconfig.json", "tsconfig.base.json"];
const ESLINT_CANDIDATES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.mjs",
  ".eslintrc.json",
  ".eslintrc.yaml",
  ".eslintrc.yml",
];
const VITE_CANDIDATES = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
];
const VITEST_CANDIDATES = [
  "vitest.config.ts",
  "vitest.config.mts",
  "vitest.config.js",
  "vitest.config.mjs",
  "vitest.config.cjs",
];
const JEST_CANDIDATES = [
  "jest.config.ts",
  "jest.config.js",
  "jest.config.cjs",
  "jest.config.mjs",
];
const NUXT_CANDIDATES = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"];
const PRISMA_CANDIDATES = ["prisma/schema.prisma"];
const LOCKFILE_CANDIDATES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
];

const latestVersionCache = new Map<string, string | null>();

interface PackageJsonShape {
  name?: string;
  packageManager?: string;
  engines?: { node?: string };
  scripts?: Record<string, string>;
  workspaces?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function inferPackageManager(
  packageManagerField: string | null,
  lockfile: string | null,
): PackageManager {
  if (
    packageManagerField?.startsWith("pnpm@") ||
    lockfile?.endsWith("pnpm-lock.yaml")
  ) {
    return "pnpm";
  }
  if (
    packageManagerField?.startsWith("yarn@") ||
    lockfile?.endsWith("yarn.lock")
  ) {
    return "yarn";
  }
  if (
    packageManagerField?.startsWith("bun@") ||
    lockfile?.endsWith("bun.lock") ||
    lockfile?.endsWith("bun.lockb")
  ) {
    return "bun";
  }
  if (
    packageManagerField?.startsWith("npm@") ||
    lockfile?.endsWith("package-lock.json")
  ) {
    return "npm";
  }
  return "unknown";
}

function flattenDependencies(packageJson: PackageJsonShape): DependencyEntry[] {
  const output: DependencyEntry[] = [];
  const sections: Array<DependencyEntry["section"]> = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  for (const section of sections) {
    const entries = packageJson[section] ?? {};
    for (const [name, versionRange] of Object.entries(entries)) {
      output.push({ name, versionRange, section });
    }
  }

  return output.sort((left, right) => left.name.localeCompare(right.name));
}

function detectStack(
  dependencies: DependencyEntry[],
  configPresence: ConfigPresence,
): string[] {
  const stack = new Set<string>();
  const names = new Set(dependencies.map((dependency) => dependency.name));

  if (names.has("typescript") || configPresence.tsconfig.length > 0)
    stack.add("typescript");
  if (names.has("eslint") || configPresence.eslint.length > 0)
    stack.add("eslint");
  if (names.has("vite") || configPresence.vite.length > 0) stack.add("vite");
  if (names.has("vitest") || configPresence.vitest.length > 0)
    stack.add("vitest");
  if (names.has("jest") || configPresence.jest.length > 0) stack.add("jest");
  if (names.has("vue")) stack.add("vue");
  if (names.has("nuxt") || configPresence.nuxt.length > 0) stack.add("nuxt");
  if (
    names.has("prisma") ||
    names.has("@prisma/client") ||
    configPresence.prisma.length > 0
  )
    stack.add("prisma");
  if (names.has("express")) stack.add("express");
  if (names.has("fastify")) stack.add("fastify");

  return [...stack];
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
      {
        timeout: 10000,
        windowsHide: true,
      },
    );
    const latestVersion = JSON.parse(stdout.trim()) as string;
    latestVersionCache.set(packageName, latestVersion);
    return latestVersion;
  } catch {
    latestVersionCache.set(packageName, null);
    return null;
  }
}

export async function analyzeProject(
  rootPath = process.cwd(),
  includeScripts = true,
): Promise<ProjectAnalysis> {
  const packageJsonPath = await findFirstExisting(rootPath, ["package.json"]);
  const lockfile = await findFirstExisting(rootPath, LOCKFILE_CANDIDATES);
  const packageJson = packageJsonPath
    ? await readJsoncFile<PackageJsonShape>(packageJsonPath)
    : null;

  const configPresence: ConfigPresence = {
    tsconfig: (await findAllExisting(rootPath, TS_CONFIG_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    eslint: (await findAllExisting(rootPath, ESLINT_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    vite: (await findAllExisting(rootPath, VITE_CANDIDATES)).map((filePath) =>
      relativeTo(rootPath, filePath),
    ),
    vitest: (await findAllExisting(rootPath, VITEST_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    jest: (await findAllExisting(rootPath, JEST_CANDIDATES)).map((filePath) =>
      relativeTo(rootPath, filePath),
    ),
    nuxt: (await findAllExisting(rootPath, NUXT_CANDIDATES)).map((filePath) =>
      relativeTo(rootPath, filePath),
    ),
    prisma: (await findAllExisting(rootPath, PRISMA_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
  };

  const dependencies = packageJson ? flattenDependencies(packageJson) : [];
  const supportedDependencySet = new Set(SUPPORTED_PACKAGES);
  const supportedDependencies = dependencies.filter((dependency) =>
    supportedDependencySet.has(dependency.name as SupportedPackageName),
  );
  const warnings: string[] = [];

  if (!packageJsonPath) {
    warnings.push("package.json was not found at the provided rootPath.");
  }
  if (packageJson && !packageJson.engines?.node) {
    warnings.push(
      "Node.js engine is not pinned in package.json. Upgrade planning will have to infer runtime constraints from dependencies.",
    );
  }
  if (
    configPresence.eslint.some((filePath) => filePath.startsWith(".eslintrc"))
  ) {
    warnings.push(
      "Legacy ESLint config files are present. ESLint 9 migrations should verify flat config readiness.",
    );
  }
  if (
    configPresence.prisma.length > 0 &&
    !supportedDependencies.some((dependency) => dependency.name === "prisma")
  ) {
    warnings.push(
      "Prisma schema is present without a prisma package dependency. Tooling may be managed outside package.json.",
    );
  }

  return {
    rootPath,
    packageJsonPath: packageJsonPath
      ? relativeTo(rootPath, packageJsonPath)
      : null,
    packageManager: inferPackageManager(
      packageJson?.packageManager ?? null,
      lockfile ? relativeTo(rootPath, lockfile) : null,
    ),
    lockfile: lockfile ? relativeTo(rootPath, lockfile) : null,
    packageName: packageJson?.name ?? null,
    packageManagerField: packageJson?.packageManager ?? null,
    nodeEngines: packageJson?.engines?.node ?? null,
    scripts: includeScripts ? (packageJson?.scripts ?? {}) : {},
    dependencies,
    supportedDependencies,
    configPresence,
    detectedStack: detectStack(dependencies, configPresence),
    isWorkspace:
      Array.isArray(packageJson?.workspaces) ||
      typeof packageJson?.workspaces === "object",
    warnings,
  };
}

export async function detectUpgradePaths(
  rootPath = process.cwd(),
  targets?: string[],
): Promise<UpgradePathResult[]> {
  const analysis = await analyzeProject(rootPath, false);
  const selectedTargets = new Set(
    targets && targets.length > 0
      ? targets
      : analysis.supportedDependencies.map((dependency) => dependency.name),
  );
  const candidates = analysis.supportedDependencies.filter((dependency) =>
    selectedTargets.has(dependency.name),
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

      const stepMajors = [];
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

export async function findBreakingChanges(
  rootPath = process.cwd(),
  targets?: string[],
): Promise<BreakingChangeReference[]> {
  const analysis = await analyzeProject(rootPath, false);
  const selectedTargets = new Set(
    targets && targets.length > 0
      ? targets
      : analysis.supportedDependencies.map((dependency) => dependency.name),
  );

  return [...selectedTargets]
    .map((packageName) => PACKAGE_GUIDES[packageName])
    .filter((entry): entry is BreakingChangeReference => Boolean(entry))
    .sort((left, right) => left.packageName.localeCompare(right.packageName));
}

interface PatternRule {
  ruleId: string;
  packageName: string;
  severity: DeprecationFinding["severity"];
  matcher: RegExp;
  appliesTo: (relativePath: string) => boolean;
  message: string;
  recommendation: string;
}

const DEPRECATION_RULES: PatternRule[] = [
  {
    ruleId: "eslint-legacy-config-file",
    packageName: "eslint",
    severity: "warning",
    matcher: /^/m,
    appliesTo: (relativePath) =>
      path.posix.basename(relativePath).startsWith(".eslintrc"),
    message: "Legacy .eslintrc config detected.",
    recommendation:
      "Plan a flat-config migration before or alongside ESLint 9.",
  },
  {
    ruleId: "vite-commonjs-config",
    packageName: "vite",
    severity: "warning",
    matcher: /module\.exports|require\s*\(/,
    appliesTo: (relativePath) =>
      relativePath.startsWith("vite.config.") ||
      relativePath.startsWith("vitest.config."),
    message: "CommonJS-style config detected in Vite or Vitest configuration.",
    recommendation: "Verify ESM compatibility before upgrading the toolchain.",
  },
  {
    ruleId: "prisma-referential-integrity",
    packageName: "prisma",
    severity: "high",
    matcher: /referentialIntegrity\s*=\s*"[^"]+"/,
    appliesTo: (relativePath) => relativePath === "prisma/schema.prisma",
    message: "Deprecated Prisma schema setting referentialIntegrity detected.",
    recommendation:
      "Replace referentialIntegrity with relationMode before a Prisma upgrade.",
  },
];

export async function scanRepoForDeprecations(
  rootPath = process.cwd(),
  targets?: string[],
  maxFindings = 100,
): Promise<DeprecationFinding[]> {
  const analysis = await analyzeProject(rootPath, false);
  const selectedTargets = new Set(
    targets && targets.length > 0 ? targets : analysis.detectedStack,
  );
  const candidateRules = DEPRECATION_RULES.filter((rule) =>
    selectedTargets.has(rule.packageName),
  );
  const allFiles = await walkFiles(rootPath);
  const findings: DeprecationFinding[] = [];

  for (const absolutePath of allFiles) {
    const relativePath = relativeTo(rootPath, absolutePath);
    const content = await readTextIfExists(absolutePath);
    if (content === null) {
      continue;
    }

    for (const rule of candidateRules) {
      if (!rule.appliesTo(relativePath)) {
        continue;
      }
      if (!rule.matcher.test(content)) {
        continue;
      }

      findings.push({
        ruleId: rule.ruleId,
        packageName: rule.packageName,
        severity: rule.severity,
        filePath: relativePath,
        line: findLineNumber(content, rule.matcher),
        message: rule.message,
        recommendation: rule.recommendation,
      });

      if (findings.length >= maxFindings) {
        return findings;
      }
    }
  }

  return findings;
}

export async function generateUpgradePlan(
  rootPath = process.cwd(),
  targets?: string[],
): Promise<UpgradePlan> {
  const analysis = await analyzeProject(rootPath, true);
  const paths = await detectUpgradePaths(rootPath, targets);
  const breakingChanges = await findBreakingChanges(rootPath, targets);
  const findings = await scanRepoForDeprecations(rootPath, targets, 50);

  const phases = [];
  const recommendedTargets = paths
    .filter((entry) => entry.status !== "up-to-date")
    .map((entry) => entry.packageName);

  phases.push({
    id: "baseline",
    title: "Establish runtime and dependency baseline",
    rationale:
      "Runtime constraints and package manager state define the safe order of operations.",
    actions: [
      analysis.nodeEngines
        ? `Confirm Node.js satisfies ${analysis.nodeEngines}.`
        : "Pin a supported Node.js engine before upgrading the stack.",
      analysis.lockfile
        ? `Keep ${analysis.lockfile} in sync during each upgrade step.`
        : "Generate and commit a lockfile before applying dependency changes.",
      analysis.isWorkspace
        ? "Validate workspace boundaries before changing versions."
        : "Repository appears to be a single-package project.",
    ],
    risks: analysis.warnings,
  });

  if (recommendedTargets.length > 0) {
    phases.push({
      id: "deps",
      title: "Upgrade dependencies in constrained groups",
      rationale:
        "Foundational tooling should move before app-level packages to reduce the blast radius.",
      actions: paths.flatMap((entry) => entry.suggestedSteps.slice(0, 2)),
      risks: paths.flatMap((entry) => entry.notes),
    });
  }

  phases.push({
    id: "migration-guides",
    title: "Review curated migration guides",
    rationale:
      "Major upgrades should be constrained by official migration notes and known risk areas.",
    actions: breakingChanges.flatMap((entry) =>
      entry.guides.map(
        (guide) => `Read ${entry.packageName}: ${guide.title} (${guide.url})`,
      ),
    ),
    risks: breakingChanges.flatMap((entry) => entry.risks),
  });

  phases.push({
    id: "repo-fixes",
    title: "Address high-signal repo-level migration issues",
    rationale:
      "Known deprecated patterns should be eliminated before full validation.",
    actions:
      findings.length > 0
        ? findings.map(
            (finding) =>
              `Fix ${finding.ruleId} in ${finding.filePath}:${finding.line}. ${finding.recommendation}`,
          )
        : [
            "No high-signal migration findings were detected for the supported route.",
          ],
    risks: findings.map((finding) => finding.message),
  });

  phases.push({
    id: "validation",
    title: "Run validation after each upgrade tranche",
    rationale:
      "Small validation cycles reduce ambiguity when semver, types, config, and runtime all move together.",
    actions: [
      "Run type-checking.",
      "Run linting.",
      "Run tests.",
      "Run a production build if the project has one.",
    ],
    risks: [
      "Do not batch multiple major upgrades without an intermediate validation checkpoint.",
    ],
  });

  return {
    summary:
      recommendedTargets.length > 0
        ? `Upgrade plan generated for ${recommendedTargets.join(", ")}.`
        : "Project appears close to current majors for the supported route; focus on minor updates and validation.",
    recommendedTargets,
    phases,
    validationChecklist: [
      "Type-check passes.",
      "Lint passes.",
      "Tests pass.",
      "Build passes.",
    ],
  };
}

export async function applySafeCodemods(
  rootPath = process.cwd(),
  mode: "dry-run" | "apply" = "dry-run",
  codemodIds?: string[],
): Promise<{
  mode: "dry-run" | "apply";
  changes: CodemodChange[];
  unsupportedCodemods: string[];
}> {
  const selectedCodemods = new Set(
    codemodIds && codemodIds.length > 0 ? codemodIds : ["prisma-relation-mode"],
  );
  const unsupportedCodemods = [...selectedCodemods].filter(
    (codemodId) => codemodId !== "prisma-relation-mode",
  );
  const changes: CodemodChange[] = [];

  if (selectedCodemods.has("prisma-relation-mode")) {
    const schemaPath = path.join(rootPath, "prisma/schema.prisma");
    const schema = await readTextIfExists(schemaPath);
    if (schema !== null) {
      const matcher = /referentialIntegrity(\s*=\s*"[^"]+")/g;
      const replacements = countRegexMatches(schema, matcher);
      const updatedSchema = schema.replaceAll(matcher, "relationMode$1");
      const changed = updatedSchema !== schema;
      if (changed && mode === "apply") {
        await fs.writeFile(schemaPath, updatedSchema, "utf8");
      }

      changes.push({
        codemodId: "prisma-relation-mode",
        filePath: relativeTo(rootPath, schemaPath),
        replacements,
        changed: mode === "apply" ? changed : false,
      });
    }
  }

  return {
    mode,
    changes,
    unsupportedCodemods,
  };
}

export async function writeUpgradePrSummary(
  rootPath = process.cwd(),
  targets?: string[],
): Promise<string> {
  const analysis = await analyzeProject(rootPath, true);
  const paths = await detectUpgradePaths(rootPath, targets);
  const findings = await scanRepoForDeprecations(rootPath, targets, 20);
  const plan = await generateUpgradePlan(rootPath, targets);

  const upgradeLines =
    paths.length > 0
      ? paths
          .map(
            (entry) =>
              `- ${entry.packageName}: ${entry.currentRange} -> ${entry.latestVersion ?? "unknown latest"} (${entry.status})`,
          )
          .join("\n")
      : "- No supported upgrade targets detected.";

  const findingLines =
    findings.length > 0
      ? findings
          .map(
            (finding) =>
              `- ${finding.filePath}:${finding.line} ${finding.message}`,
          )
          .join("\n")
      : "- No high-signal migration findings detected.";

  return [
    "# Upgrade summary",
    "",
    `Target package: ${analysis.packageName ?? "unknown project"}`,
    `Detected stack: ${analysis.detectedStack.join(", ") || "no supported stack tags detected"}`,
    "",
    "## Proposed upgrade route",
    upgradeLines,
    "",
    "## Risks and findings",
    findingLines,
    "",
    "## Plan",
    ...plan.phases.map((phase) => `- ${phase.title}: ${phase.rationale}`),
    "",
    "## Validation checklist",
    ...plan.validationChecklist.map((item) => `- ${item}`),
  ].join("\n");
}
