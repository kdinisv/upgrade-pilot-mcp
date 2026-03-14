import { exec } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(exec);

const TAG_PREFIX = "upgrade-pilot/";

export interface CheckpointResult {
  success: boolean;
  ref: string;
  message: string;
}

export async function createCheckpoint(
  rootPath: string,
  label: string,
): Promise<CheckpointResult> {
  const ref = `${TAG_PREFIX}${label}`;
  await run(`git tag -f ${ref}`, { cwd: rootPath });
  return { success: true, ref, message: `Checkpoint created: ${ref}` };
}

export async function listCheckpoints(rootPath: string): Promise<string[]> {
  const { stdout } = await run(`git tag -l "${TAG_PREFIX}*"`, {
    cwd: rootPath,
  });
  return stdout
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
}

export async function restoreCheckpoint(
  rootPath: string,
  label: string,
): Promise<CheckpointResult> {
  const ref = `${TAG_PREFIX}${label}`;
  await run(`git reset --hard ${ref}`, { cwd: rootPath });
  return { success: true, ref, message: `Restored to checkpoint: ${ref}` };
}
