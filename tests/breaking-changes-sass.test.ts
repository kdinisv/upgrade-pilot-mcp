import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { findBreakingChanges } from "../src/lib/breaking-changes.js";

describe("findBreakingChanges sass guide", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-bc-"));
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "sass-project",
        devDependencies: { sass: "^1.80.0" },
      }),
      "utf8",
    );
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should return a breaking-change reference for sass", async () => {
    const results = await findBreakingChanges(tmpDir, ["sass"]);
    const sassEntry = results.find((r) => r.packageName === "sass");
    assert.ok(sassEntry, "sass entry should exist in breaking changes");
    assert.ok(
      sassEntry.guides.length > 0,
      "sass should have at least one guide",
    );
    assert.ok(sassEntry.risks.length > 0, "sass should have at least one risk");
  });
});
