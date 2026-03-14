import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { analyzeProject } from "../src/lib/analyzer.js";

describe("analyzeProject workspace detection", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-analyzer-"));
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should detect npm/yarn workspaces from package.json", async () => {
    const projectDir = path.join(tmpDir, "npm-ws");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name: "test-ws",
        workspaces: ["packages/*"],
      }),
      "utf8",
    );

    const result = await analyzeProject(projectDir);
    assert.strictEqual(result.isWorkspace, true);
  });

  it("should detect pnpm workspaces from pnpm-workspace.yaml", async () => {
    const projectDir = path.join(tmpDir, "pnpm-ws");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "pnpm-project" }),
      "utf8",
    );
    await fs.writeFile(
      path.join(projectDir, "pnpm-workspace.yaml"),
      "packages:\n  - 'packages/*'\n",
      "utf8",
    );

    const result = await analyzeProject(projectDir);
    assert.strictEqual(result.isWorkspace, true);
  });

  it("should return isWorkspace false when no workspace config", async () => {
    const projectDir = path.join(tmpDir, "no-ws");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "no-ws" }),
      "utf8",
    );

    const result = await analyzeProject(projectDir);
    assert.strictEqual(result.isWorkspace, false);
  });
});
