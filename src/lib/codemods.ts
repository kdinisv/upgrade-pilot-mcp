import { promises as fs } from "node:fs";
import path from "node:path";
import { type CodemodChange } from "../types.js";
import { countRegexMatches, readTextIfExists, relativeTo } from "./fs-utils.js";

const KNOWN_CODEMODS = new Set(["prisma-relation-mode", "eslint-flat-config"]);

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
    codemodIds && codemodIds.length > 0
      ? codemodIds
      : [...KNOWN_CODEMODS],
  );
  const unsupportedCodemods = [...selectedCodemods].filter(
    (id) => !KNOWN_CODEMODS.has(id),
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
      let writeError: string | undefined;
      if (changed && mode === "apply") {
        try {
          await fs.writeFile(schemaPath, updatedSchema, "utf8");
        } catch (error) {
          writeError = error instanceof Error ? error.message : String(error);
        }
      }

      const applied = mode === "apply" && changed && !writeError;
      changes.push({
        codemodId: "prisma-relation-mode",
        filePath: relativeTo(rootPath, schemaPath),
        replacements,
        changed: applied,
        ...(writeError ? { error: writeError } : {}),
      });
    }
  }

  if (selectedCodemods.has("eslint-flat-config")) {
    const legacyNames = [
      ".eslintrc",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.json",
      ".eslintrc.yml",
      ".eslintrc.yaml",
    ];
    const found: string[] = [];
    for (const name of legacyNames) {
      if ((await readTextIfExists(path.join(rootPath, name))) !== null)
        found.push(name);
    }
    if (found.length > 0) {
      const flatExists =
        (await readTextIfExists(path.join(rootPath, "eslint.config.js"))) !==
          null ||
        (await readTextIfExists(path.join(rootPath, "eslint.config.mjs"))) !==
          null;
      if (!flatExists) {
        const stub = [
          '// Auto-generated flat config bridge. Review and customise.',
          '// See https://eslint.org/docs/latest/use/configure/migration-guide',
          'import { FlatCompat } from "@eslint/eslintrc";',
          'import path from "node:path";',
          'import { fileURLToPath } from "node:url";',
          "",
          "const __dirname = path.dirname(fileURLToPath(import.meta.url));",
          "const compat = new FlatCompat({ baseDirectory: __dirname });",
          "",
          "export default [...compat.extends()];",
          "",
        ].join("\n");
        if (mode === "apply") {
          await fs.writeFile(
            path.join(rootPath, "eslint.config.mjs"),
            stub,
            "utf8",
          );
        }
        changes.push({
          codemodId: "eslint-flat-config",
          filePath: "eslint.config.mjs",
          replacements: found.length,
          changed: mode === "apply",
        });
      }
    }
  }

  return { mode, changes, unsupportedCodemods };
}
