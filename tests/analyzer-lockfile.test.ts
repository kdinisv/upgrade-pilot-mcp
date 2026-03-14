import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { analyzeProject } from "../src/lib/analyzer.js";

describe("analyzeProject lockfile conflict detection", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-lockfile-"));
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should warn when multiple lockfiles are present", async () => {
    const projectDir = path.join(tmpDir, "multi-lock");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "test" }),
      "utf8",
    );
    await fs.writeFile(
      path.join(projectDir, "package-lock.json"),
      "{}",
      "utf8",
    );
    await fs.writeFile(path.join(projectDir, "yarn.lock"), "", "utf8");

    const result = await analyzeProject(projectDir);
    assert.ok(
      result.warnings.some((w) =>
        w.toLowerCase().includes("multiple lockfiles"),
      ),
      `Expected warning about multiple lockfiles, got: ${JSON.stringify(result.warnings)}`,
    );
  });

  it("should not warn when single lockfile is present", async () => {
    const projectDir = path.join(tmpDir, "single-lock");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "test" }),
      "utf8",
    );
    await fs.writeFile(
      path.join(projectDir, "package-lock.json"),
      "{}",
      "utf8",
    );

    const result = await analyzeProject(projectDir);
    assert.ok(
      !result.warnings.some((w) =>
        w.toLowerCase().includes("multiple lockfiles"),
      ),
    );
  });
});
