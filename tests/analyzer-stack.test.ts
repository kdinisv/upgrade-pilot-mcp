import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { analyzeProject } from "../src/lib/analyzer.js";

describe("analyzeProject stack detection for missing packages", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-stack-"));
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function createProjectWith(
    name: string,
    deps: Record<string, string>,
  ) {
    const projectDir = path.join(tmpDir, name);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name,
        dependencies: deps,
      }),
      "utf8",
    );
    return projectDir;
  }

  it("should detect sass in stack", async () => {
    const dir = await createProjectWith("sass-proj", { sass: "^1.80.0" });
    const result = await analyzeProject(dir);
    assert.ok(
      result.detectedStack.includes("sass"),
      `Expected "sass" in stack, got: ${JSON.stringify(result.detectedStack)}`,
    );
  });

  it("should detect tsup in stack", async () => {
    const dir = await createProjectWith("tsup-proj", { tsup: "^8.0.0" });
    const result = await analyzeProject(dir);
    assert.ok(
      result.detectedStack.includes("tsup"),
      `Expected "tsup" in stack, got: ${JSON.stringify(result.detectedStack)}`,
    );
  });

  it("should detect supertest in stack", async () => {
    const dir = await createProjectWith("supertest-proj", {
      supertest: "^7.0.0",
    });
    const result = await analyzeProject(dir);
    assert.ok(
      result.detectedStack.includes("supertest"),
      `Expected "supertest" in stack, got: ${JSON.stringify(result.detectedStack)}`,
    );
  });

  it("should detect msw in stack", async () => {
    const dir = await createProjectWith("msw-proj", { msw: "^2.0.0" });
    const result = await analyzeProject(dir);
    assert.ok(
      result.detectedStack.includes("msw"),
      `Expected "msw" in stack, got: ${JSON.stringify(result.detectedStack)}`,
    );
  });
});
