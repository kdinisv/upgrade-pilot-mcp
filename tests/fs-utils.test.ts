import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { readJsoncFile, readTextIfExists } from "../src/lib/fs-utils.js";

describe("readTextIfExists", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upilot-txt-"));
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should return file contents when file exists", async () => {
    const filePath = path.join(tmpDir, "hello.txt");
    await fs.writeFile(filePath, "hello world", "utf8");

    const result = await readTextIfExists(filePath);
    assert.strictEqual(result, "hello world");
  });

  it("should return null for non-existent file", async () => {
    const result = await readTextIfExists(path.join(tmpDir, "nope.txt"));
    assert.strictEqual(result, null);
  });

  it("should return null for deleted file (no ENOENT throw)", async () => {
    // This tests the TOCTOU fix: even if a path "could" exist,
    // if it's gone by the time we read, we get null, not an exception.
    const filePath = path.join(tmpDir, "ghost.txt");
    const result = await readTextIfExists(filePath);
    assert.strictEqual(result, null);
  });
});

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
