import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { walkFiles } from "../src/lib/fs-utils.js";

describe("walkFiles ignore directories", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-walk-"));

    // Visible file at root
    await fs.writeFile(path.join(tmpDir, "index.ts"), "export {};", "utf8");

    // Directories that should be ignored
    const ignored = [
      "build",
      "out",
      ".cache",
      ".svelte-kit",
      ".vite",
      "node_modules",
      "dist",
      ".git",
    ];
    for (const dir of ignored) {
      const dirPath = path.join(tmpDir, dir);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(
        path.join(dirPath, "hidden.js"),
        "// should be ignored",
        "utf8",
      );
    }

    // Visible nested file
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "src", "app.ts"),
      "export {};",
      "utf8",
    );
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should skip build/output directories", async () => {
    const files = await walkFiles(tmpDir);
    const relative = files.map((f) =>
      path.relative(tmpDir, f).replaceAll("\\", "/"),
    );

    // Should include visible files
    assert.ok(relative.includes("index.ts"), "index.ts should be found");
    assert.ok(relative.includes("src/app.ts"), "src/app.ts should be found");

    // Should NOT include files from ignored directories
    const ignoredDirs = [
      "build",
      "out",
      ".cache",
      ".svelte-kit",
      ".vite",
      "node_modules",
      "dist",
      ".git",
    ];
    for (const dir of ignoredDirs) {
      const hasIgnored = relative.some((r) => r.startsWith(dir + "/"));
      assert.ok(
        !hasIgnored,
        `Files from ${dir}/ should not appear, but found: ${relative.filter((r) => r.startsWith(dir + "/")).join(", ")}`,
      );
    }
  });
});
