export const SUPPORTED_PACKAGES = [
  "typescript",
  "eslint",
  "prettier",
  "postcss",
  "vite",
  "vitest",
  "jest",
  "mocha",
  "webpack",
  "rollup",
  "esbuild",
  "tsup",
  "turbo",
  "nx",
  "sass",
  "@babel/core",
  "@swc/core",
  "react",
  "react-dom",
  "next",
  "react-router",
  "redux",
  "@reduxjs/toolkit",
  "@tanstack/react-query",
  "vue",
  "vue-router",
  "pinia",
  "nuxt",
  "astro",
  "svelte",
  "@sveltejs/kit",
  "prisma",
  "@prisma/client",
  "drizzle-orm",
  "mongoose",
  "typeorm",
  "tailwindcss",
  "@playwright/test",
  "playwright",
  "cypress",
  "storybook",
  "husky",
  "lint-staged",
  "@commitlint/cli",
  "supertest",
  "msw",
  "express",
  "fastify",
  "hono",
  "socket.io",
  "graphql",
  "axios",
  "zod",
  "lodash",
  "rxjs",
  "@nestjs/core",
  "@remix-run/react",
  "@remix-run/node",
  "@angular/core",
] as const;

export const SUPPORTED_PACKAGE_PREFIXES = [
  "@nestjs/",
  "@storybook/",
  "@remix-run/",
  "@angular/",
] as const;

export type SupportedPackageName = (typeof SUPPORTED_PACKAGES)[number];

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

export type ValidationKind = "types" | "lint" | "test" | "build";

export interface DependencyEntry {
  name: string;
  versionRange: string;
  section:
    | "dependencies"
    | "devDependencies"
    | "peerDependencies"
    | "optionalDependencies";
}

export interface ConfigPresence {
  tsconfig: string[];
  eslint: string[];
  prettier: string[];
  postcss: string[];
  webpack: string[];
  rollup: string[];
  vite: string[];
  vitest: string[];
  jest: string[];
  mocha: string[];
  babel: string[];
  swc: string[];
  next: string[];
  nuxt: string[];
  astro: string[];
  svelte: string[];
  tailwind: string[];
  playwright: string[];
  cypress: string[];
  storybook: string[];
  husky: string[];
  lintStaged: string[];
  commitlint: string[];
  turbo: string[];
  nx: string[];
  nest: string[];
  remix: string[];
  angular: string[];
  prisma: string[];
}

export interface ProjectAnalysis {
  rootPath: string;
  packageJsonPath: string | null;
  packageManager: PackageManager;
  lockfile: string | null;
  packageName: string | null;
  packageManagerField: string | null;
  nodeEngines: string | null;
  scripts: Record<string, string>;
  dependencies: DependencyEntry[];
  supportedDependencies: DependencyEntry[];
  configPresence: ConfigPresence;
  detectedStack: string[];
  isWorkspace: boolean;
  warnings: string[];
}

export interface UpgradePathResult {
  packageName: string;
  currentRange: string;
  currentVersion: string | null;
  currentMajor: number | null;
  latestVersion: string | null;
  latestMajor: number | null;
  status:
    | "up-to-date"
    | "minor-or-patch"
    | "direct-major"
    | "multi-major"
    | "unknown";
  suggestedSteps: string[];
  notes: string[];
}

export interface BreakingChangeReference {
  packageName: string;
  guides: Array<{
    title: string;
    url: string;
  }>;
  risks: string[];
}

export interface DeprecationFinding {
  ruleId: string;
  packageName: string;
  severity: "info" | "warning" | "high";
  filePath: string;
  line: number;
  message: string;
  recommendation: string;
}

export interface UpgradePlanPhase {
  id: string;
  title: string;
  rationale: string;
  actions: string[];
  risks: string[];
}

export interface UpgradePlan {
  summary: string;
  recommendedTargets: string[];
  phases: UpgradePlanPhase[];
  validationChecklist: string[];
}

export interface CodemodChange {
  codemodId: string;
  filePath: string;
  replacements: number;
  changed: boolean;
  error?: string;
}

export interface ValidationCommandResult {
  kind: ValidationKind;
  command: string;
  exitCode: number | null;
  status: "passed" | "failed" | "skipped";
  stdout: string;
  stderr: string;
  reason?: string;
}
