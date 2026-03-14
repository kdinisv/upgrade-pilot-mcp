import { promises as fs } from "node:fs";
import path from "node:path";
import { parse, type ParseError } from "jsonc-parser";

const DEFAULT_IGNORES = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
]);

export function toPosixPath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextIfExists(
  filePath: string,
): Promise<string | null> {
  if (!(await fileExists(filePath))) {
    return null;
  }

  return fs.readFile(filePath, "utf8");
}

export async function readJsoncFile<T>(filePath: string): Promise<T | null> {
  const text = await readTextIfExists(filePath);
  if (text === null || text.trim() === "") {
    return null;
  }

  const errors: ParseError[] = [];
  const parsed = parse(text, errors) as T;
  if (errors.length > 0 || parsed === undefined || parsed === null) {
    return null;
  }
  return parsed;
}

export async function findFirstExisting(
  rootPath: string,
  candidates: string[],
): Promise<string | null> {
  for (const candidate of candidates) {
    const absolutePath = path.join(rootPath, candidate);
    if (await fileExists(absolutePath)) {
      return absolutePath;
    }
  }

  return null;
}

export async function findAllExisting(
  rootPath: string,
  candidates: string[],
): Promise<string[]> {
  const matches: string[] = [];

  for (const candidate of candidates) {
    const absolutePath = path.join(rootPath, candidate);
    if (await fileExists(absolutePath)) {
      matches.push(absolutePath);
    }
  }

  return matches;
}

export async function walkFiles(
  rootPath: string,
  maxFiles = 5000,
): Promise<string[]> {
  const queue = [rootPath];
  const files: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!DEFAULT_IGNORES.has(entry.name)) {
          queue.push(absolutePath);
        }
        continue;
      }

      files.push(absolutePath);
      if (files.length >= maxFiles) {
        return files;
      }
    }
  }

  return files;
}

export function relativeTo(rootPath: string, filePath: string): string {
  return toPosixPath(path.relative(rootPath, filePath));
}

export function countRegexMatches(text: string, expression: RegExp): number {
  const flags = expression.flags.includes("g")
    ? expression.flags
    : `${expression.flags}g`;
  const matcher = new RegExp(expression.source, flags);
  let matches = 0;
  while (matcher.exec(text) !== null) {
    matches += 1;
  }
  return matches;
}

export function findLineNumber(text: string, matcher: RegExp): number {
  const match = matcher.exec(text);
  if (!match || match.index === undefined) {
    return 1;
  }

  return text.slice(0, match.index).split(/\r?\n/).length;
}
