import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TAG_PREFIX = "upgrade-pilot/";
const SAFE_LABEL = /^[a-zA-Z0-9._-]+$/;

function validateLabel(label: string): void {
  if (!SAFE_LABEL.test(label)) {
    throw new Error(
      `Invalid checkpoint label "${label}". Use only alphanumerics, dots, hyphens, and underscores.`,
    );
  }
}

export interface CheckpointResult {
  success: boolean;
  ref: string;
  message: string;
}

export async function createCheckpoint(
  rootPath: string,
  label: string,
): Promise<CheckpointResult> {
  validateLabel(label);
  const ref = `${TAG_PREFIX}${label}`;
  await execFileAsync("git", ["tag", "-f", ref], { cwd: rootPath });
  return { success: true, ref, message: `Checkpoint created: ${ref}` };
}

export async function listCheckpoints(rootPath: string): Promise<string[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["tag", "-l", `${TAG_PREFIX}*`],
    { cwd: rootPath },
  );
  return stdout
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);
}

export async function restoreCheckpoint(
  rootPath: string,
  label: string,
): Promise<CheckpointResult> {
  validateLabel(label);
  const ref = `${TAG_PREFIX}${label}`;
  await execFileAsync("git", ["reset", "--hard", ref], { cwd: rootPath });
  return { success: true, ref, message: `Restored to checkpoint: ${ref}` };
}
