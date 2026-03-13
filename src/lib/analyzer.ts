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

const CONFIG_REGISTRY: Record<keyof ConfigPresence, string[]> = {
  tsconfig: ["tsconfig.json", "tsconfig.base.json"],
  eslint: [
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
  ],
  prettier: [
    ".prettierrc",
    ".prettierrc.json",
    ".prettierrc.yaml",
    ".prettierrc.yml",
    ".prettierrc.js",
    ".prettierrc.cjs",
    ".prettierrc.mjs",
    "prettier.config.js",
    "prettier.config.cjs",
    "prettier.config.mjs",
    "prettier.config.ts",
  ],
  postcss: [
    "postcss.config.js",
    "postcss.config.cjs",
    "postcss.config.mjs",
    "postcss.config.ts",
  ],
  webpack: [
    "webpack.config.ts",
    "webpack.config.js",
    "webpack.config.mjs",
    "webpack.config.cjs",
  ],
  rollup: [
    "rollup.config.ts",
    "rollup.config.js",
    "rollup.config.mjs",
    "rollup.config.cjs",
  ],
  vite: [
    "vite.config.ts",
    "vite.config.mts",
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.cjs",
  ],
  vitest: [
    "vitest.config.ts",
    "vitest.config.mts",
    "vitest.config.js",
    "vitest.config.mjs",
    "vitest.config.cjs",
  ],
  jest: [
    "jest.config.ts",
    "jest.config.js",
    "jest.config.cjs",
    "jest.config.mjs",
  ],
  mocha: [
    ".mocharc.json",
    ".mocharc.yaml",
    ".mocharc.yml",
    ".mocharc.js",
    ".mocharc.cjs",
    ".mocharc.mjs",
  ],
  babel: [
    "babel.config.js",
    "babel.config.cjs",
    "babel.config.mjs",
    "babel.config.ts",
    ".babelrc",
    ".babelrc.json",
    ".babelrc.js",
    ".babelrc.cjs",
  ],
  swc: [".swcrc"],
  next: [
    "next.config.ts",
    "next.config.mts",
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
  ],
  nuxt: ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"],
  astro: [
    "astro.config.ts",
    "astro.config.mts",
    "astro.config.js",
    "astro.config.mjs",
    "astro.config.cjs",
  ],
  svelte: [
    "svelte.config.ts",
    "svelte.config.js",
    "svelte.config.mjs",
    "svelte.config.cjs",
  ],
  tailwind: [
    "tailwind.config.ts",
    "tailwind.config.js",
    "tailwind.config.mjs",
    "tailwind.config.cjs",
  ],
  playwright: [
    "playwright.config.ts",
    "playwright.config.js",
    "playwright.config.mjs",
    "playwright.config.cjs",
  ],
  cypress: [
    "cypress.config.ts",
    "cypress.config.js",
    "cypress.config.mjs",
    "cypress.config.cjs",
  ],
  storybook: [
    ".storybook/main.ts",
    ".storybook/main.js",
    ".storybook/main.mts",
    ".storybook/main.mjs",
    ".storybook/main.cjs",
  ],
  husky: [".husky/pre-commit", ".husky/commit-msg", ".husky/pre-push"],
  lintStaged: [
    ".lintstagedrc",
    ".lintstagedrc.json",
    ".lintstagedrc.yaml",
    ".lintstagedrc.yml",
    ".lintstagedrc.js",
    ".lintstagedrc.cjs",
    "lint-staged.config.js",
    "lint-staged.config.mjs",
    "lint-staged.config.cjs",
    "lint-staged.config.ts",
  ],
  commitlint: [
    "commitlint.config.js",
    "commitlint.config.cjs",
    "commitlint.config.mjs",
    "commitlint.config.ts",
  ],
  turbo: ["turbo.json"],
  nx: ["nx.json"],
  nest: ["nest-cli.json"],
  remix: [
    "remix.config.ts",
    "remix.config.js",
    "remix.config.mjs",
    "remix.config.cjs",
  ],
  angular: ["angular.json"],
  prisma: ["prisma/schema.prisma"],
};

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

interface StackDetectorEntry {
  tag: string;
  packages?: string[];
  prefixes?: string[];
  configKeys?: (keyof ConfigPresence)[];
}

