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
import { detectUpgradePaths } from "./upgrade-paths.js";

function buildPlan(
  analysis: ProjectAnalysis,
  paths: UpgradePathResult[],
  breakingChanges: BreakingChangeReference[],
  findings: DeprecationFinding[],
): UpgradePlan {
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

export async function generateUpgradePlan(
  rootPath = process.cwd(),
  targets?: string[],
): Promise<UpgradePlan> {
  const analysis = await analyzeProject(rootPath, true);
  const paths = await detectUpgradePaths(rootPath, targets, analysis);
  const breakingChanges = await findBreakingChanges(
    rootPath,
    targets,
    analysis,
  );
  const findings = await scanRepoForDeprecations(
    rootPath,
    targets,
    50,
    analysis,
  );

  return buildPlan(analysis, paths, breakingChanges, findings);
}

export async function writeUpgradePrSummary(
  rootPath = process.cwd(),
  targets?: string[],
): Promise<string> {
  const analysis = await analyzeProject(rootPath, true);
  const paths = await detectUpgradePaths(rootPath, targets, analysis);
  const breakingChanges = await findBreakingChanges(
    rootPath,
    targets,
    analysis,
  );
  const allFindings = await scanRepoForDeprecations(
    rootPath,
    targets,
    50,
    analysis,
  );
  const plan = buildPlan(analysis, paths, breakingChanges, allFindings);
  const displayFindings = allFindings.slice(0, 20);

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
    displayFindings.length > 0
      ? displayFindings
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
