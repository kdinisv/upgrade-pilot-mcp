import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { applySafeCodemods } from "../src/lib/codemods.js";

describe("applySafeCodemods", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-codemod-"));
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should detect prisma-relation-mode in dry-run", async () => {
    const prismaDir = path.join(tmpDir, "dry-run", "prisma");
    await fs.mkdir(prismaDir, { recursive: true });
    await fs.writeFile(
      path.join(prismaDir, "schema.prisma"),
      'generator client {\n  referentialIntegrity = "prisma"\n}\n',
      "utf8",
    );

    const result = await applySafeCodemods(
      path.join(tmpDir, "dry-run"),
      "dry-run",
    );
    assert.strictEqual(result.mode, "dry-run");
    assert.strictEqual(result.changes.length, 1);
    assert.strictEqual(result.changes[0]!.replacements, 1);
    assert.strictEqual(result.changes[0]!.changed, false); // dry-run = no write
  });

  it("should apply prisma-relation-mode replacement", async () => {
    const prismaDir = path.join(tmpDir, "apply-ok", "prisma");
    await fs.mkdir(prismaDir, { recursive: true });
    const schemaPath = path.join(prismaDir, "schema.prisma");
    await fs.writeFile(
      schemaPath,
      'generator client {\n  referentialIntegrity = "prisma"\n}\n',
      "utf8",
    );

    const result = await applySafeCodemods(
      path.join(tmpDir, "apply-ok"),
      "apply",
    );
    assert.strictEqual(result.changes[0]!.changed, true);
    assert.strictEqual(result.changes[0]!.error, undefined);

    const content = await fs.readFile(schemaPath, "utf8");
    assert.ok(content.includes("relationMode"));
    assert.ok(!content.includes("referentialIntegrity"));
  });

  it("should report error when file write fails in apply mode", async () => {
    const prismaDir = path.join(tmpDir, "apply-fail", "prisma");
    await fs.mkdir(prismaDir, { recursive: true });
    const schemaPath = path.join(prismaDir, "schema.prisma");
    await fs.writeFile(
      schemaPath,
      'generator client {\n  referentialIntegrity = "prisma"\n}\n',
      "utf8",
    );
    // Make the file read-only to force a write error
    await fs.chmod(schemaPath, 0o444);

    try {
      const result = await applySafeCodemods(
        path.join(tmpDir, "apply-fail"),
        "apply",
      );

      // Should report changed: false and include an error message
      assert.strictEqual(result.changes[0]!.changed, false);
      assert.ok(
        typeof result.changes[0]!.error === "string" &&
          result.changes[0]!.error.length > 0,
        "error field should contain error message",
      );
    } finally {
      // Restore permissions so after() cleanup can remove the file
      await fs.chmod(schemaPath, 0o644);
    }
  });

  it("should list unsupported codemod ids", async () => {
    const result = await applySafeCodemods(tmpDir, "dry-run", [
      "nonexistent-codemod",
    ]);
    assert.deepStrictEqual(result.unsupportedCodemods, ["nonexistent-codemod"]);
  });
});
