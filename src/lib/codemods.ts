import { promises as fs } from "node:fs";
import path from "node:path";
import { type CodemodChange } from "../types.js";
import { countRegexMatches, readTextIfExists, relativeTo } from "./fs-utils.js";

export async function applySafeCodemods(
  rootPath = process.cwd(),
  mode: "dry-run" | "apply" = "dry-run",
  codemodIds?: string[],
): Promise<{
  mode: "dry-run" | "apply";
  changes: CodemodChange[];
  unsupportedCodemods: string[];
}> {
  const selectedCodemods = new Set(
    codemodIds && codemodIds.length > 0 ? codemodIds : ["prisma-relation-mode"],
  );
  const unsupportedCodemods = [...selectedCodemods].filter(
    (id) => id !== "prisma-relation-mode",
  );
  const changes: CodemodChange[] = [];

  if (selectedCodemods.has("prisma-relation-mode")) {
    const schemaPath = path.join(rootPath, "prisma/schema.prisma");
    const schema = await readTextIfExists(schemaPath);
    if (schema !== null) {
      const matcher = /referentialIntegrity(\s*=\s*"[^"]+")/g;
      const replacements = countRegexMatches(schema, matcher);
      const updatedSchema = schema.replaceAll(matcher, "relationMode$1");
      const changed = updatedSchema !== schema;
      if (changed && mode === "apply") {
        await fs.writeFile(schemaPath, updatedSchema, "utf8");
      }

      changes.push({
        codemodId: "prisma-relation-mode",
        filePath: relativeTo(rootPath, schemaPath),
        replacements,
        changed: mode === "apply" ? changed : false,
      });
    }
  }

  return { mode, changes, unsupportedCodemods };
}
