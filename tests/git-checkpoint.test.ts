import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  createCheckpoint,
  restoreCheckpoint,
  listCheckpoints,
} from "../src/lib/git-checkpoint.js";

const run = promisify(exec);

async function makeTmpRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "git-cp-"));
  await run("git init", { cwd: dir });
  await run('git config user.email "test@test.com"', { cwd: dir });
  await run('git config user.name "Test"', { cwd: dir });
  await fs.writeFile(path.join(dir, "file.txt"), "initial");
  await run("git add -A && git commit -m init", { cwd: dir });
  return dir;
}

describe("git checkpoints", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should create a checkpoint tag", async () => {
    tmpDir = await makeTmpRepo();
    const result = await createCheckpoint(tmpDir, "before-upgrade");
    assert.ok(result.success);
    assert.ok(result.ref.includes("before-upgrade"));
  });

  it("should list checkpoints", async () => {
    tmpDir = await makeTmpRepo();
    await createCheckpoint(tmpDir, "cp1");
    await fs.writeFile(path.join(tmpDir, "file.txt"), "changed");
    await run("git add -A && git commit -m change", { cwd: tmpDir });
    await createCheckpoint(tmpDir, "cp2");
    const list = await listCheckpoints(tmpDir);
    assert.ok(list.length >= 2);
    assert.ok(list.some((c) => c.includes("cp1")));
    assert.ok(list.some((c) => c.includes("cp2")));
  });

  it("should restore to a checkpoint", async () => {
    tmpDir = await makeTmpRepo();
    await createCheckpoint(tmpDir, "before");
    await fs.writeFile(path.join(tmpDir, "file.txt"), "modified");
    await run("git add -A && git commit -m modify", { cwd: tmpDir });
    const result = await restoreCheckpoint(tmpDir, "before");
    assert.ok(result.success);
    const content = await fs.readFile(path.join(tmpDir, "file.txt"), "utf8");
    assert.equal(content, "initial");
  });
});
