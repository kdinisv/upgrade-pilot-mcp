import { promises as fs } from "node:fs";
import path from "node:path";
import { type CodemodChange } from "../types.js";
import {
  countRegexMatches,
  readTextIfExists,
  relativeTo,
  walkFiles,
} from "./fs-utils.js";

const KNOWN_CODEMODS = new Set([
  "prisma-relation-mode",
  "eslint-flat-config",
  "tailwind-v4-import",
]);

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
    codemodIds && codemodIds.length > 0 ? codemodIds : [...KNOWN_CODEMODS],
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
          "// Auto-generated flat config bridge. Review and customise.",
          "// See https://eslint.org/docs/latest/use/configure/migration-guide",
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

  if (selectedCodemods.has("tailwind-v4-import")) {
    const cssFiles = (await walkFiles(rootPath)).filter((f) =>
      /\.css$/i.test(f),
    );
    const tw3Directive = /^@tailwind\s+(base|components|utilities)\s*;?\s*$/gm;
    const tw3Import =
      /^@import\s+['"]tailwindcss\/(base|components|utilities)['"].*;?\s*$/gm;
    for (const absPath of cssFiles) {
      const content = await readTextIfExists(absPath);
      if (content === null) continue;
      const directiveCount = countRegexMatches(content, tw3Directive);
      const importCount = countRegexMatches(content, tw3Import);
      const total = directiveCount + importCount;
      if (total === 0) continue;
      let updated = content.replace(tw3Directive, "").replace(tw3Import, "");
      // Remove empty lines left behind, but preserve a single newline
      updated = updated.replace(/\n{3,}/g, "\n\n");
      // Prepend the v4 import at the top
      updated = '@import "tailwindcss";\n' + updated.replace(/^\n+/, "\n");
      if (mode === "apply") {
        await fs.writeFile(absPath, updated, "utf8");
      }
      changes.push({
        codemodId: "tailwind-v4-import",
        filePath: relativeTo(rootPath, absPath),
        replacements: total,
        changed: mode === "apply",
      });
    }
  }

  return { mode, changes, unsupportedCodemods };
}
