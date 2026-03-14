#!/usr/bin/env node

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";

const require = createRequire(import.meta.url);
const { version: SERVER_VERSION } = require("../package.json") as {
  version: string;
};
import type { ProjectAnalysis } from "./types.js";
import { analyzeProject } from "./lib/analyzer.js";
import { findBreakingChanges } from "./lib/breaking-changes.js";
import { applySafeCodemods } from "./lib/codemods.js";
import {
  compactAnalysis,
  compactBreakingChanges,
  compactFindings,
  compactPaths,
  compactValidation,
} from "./lib/compact.js";
import { scanRepoForDeprecations } from "./lib/deprecation-scanner.js";
import {
  generateUpgradePlan,
  writeUpgradePrSummary,
} from "./lib/plan-generator.js";
import { runUpgradePipeline } from "./lib/pipeline.js";
import { detectUpgradePaths } from "./lib/upgrade-paths.js";
import { validateUpgrade } from "./lib/validation.js";

const artifacts: Record<string, unknown> = {
  analysis: null,
  paths: null,
  breakingChanges: null,
  findings: null,
  plan: null,
  codemods: null,
  pipeline: null,
  validation: null,
  summary: null,
};

const server = new McpServer(
  {
    name: "upgrade-pilot-mcp",
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      logging: {},
    },
  },
);

function asToolResult(payload: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: { result: payload },
  };
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function rememberArtifact(
  key: keyof typeof artifacts,
  payload: unknown,
): unknown {
  artifacts[key] = payload;
  return payload;
}

function cachedAnalysis(): ProjectAnalysis | undefined {
  return (artifacts.analysis as ProjectAnalysis) ?? undefined;
}

function resourceResult(
  uri: URL,
  payload: unknown,
  mimeType = "application/json",
): ReadResourceResult {
  const text =
    mimeType === "text/markdown"
      ? typeof payload === "string"
        ? payload
        : "# No artifact yet\n\nRun the corresponding tool first."
      : JSON.stringify(
          payload ?? {
            message: "No artifact yet. Run the corresponding tool first.",
          },
          null,
          2,
        );

  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType,
        text,
      },
    ],
  };
}

server.registerResource(
  "latest-analysis",
  "upgrade://analysis/latest",
  {
    title: "Latest analysis",
    description: "Most recent output from analyze_project.",
    mimeType: "application/json",
  },
  async (uri) => resourceResult(uri, artifacts.analysis),
);

server.registerResource(
  "latest-paths",
  "upgrade://paths/latest",
  {
    title: "Latest upgrade paths",
    description: "Most recent output from detect_upgrade_paths.",
    mimeType: "application/json",
  },
  async (uri) => resourceResult(uri, artifacts.paths),
);

server.registerResource(
  "latest-breaking-changes",
  "upgrade://breaking-changes/latest",
  {
    title: "Latest breaking changes",
    description: "Most recent output from find_breaking_changes.",
    mimeType: "application/json",
  },
  async (uri) => resourceResult(uri, artifacts.breakingChanges),
);

server.registerResource(
  "latest-findings",
  "upgrade://findings/latest",
  {
    title: "Latest findings",
    description: "Most recent output from scan_repo_for_deprecations.",
    mimeType: "application/json",
  },
  async (uri) => resourceResult(uri, artifacts.findings),
);

server.registerResource(
  "latest-plan",
  "upgrade://plan/latest",
  {
    title: "Latest plan",
    description: "Most recent output from generate_upgrade_plan.",
    mimeType: "application/json",
  },
  async (uri) => resourceResult(uri, artifacts.plan),
);

server.registerResource(
  "latest-validation",
  "upgrade://validation/latest",
  {
    title: "Latest validation",
    description: "Most recent output from validate_upgrade.",
    mimeType: "application/json",
  },
  async (uri) => resourceResult(uri, artifacts.validation),
);

server.registerResource(
  "latest-pipeline",
  "upgrade://pipeline/latest",
  {
    title: "Latest pipeline",
    description: "Most recent output from run_upgrade_pipeline.",
    mimeType: "application/json",
  },
  async (uri) => resourceResult(uri, artifacts.pipeline),
);

