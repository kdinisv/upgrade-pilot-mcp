import path from "node:path";
import { type DeprecationFinding, type ProjectAnalysis } from "../types.js";
import { analyzeProject } from "./analyzer.js";
import {
  findLineNumber,
  readTextIfExists,
  relativeTo,
  walkFiles,
} from "./fs-utils.js";

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
    ruleId: "tailwind-legacy-directives",
    packageName: "tailwindcss",
    severity: "warning",
    matcher: /@tailwind\s+(base|components|utilities)\s*;/,
    appliesTo: (relativePath) =>
      /\.(css|pcss|postcss|scss|sass)$/.test(relativePath),
    message: "Legacy Tailwind CSS directives detected.",
    recommendation:
      'Tailwind CSS v4 prefers @import "tailwindcss"; verify stylesheet and config migration.',
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
  analysis?: ProjectAnalysis,
): Promise<DeprecationFinding[]> {
  const projectAnalysis = analysis ?? (await analyzeProject(rootPath, false));
  const selectedTargets = new Set(
    targets && targets.length > 0 ? targets : projectAnalysis.detectedStack,
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
