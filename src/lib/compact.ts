import type {
  BreakingChangeReference,
  DeprecationFinding,
  ProjectAnalysis,
  UpgradePathResult,
  ValidationCommandResult,
} from "../types.js";

export interface CompactAnalysis {
  packageName: string | null;
  packageManager: string;
  lockfile: string | null;
  nodeEngines: string | null;
  detectedStack: string[];
  isWorkspace: boolean;
  supportedCount: number;
  totalDependencies: number;
  warnings: string[];
}

export function compactAnalysis(analysis: ProjectAnalysis): CompactAnalysis {
  return {
    packageName: analysis.packageName,
    packageManager: analysis.packageManager,
    lockfile: analysis.lockfile,
    nodeEngines: analysis.nodeEngines,
    detectedStack: analysis.detectedStack,
    isWorkspace: analysis.isWorkspace,
    supportedCount: analysis.supportedDependencies.length,
    totalDependencies: analysis.dependencies.length,
    warnings: analysis.warnings,
  };
}

export interface CompactPath {
  packageName: string;
  current: string | null;
  latest: string | null;
  status: UpgradePathResult["status"];
  steps: string[];
}

export function compactPaths(paths: UpgradePathResult[]): CompactPath[] {
  return paths.map((p) => ({
    packageName: p.packageName,
    current: p.currentVersion,
    latest: p.latestVersion,
    status: p.status,
    steps: p.suggestedSteps,
  }));
}

export interface CompactBreakingChange {
  packageName: string;
  guideCount: number;
  topRisks: string[];
}

export function compactBreakingChanges(
  changes: BreakingChangeReference[],
): CompactBreakingChange[] {
  return changes.map((c) => ({
    packageName: c.packageName,
    guideCount: c.guides.length,
    topRisks: c.risks.slice(0, 2),
  }));
}

export interface CompactFinding {
  rule: string;
  file: string;
  severity: DeprecationFinding["severity"];
  recommendation: string;
}

export function compactFindings(
  findings: DeprecationFinding[],
): CompactFinding[] {
  return findings.map((f) => ({
    rule: f.ruleId,
    file: `${f.filePath}:${f.line}`,
    severity: f.severity,
    recommendation: f.recommendation,
  }));
}

export interface CompactValidation {
  kind: string;
  status: string;
  stderr?: string;
  reason?: string;
}

export function compactValidation(
  results: ValidationCommandResult[],
): CompactValidation[] {
  return results.map((r) => {
    const base: CompactValidation = { kind: r.kind, status: r.status };
    if (r.status === "failed" && r.stderr) {
      base.stderr = r.stderr;
    }
    if (r.reason) {
      base.reason = r.reason;
    }
    return base;
  });
}

const STATUS_ICON: Record<string, string> = {
  passed: "✓",
  skipped: "○",
  failed: "✗",
};

export function quietValidation(
  results: ValidationCommandResult[],
): { allPassed: true; summary: string } | CompactValidation[] {
  const hasFailed = results.some((r) => r.status === "failed");
  if (hasFailed) return compactValidation(results);
  const summary = results
    .map((r) => `${r.kind} ${STATUS_ICON[r.status] ?? r.status}`)
    .join(", ");
  return { allPassed: true, summary };
}
