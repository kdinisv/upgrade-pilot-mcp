import {
  type ConfigPresence,
  type DependencyEntry,
  type PackageManager,
  type ProjectAnalysis,
  SUPPORTED_PACKAGES,
  SUPPORTED_PACKAGE_PREFIXES,
} from "../types.js";
import {
  findAllExisting,
  findFirstExisting,
  readJsoncFile,
  relativeTo,
} from "./fs-utils.js";

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

const NEXT_CANDIDATES = [
  "next.config.ts",
  "next.config.mts",
  "next.config.js",
  "next.config.mjs",
  "next.config.cjs",
];

const NUXT_CANDIDATES = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"];

const ASTRO_CANDIDATES = [
  "astro.config.ts",
  "astro.config.mts",
  "astro.config.js",
  "astro.config.mjs",
  "astro.config.cjs",
];

const SVELTE_CANDIDATES = [
  "svelte.config.ts",
  "svelte.config.js",
  "svelte.config.mjs",
  "svelte.config.cjs",
];

const TAILWIND_CANDIDATES = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
];

const PLAYWRIGHT_CANDIDATES = [
  "playwright.config.ts",
  "playwright.config.js",
  "playwright.config.mjs",
  "playwright.config.cjs",
];

const CYPRESS_CANDIDATES = [
  "cypress.config.ts",
  "cypress.config.js",
  "cypress.config.mjs",
  "cypress.config.cjs",
];

const STORYBOOK_CANDIDATES = [
  ".storybook/main.ts",
  ".storybook/main.js",
  ".storybook/main.mts",
  ".storybook/main.mjs",
  ".storybook/main.cjs",
];

const NEST_CANDIDATES = ["nest-cli.json"];

const REMIX_CANDIDATES = [
  "remix.config.ts",
  "remix.config.js",
  "remix.config.mjs",
  "remix.config.cjs",
];

const ANGULAR_CANDIDATES = ["angular.json"];

const PRISMA_CANDIDATES = ["prisma/schema.prisma"];

const LOCKFILE_CANDIDATES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
];

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

function hasPackage(names: Set<string>, matcher: string): boolean {
  if (matcher.endsWith("/")) {
    return [...names].some((name) => name.startsWith(matcher));
  }

  return names.has(matcher);
}

function isSupportedDependency(name: string): boolean {
  return (
    SUPPORTED_PACKAGES.includes(name as (typeof SUPPORTED_PACKAGES)[number]) ||
    SUPPORTED_PACKAGE_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

function detectStack(
  dependencies: DependencyEntry[],
  configPresence: ConfigPresence,
): string[] {
  const stack = new Set<string>();
  const names = new Set(dependencies.map((d) => d.name));

  if (names.has("typescript") || configPresence.tsconfig.length > 0)
    stack.add("typescript");
  if (names.has("eslint") || configPresence.eslint.length > 0)
    stack.add("eslint");
  if (names.has("vite") || configPresence.vite.length > 0) stack.add("vite");
  if (names.has("vitest") || configPresence.vitest.length > 0)
    stack.add("vitest");
  if (names.has("jest") || configPresence.jest.length > 0) stack.add("jest");
  if (names.has("react") || names.has("react-dom")) stack.add("react");
  if (names.has("next") || configPresence.next.length > 0) stack.add("next");
  if (names.has("vue")) stack.add("vue");
  if (names.has("nuxt") || configPresence.nuxt.length > 0) stack.add("nuxt");
  if (names.has("astro") || configPresence.astro.length > 0) stack.add("astro");
  if (names.has("@sveltejs/kit") || configPresence.svelte.length > 0)
    stack.add("sveltekit");
  if (
    names.has("prisma") ||
    names.has("@prisma/client") ||
    configPresence.prisma.length > 0
  )
    stack.add("prisma");
  if (names.has("tailwindcss") || configPresence.tailwind.length > 0)
    stack.add("tailwindcss");
  if (
    names.has("@playwright/test") ||
    names.has("playwright") ||
    configPresence.playwright.length > 0
  ) {
    stack.add("playwright");
  }
  if (names.has("cypress") || configPresence.cypress.length > 0) {
    stack.add("cypress");
  }
  if (
    names.has("storybook") ||
    hasPackage(names, "@storybook/") ||
    configPresence.storybook.length > 0
  ) {
    stack.add("storybook");
  }
  if (names.has("express")) stack.add("express");
  if (names.has("fastify")) stack.add("fastify");
  if (
    names.has("@nestjs/core") ||
    hasPackage(names, "@nestjs/") ||
    configPresence.nest.length > 0
  ) {
    stack.add("nestjs");
  }
  if (
    names.has("@remix-run/react") ||
    names.has("@remix-run/node") ||
    hasPackage(names, "@remix-run/") ||
    configPresence.remix.length > 0
  ) {
    stack.add("remix");
  }
  if (hasPackage(names, "@angular/") || configPresence.angular.length > 0) {
    stack.add("angular");
  }

  return [...stack];
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
    next: (await findAllExisting(rootPath, NEXT_CANDIDATES)).map((filePath) =>
      relativeTo(rootPath, filePath),
    ),
    nuxt: (await findAllExisting(rootPath, NUXT_CANDIDATES)).map((filePath) =>
      relativeTo(rootPath, filePath),
    ),
    astro: (await findAllExisting(rootPath, ASTRO_CANDIDATES)).map((filePath) =>
      relativeTo(rootPath, filePath),
    ),
    svelte: (await findAllExisting(rootPath, SVELTE_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    tailwind: (await findAllExisting(rootPath, TAILWIND_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    playwright: (await findAllExisting(rootPath, PLAYWRIGHT_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    cypress: (await findAllExisting(rootPath, CYPRESS_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    storybook: (await findAllExisting(rootPath, STORYBOOK_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    nest: (await findAllExisting(rootPath, NEST_CANDIDATES)).map((filePath) =>
      relativeTo(rootPath, filePath),
    ),
    remix: (await findAllExisting(rootPath, REMIX_CANDIDATES)).map((filePath) =>
      relativeTo(rootPath, filePath),
    ),
    angular: (await findAllExisting(rootPath, ANGULAR_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
    prisma: (await findAllExisting(rootPath, PRISMA_CANDIDATES)).map(
      (filePath) => relativeTo(rootPath, filePath),
    ),
  };

  const dependencies = packageJson ? flattenDependencies(packageJson) : [];
  const supportedDependencies = dependencies.filter((d) =>
    isSupportedDependency(d.name),
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
    !supportedDependencies.some((d) => d.name === "prisma")
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
      packageJson?.workspaces != null &&
      typeof packageJson.workspaces === "object",
    warnings,
  };
}