server.registerResource(
  "latest-codemods",
  "upgrade://codemods/latest",
  {
    title: "Latest codemods",
    description: "Most recent output from apply_safe_codemods.",
    mimeType: "application/json",
  },
  async (uri) => resourceResult(uri, artifacts.codemods),
);

server.registerResource(
  "latest-summary",
  "upgrade://summary/latest",
  {
    title: "Latest summary",
    description: "Most recent output from write_upgrade_pr_summary.",
    mimeType: "text/markdown",
  },
  async (uri) => resourceResult(uri, artifacts.summary, "text/markdown"),
);

server.registerTool(
  "analyze_project",
  {
    title: "Analyze JS/TS project",
    description:
      "Read package metadata, lockfiles, and config files to fingerprint the upgrade surface.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      includeScripts: z.boolean().default(true),
      outputFormat: z.enum(["full", "compact"]).default("compact"),
    }),
  },
  async ({ rootPath, includeScripts, outputFormat }) => {
    try {
      const result = await analyzeProject(rootPath, includeScripts);
      rememberArtifact("analysis", result);
      return asToolResult(
        outputFormat === "compact" ? compactAnalysis(result) : result,
      );
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "detect_upgrade_paths",
  {
    title: "Detect upgrade paths",
    description:
      "Compute constrained, package-aware upgrade steps for the supported route.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      targets: z.array(z.string()).optional(),
      outputFormat: z.enum(["full", "compact"]).default("compact"),
    }),
  },
  async ({ rootPath, targets, outputFormat }) => {
    try {
      const result = await detectUpgradePaths(rootPath, targets, cachedAnalysis());
      rememberArtifact("paths", result);
      return asToolResult(
        outputFormat === "compact" ? compactPaths(result) : result,
      );
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "find_breaking_changes",
  {
    title: "Find breaking changes",
    description:
      "Attach official migration references and curated risk areas to selected packages.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      targets: z.array(z.string()).optional(),
      outputFormat: z.enum(["full", "compact"]).default("compact"),
    }),
  },
  async ({ rootPath, targets, outputFormat }) => {
    try {
      const result = await findBreakingChanges(rootPath, targets, cachedAnalysis());
      rememberArtifact("breakingChanges", result);
      return asToolResult(
        outputFormat === "compact"
          ? compactBreakingChanges(result)
          : result,
      );
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "scan_repo_for_deprecations",
  {
    title: "Scan repository for deprecated patterns",
    description:
      "Find high-signal repo-level patterns that are known to complicate upgrades.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      targets: z.array(z.string()).optional(),
      maxFindings: z.number().int().positive().default(100),
      outputFormat: z.enum(["full", "compact"]).default("compact"),
    }),
  },
  async ({ rootPath, targets, maxFindings, outputFormat }) => {
    try {
      const result = await scanRepoForDeprecations(
        rootPath,
        targets,
        maxFindings,
        cachedAnalysis(),
      );
      rememberArtifact("findings", result);
      return asToolResult(
        outputFormat === "compact" ? compactFindings(result) : result,
      );
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "generate_upgrade_plan",
  {
    title: "Generate upgrade plan",
    description:
      "Turn dependency intelligence and repo findings into an ordered upgrade plan.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      targets: z.array(z.string()).optional(),
    }),
  },
  async ({ rootPath, targets }) => {
    try {
      return asToolResult(
        rememberArtifact("plan", await generateUpgradePlan(rootPath, targets, cachedAnalysis())),
      );
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "apply_safe_codemods",
  {
    title: "Apply safe codemods",
    description:
      "Run deterministic, local codemods that are explicitly allowed by the v1 safety model.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      mode: z.enum(["dry-run", "apply"]).default("dry-run"),
      codemodIds: z.array(z.string()).optional(),
    }),
  },
  async ({ rootPath, mode, codemodIds }) => {
    try {
      return asToolResult(
        rememberArtifact(
          "codemods",
          await applySafeCodemods(rootPath, mode, codemodIds),
        ),
      );
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "validate_upgrade",
  {
    title: "Validate upgrade",
    description:
      "Execute type-check, lint, test, and build commands when they are available.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      include: z
        .array(z.enum(["types", "lint", "test", "build"]))
        .default(["types", "lint", "test", "build"]),
      timeoutMs: z.number().int().positive().optional(),
      outputFormat: z.enum(["full", "compact"]).default("compact"),
    }),
  },
  async ({ rootPath, include, timeoutMs, outputFormat }) => {
    try {
      const result = await validateUpgrade(rootPath, include, timeoutMs, cachedAnalysis());
      rememberArtifact("validation", result);
      return asToolResult(
        outputFormat === "compact" ? compactValidation(result) : result,
      );
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "run_upgrade_pipeline",
  {
    title: "Run full upgrade pipeline",
    description:
      "Run analyze → paths → breaking changes → deprecations → plan in a single call. Returns a compact summary to save tokens while storing all artifacts for later resource access.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      targets: z.array(z.string()).optional(),
      skipSteps: z
        .array(z.enum(["findings", "breakingChanges"]))
        .optional(),
    }),
  },
  async ({ rootPath, targets, skipSteps }) => {
    try {
      const result = await runUpgradePipeline(rootPath, targets, skipSteps);
      rememberArtifact("pipeline", result);
      rememberArtifact("analysis", result.analysis);
      rememberArtifact("paths", result.paths);
      rememberArtifact("breakingChanges", result.breakingChanges);
      rememberArtifact("findings", result.findings);
      rememberArtifact("plan", result.plan);
      return asToolResult({ summary: result.summary });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "write_upgrade_pr_summary",
  {
    title: "Write upgrade PR summary",
    description:
      "Generate a reviewer-friendly markdown summary of the planned upgrade route.",
    inputSchema: z.object({
      rootPath: z.string().optional(),
      targets: z.array(z.string()).optional(),
    }),
  },
  async ({ rootPath, targets }) => {
    try {
      const markdown = await writeUpgradePrSummary(rootPath, targets, cachedAnalysis());
      rememberArtifact("summary", markdown);
      return asToolResult({ markdown });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerPrompt(
  "plan_upgrade_route",
  {
    title: "Plan upgrade route",
    description:
      "Guide an agent through the safest upgrade flow for a JS/TS repository.",
    argsSchema: {
      rootPath: z.string().optional(),
      targets: z.array(z.string()).optional(),
      objective: z.string().optional(),
    },
  },
  ({ rootPath, targets, objective }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Plan a low-risk upgrade workflow for this repository.",
            rootPath
              ? `rootPath: ${rootPath}`
              : "rootPath: current working directory",
            targets && targets.length > 0
              ? `targets: ${targets.join(", ")}`
              : "targets: auto-detect supported packages",
            objective
              ? `objective: ${objective}`
              : "objective: minimize breakage while moving toward current supported majors",
            "Use analyze_project, detect_upgrade_paths, find_breaking_changes, scan_repo_for_deprecations, and generate_upgrade_plan in that order.",
          ].join("\n"),
        },
      },
    ],
  }),
);

server.registerPrompt(
  "draft_upgrade_pr",
  {
    title: "Draft upgrade PR",
    description:
      "Turn upgrade artifacts into a concise PR summary for human reviewers.",
    argsSchema: {
      rootPath: z.string().optional(),
      targets: z.array(z.string()).optional(),
      includeValidation: z.boolean().default(true),
    },
  },
  ({ rootPath, targets, includeValidation }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "Draft a PR summary for the repository upgrade work.",
            rootPath
              ? `rootPath: ${rootPath}`
              : "rootPath: current working directory",
            targets && targets.length > 0
              ? `targets: ${targets.join(", ")}`
              : "targets: auto-detect supported packages",
            `include validation results: ${includeValidation ? "yes" : "no"}`,
            "Use write_upgrade_pr_summary and keep the result focused on changes, risks, and follow-up steps.",
          ].join("\n"),
        },
      },
    ],
  }),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("upgrade-pilot-mcp is running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
