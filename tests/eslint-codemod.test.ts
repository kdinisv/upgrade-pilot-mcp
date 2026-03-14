import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { applySafeCodemods } from "../src/lib/codemods.js";

async function makeTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "eslint-codemod-"));
}

describe("eslint-flat-config codemod", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should detect .eslintrc.json in dry-run", async () => {
    tmpDir = await makeTmp();
    await fs.writeFile(
      path.join(tmpDir, ".eslintrc.json"),
      JSON.stringify({
        extends: ["eslint:recommended"],
        rules: { semi: "error" },
      }),
    );
    const result = await applySafeCodemods(tmpDir, "dry-run", [
      "eslint-flat-config",
    ]);
    assert.equal(result.changes.length, 1);
    assert.equal(result.changes[0].codemodId, "eslint-flat-config");
    assert.equal(result.changes[0].changed, false);
    assert.ok(result.changes[0].replacements >= 1);
  });

  it("should create eslint.config.mjs in apply mode", async () => {
    tmpDir = await makeTmp();
    await fs.writeFile(
      path.join(tmpDir, ".eslintrc.json"),
      JSON.stringify({ extends: ["eslint:recommended"] }),
    );
    const result = await applySafeCodemods(tmpDir, "apply", [
      "eslint-flat-config",
    ]);
    assert.equal(result.changes[0].changed, true);
    const created = await fs.readFile(
      path.join(tmpDir, "eslint.config.mjs"),
      "utf8",
    );
    assert.ok(created.includes("FlatCompat"));
  });

  it("should skip when eslint.config.mjs already exists", async () => {
    tmpDir = await makeTmp();
    await fs.writeFile(path.join(tmpDir, ".eslintrc.json"), "{}");
    await fs.writeFile(
      path.join(tmpDir, "eslint.config.mjs"),
      "export default [];",
    );
    const result = await applySafeCodemods(tmpDir, "dry-run", [
      "eslint-flat-config",
    ]);
    assert.equal(result.changes.length, 0);
  });

  it("should skip when no legacy config found", async () => {
    tmpDir = await makeTmp();
    const result = await applySafeCodemods(tmpDir, "dry-run", [
      "eslint-flat-config",
    ]);
    assert.equal(result.changes.length, 0);
  });
});
