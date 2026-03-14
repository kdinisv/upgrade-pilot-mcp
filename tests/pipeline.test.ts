import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { runUpgradePipeline } from "../src/lib/pipeline.js";

describe("runUpgradePipeline", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-pipeline-"));
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "pipeline-test",
        dependencies: { typescript: "^5.0.0", eslint: "^8.0.0" },
      }),
      "utf8",
    );
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should return all pipeline artifacts in a single call", async () => {
    const result = await runUpgradePipeline(tmpDir);

    assert.ok(result.analysis, "analysis should be present");
    assert.ok(Array.isArray(result.paths), "paths should be an array");
    assert.ok(
      Array.isArray(result.breakingChanges),
      "breakingChanges should be an array",
    );
    assert.ok(Array.isArray(result.findings), "findings should be an array");
    assert.ok(result.plan, "plan should be present");
    assert.ok(result.plan.phases.length > 0, "plan should have phases");
  });

  it("should return a compact summary string", async () => {
    const result = await runUpgradePipeline(tmpDir);

    assert.ok(typeof result.summary === "string", "summary should be a string");
    assert.ok(result.summary.length > 0, "summary should not be empty");
    assert.ok(
      result.summary.includes("typescript") ||
        result.summary.includes("eslint"),
      "summary should mention detected packages",
    );
  });

  it("should respect targets filter", async () => {
    const result = await runUpgradePipeline(tmpDir, ["typescript"]);

    const pathPackages = result.paths.map((p) => p.packageName);
    assert.ok(
      pathPackages.includes("typescript"),
      "should include typescript in paths",
    );
    assert.ok(
      !pathPackages.includes("eslint"),
      "should not include eslint when filtered",
    );
  });

  it("should skip steps when requested", async () => {
    const result = await runUpgradePipeline(tmpDir, undefined, ["findings"]);

    assert.strictEqual(
      result.findings.length,
      0,
      "findings should be empty when skipped",
    );
    assert.ok(result.analysis, "analysis should still be present");
    assert.ok(result.paths.length > 0, "paths should still be computed");
  });
});