const STACK_DETECTORS: StackDetectorEntry[] = [
  { tag: "typescript", packages: ["typescript"], configKeys: ["tsconfig"] },
  { tag: "eslint", packages: ["eslint"], configKeys: ["eslint"] },
  { tag: "prettier", packages: ["prettier"], configKeys: ["prettier"] },
  { tag: "postcss", packages: ["postcss"], configKeys: ["postcss"] },
  { tag: "webpack", packages: ["webpack"], configKeys: ["webpack"] },
  { tag: "rollup", packages: ["rollup"], configKeys: ["rollup"] },
  { tag: "esbuild", packages: ["esbuild"] },
  { tag: "vite", packages: ["vite"], configKeys: ["vite"] },
  { tag: "vitest", packages: ["vitest"], configKeys: ["vitest"] },
  { tag: "jest", packages: ["jest"], configKeys: ["jest"] },
  { tag: "mocha", packages: ["mocha"], configKeys: ["mocha"] },
  { tag: "babel", packages: ["@babel/core"], configKeys: ["babel"] },
  { tag: "swc", packages: ["@swc/core"], configKeys: ["swc"] },
  { tag: "react", packages: ["react", "react-dom"] },
  { tag: "react-router", packages: ["react-router"] },
  { tag: "redux", packages: ["redux", "@reduxjs/toolkit"] },
  { tag: "react-query", packages: ["@tanstack/react-query"] },
  { tag: "next", packages: ["next"], configKeys: ["next"] },
  { tag: "vue", packages: ["vue"] },
  { tag: "vue-router", packages: ["vue-router"] },
  { tag: "pinia", packages: ["pinia"] },
  { tag: "nuxt", packages: ["nuxt"], configKeys: ["nuxt"] },
  { tag: "astro", packages: ["astro"], configKeys: ["astro"] },
  { tag: "svelte", packages: ["svelte"] },
  { tag: "sveltekit", packages: ["@sveltejs/kit"], configKeys: ["svelte"] },
  {
    tag: "prisma",
    packages: ["prisma", "@prisma/client"],
    configKeys: ["prisma"],
  },
  { tag: "tailwindcss", packages: ["tailwindcss"], configKeys: ["tailwind"] },
  {
    tag: "playwright",
    packages: ["@playwright/test", "playwright"],
    configKeys: ["playwright"],
  },
  { tag: "cypress", packages: ["cypress"], configKeys: ["cypress"] },
  {
    tag: "storybook",
    packages: ["storybook"],
    prefixes: ["@storybook/"],
    configKeys: ["storybook"],
  },
  { tag: "husky", packages: ["husky"], configKeys: ["husky"] },
  { tag: "lint-staged", packages: ["lint-staged"], configKeys: ["lintStaged"] },
  {
    tag: "commitlint",
    packages: ["@commitlint/cli"],
    configKeys: ["commitlint"],
  },
  { tag: "turbo", packages: ["turbo"], configKeys: ["turbo"] },
  { tag: "nx", packages: ["nx"], configKeys: ["nx"] },
  { tag: "express", packages: ["express"] },
  { tag: "fastify", packages: ["fastify"] },
  { tag: "hono", packages: ["hono"] },
  { tag: "graphql", packages: ["graphql"] },
  { tag: "socket.io", packages: ["socket.io"] },
  { tag: "mongoose", packages: ["mongoose"] },
  { tag: "drizzle", packages: ["drizzle-orm"] },
  { tag: "typeorm", packages: ["typeorm"] },
  {
    tag: "nestjs",
    packages: ["@nestjs/core"],
    prefixes: ["@nestjs/"],
    configKeys: ["nest"],
  },
  {
    tag: "remix",
    packages: ["@remix-run/react", "@remix-run/node"],
    prefixes: ["@remix-run/"],
    configKeys: ["remix"],
  },
  { tag: "angular", prefixes: ["@angular/"], configKeys: ["angular"] },
];

function detectStack(
  dependencies: DependencyEntry[],
  configPresence: ConfigPresence,
): string[] {
  const stack = new Set<string>();
  const names = new Set(dependencies.map((d) => d.name));

  for (const detector of STACK_DETECTORS) {
    const hasMatchingPackage =
      detector.packages?.some((p) => names.has(p)) ?? false;
    const hasMatchingPrefix =
      detector.prefixes?.some((p) => hasPackage(names, p)) ?? false;
    const hasMatchingConfig =
      detector.configKeys?.some((k) => configPresence[k].length > 0) ?? false;

    if (hasMatchingPackage || hasMatchingPrefix || hasMatchingConfig) {
      stack.add(detector.tag);
    }
  }

  return [...stack];
}

async function detectConfigPresence(rootPath: string): Promise<ConfigPresence> {
  const result = {} as ConfigPresence;
  for (const key of Object.keys(CONFIG_REGISTRY) as Array<
    keyof ConfigPresence
  >) {
    const found = await findAllExisting(rootPath, CONFIG_REGISTRY[key]);
    result[key] = found.map((fp) => relativeTo(rootPath, fp));
  }
  return result;
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

  const configPresence = await detectConfigPresence(rootPath);

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
