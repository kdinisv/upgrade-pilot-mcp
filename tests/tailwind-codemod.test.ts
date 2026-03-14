import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { applySafeCodemods } from "../src/lib/codemods.js";

async function makeTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "tw-codemod-"));
}

const LEGACY_CSS = `
@tailwind base;
@tailwind components;
@tailwind utilities;

.btn { @apply px-4 py-2; }
`;

const LEGACY_IMPORT_CSS = `
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

.card { border-radius: 8px; }
`;

describe("tailwind-v4-import codemod", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should detect @tailwind directives in dry-run", async () => {
    tmpDir = await makeTmp();
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src/globals.css"), LEGACY_CSS);
    const result = await applySafeCodemods(tmpDir, "dry-run", [
      "tailwind-v4-import",
    ]);
    assert.equal(result.changes.length, 1);
    assert.equal(result.changes[0].codemodId, "tailwind-v4-import");
    assert.equal(result.changes[0].changed, false);
    assert.equal(result.changes[0].replacements, 3);
  });

  it("should replace @tailwind directives in apply mode", async () => {
    tmpDir = await makeTmp();
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "src/globals.css"), LEGACY_CSS);
    const result = await applySafeCodemods(tmpDir, "apply", [
      "tailwind-v4-import",
    ]);
    assert.equal(result.changes[0].changed, true);
    const updated = await fs.readFile(
      path.join(tmpDir, "src/globals.css"),
      "utf8",
    );
    assert.ok(updated.includes('@import "tailwindcss"'));
    assert.ok(!updated.includes("@tailwind base"));
    assert.ok(!updated.includes("@tailwind components"));
    assert.ok(!updated.includes("@tailwind utilities"));
    // Non-tailwind content preserved
    assert.ok(updated.includes("@apply px-4 py-2"));
  });

  it("should replace @import tailwindcss/* directives", async () => {
    tmpDir = await makeTmp();
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "src/globals.css"),
      LEGACY_IMPORT_CSS,
    );
    const result = await applySafeCodemods(tmpDir, "apply", [
      "tailwind-v4-import",
    ]);
    assert.equal(result.changes[0].changed, true);
    const updated = await fs.readFile(
      path.join(tmpDir, "src/globals.css"),
      "utf8",
    );
    assert.ok(updated.includes('@import "tailwindcss"'));
    assert.ok(!updated.includes("tailwindcss/base"));
  });

  it("should skip when no CSS files with tailwind directives", async () => {
    tmpDir = await makeTmp();
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "src/main.css"),
      ".app { color: red; }",
    );
    const result = await applySafeCodemods(tmpDir, "dry-run", [
      "tailwind-v4-import",
    ]);
    assert.equal(result.changes.length, 0);
  });
});
