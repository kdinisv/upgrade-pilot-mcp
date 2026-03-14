import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { validateUpgrade } from "../src/lib/validation.js";

describe("validateUpgrade timeout handling", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-validation-"));
  });

  after(async () => {
    // On Windows the killed process may still hold a lock briefly
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it("should fail with timeout when command hangs", async () => {
    const projectDir = path.join(tmpDir, "hang-project");
    await fs.mkdir(projectDir, { recursive: true });

    // Create a package.json with a test script that sleeps for a long time
    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name: "hang-test",
        scripts: {
          test: 'node -e "setTimeout(() => {}, 60000)"',
        },
      }),
      "utf8",
    );

    const results = await validateUpgrade(projectDir, ["test"], 3000);
    const testResult = results.find((r) => r.kind === "test");
    assert.ok(testResult, "test result should exist");
    assert.strictEqual(testResult.status, "failed");
    assert.ok(
      testResult.stderr.toLowerCase().includes("timeout") ||
        testResult.reason?.toLowerCase().includes("timeout") ||
        false,
      `Expected timeout indicator in result, got stderr: "${testResult.stderr}", reason: "${testResult.reason}"`,
    );
  });

  it("should complete normally when command finishes in time", async () => {
    const projectDir = path.join(tmpDir, "fast-project");
    await fs.mkdir(projectDir, { recursive: true });

    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name: "fast-test",
        scripts: {
          test: "node -e \"console.log('ok')\"",
        },
      }),
      "utf8",
    );

    const results = await validateUpgrade(projectDir, ["test"], 30000);
    const testResult = results.find((r) => r.kind === "test");
    assert.ok(testResult, "test result should exist");
    assert.strictEqual(testResult.status, "passed");
  });
});
