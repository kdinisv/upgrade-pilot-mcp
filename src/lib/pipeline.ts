import {
  type BreakingChangeReference,
  type DeprecationFinding,
  type ProjectAnalysis,
  type UpgradePlan,
  type UpgradePathResult,
} from "../types.js";
import { analyzeProject } from "./analyzer.js";
import { findBreakingChanges } from "./breaking-changes.js";
import { scanRepoForDeprecations } from "./deprecation-scanner.js";
import { generateUpgradePlan } from "./plan-generator.js";
import { detectUpgradePaths } from "./upgrade-paths.js";

export type PipelineSkipStep = "findings" | "breakingChanges";

export interface PipelineResult {
  analysis: ProjectAnalysis;
  paths: UpgradePathResult[];
  breakingChanges: BreakingChangeReference[];
  findings: DeprecationFinding[];
  plan: UpgradePlan;
  summary: string;
}

function buildCompactSummary(result: PipelineResult): string {
  const { analysis, paths, breakingChanges, findings, plan } = result;
  const lines: string[] = [];

  lines.push(`Project: ${analysis.packageName ?? "unknown"}`);
  lines.push(`Stack: ${analysis.detectedStack.join(", ") || "none detected"}`);
  lines.push(`Package manager: ${analysis.packageManager}`);
  if (analysis.warnings.length > 0) {
    lines.push(`Warnings: ${analysis.warnings.length}`);
  }

  const outdated = paths.filter((p) => p.status !== "up-to-date");
  const majors = paths.filter(
    (p) => p.status === "direct-major" || p.status === "multi-major",
  );
  lines.push(
    `Packages: ${paths.length} analyzed, ${outdated.length} need update, ${majors.length} major`,
  );

  if (majors.length > 0) {
    lines.push(
      `Major upgrades: ${majors.map((p) => `${p.packageName} ${p.currentVersion ?? "?"} → ${p.latestVersion ?? "?"}`).join(", ")}`,
    );
  }

  if (breakingChanges.length > 0) {
    const topRisks = breakingChanges.flatMap((bc) => bc.risks).slice(0, 3);
    lines.push(`Top risks: ${topRisks.join(" | ")}`);
  }

  if (findings.length > 0) {
    lines.push(
      `Findings: ${findings.length} (${findings.filter((f) => f.severity === "high").length} high)`,
    );
  }

  lines.push(
    `Plan: ${plan.phases.length} phases, ${plan.recommendedTargets.length} targets`,
  );

  return lines.join("\n");
}

export async function runUpgradePipeline(
  rootPath = process.cwd(),
  targets?: string[],
  skipSteps?: PipelineSkipStep[],
): Promise<PipelineResult> {
  const skip = new Set(skipSteps ?? []);

  const analysis = await analyzeProject(rootPath, true);
  const paths = await detectUpgradePaths(rootPath, targets, analysis);

  const breakingChanges = skip.has("breakingChanges")
    ? []
    : await findBreakingChanges(rootPath, targets, analysis);

  const findings = skip.has("findings")
    ? []
    : await scanRepoForDeprecations(rootPath, targets, 50, analysis);

  const plan = await generateUpgradePlan(rootPath, targets, analysis);

  const result: PipelineResult = {
    analysis,
    paths,
    breakingChanges,
    findings,
    plan,
    summary: "",
  };

  result.summary = buildCompactSummary(result);
  return result;
}
