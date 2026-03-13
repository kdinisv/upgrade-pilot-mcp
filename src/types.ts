export const SUPPORTED_PACKAGES = [
  "typescript",
  "eslint",
  "vite",
  "vitest",
  "vue",
  "nuxt",
  "prisma",
  "@prisma/client",
  "express",
  "fastify",
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
  vite: string[];
  vitest: string[];
  jest: string[];
  nuxt: string[];
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
