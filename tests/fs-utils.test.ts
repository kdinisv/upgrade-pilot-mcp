import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { readJsoncFile } from "../src/lib/fs-utils.js";

describe("readJsoncFile", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-test-"));
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should parse valid JSON", async () => {
    const filePath = path.join(tmpDir, "valid.json");
    await fs.writeFile(filePath, '{"name": "test"}', "utf8");

    const result = await readJsoncFile<{ name: string }>(filePath);
    assert.deepStrictEqual(result, { name: "test" });
  });

  it("should parse valid JSONC (with comments)", async () => {
    const filePath = path.join(tmpDir, "valid.jsonc");
    await fs.writeFile(
      filePath,
      '// comment\n{"name": "test" /* inline */}',
      "utf8",
    );

    const result = await readJsoncFile<{ name: string }>(filePath);
    assert.deepStrictEqual(result, { name: "test" });
  });

  it("should return null for non-existent file", async () => {
    const filePath = path.join(tmpDir, "nope.json");
    const result = await readJsoncFile(filePath);
    assert.strictEqual(result, null);
  });

  it("should return null for malformed JSON instead of throwing", async () => {
    const filePath = path.join(tmpDir, "broken.json");
    await fs.writeFile(filePath, "{{{invalid json", "utf8");

    // Before fix: this throws. After fix: should return null.
    const result = await readJsoncFile(filePath);
    assert.strictEqual(result, null);
  });

  it("should return null for empty file instead of throwing", async () => {
    const filePath = path.join(tmpDir, "empty.json");
    await fs.writeFile(filePath, "", "utf8");

    const result = await readJsoncFile(filePath);
    assert.strictEqual(result, null);
  });
});
