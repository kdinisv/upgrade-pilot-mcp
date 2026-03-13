import {
  type BreakingChangeReference,
  type ProjectAnalysis,
} from "../types.js";
import { analyzeProject } from "./analyzer.js";

const PACKAGE_GUIDES: Record<string, BreakingChangeReference> = {
  typescript: {
    packageName: "typescript",
    guides: [
      {
        title: "TypeScript release notes",
        url: "https://www.typescriptlang.org/docs/handbook/release-notes/overview.html",
      },
    ],
    risks: [
      "Tighter type checking can surface latent errors.",
      "Compiler option defaults and module-resolution behavior can shift across majors.",
    ],
  },
  eslint: {
    packageName: "eslint",
    guides: [
      {
        title: "ESLint migration guide",
        url: "https://eslint.org/docs/latest/use/migrate-to-9.0.0",
      },
      {
        title: "ESLint configuration migration",
        url: "https://eslint.org/docs/latest/use/configure/migration-guide",
      },
    ],
    risks: [
      "ESLint 9 centers flat config and may break legacy config assumptions.",
      "Plugin and parser compatibility must be verified alongside the core upgrade.",
    ],
  },
  vite: {
    packageName: "vite",
    guides: [
      {
        title: "Vite migration guide",
        url: "https://vite.dev/guide/migration.html",
      },
    ],
    risks: [
      "Node.js support ranges change over time.",
      "Plugin ecosystems can lag behind new Vite majors.",
    ],
  },
  vitest: {
    packageName: "vitest",
    guides: [
      {
        title: "Vitest migration guide",
        url: "https://vitest.dev/guide/migration",
      },
    ],
    risks: [
      "Environment defaults and snapshot behavior can differ across majors.",
      "Reporter and coverage integrations should be revalidated.",
    ],
  },
  vue: {
    packageName: "vue",
    guides: [
      {
        title: "Vue migration guide",
        url: "https://v3-migration.vuejs.org/",
      },
    ],
    risks: [
      "Template compiler and macro semantics should be retested.",
      "Library compatibility matters as much as the framework version itself.",
    ],
  },
  nuxt: {
    packageName: "nuxt",
    guides: [
      {
        title: "Nuxt upgrade guide",
        url: "https://nuxt.com/docs/getting-started/upgrade",
      },
    ],
    risks: [
      "Nuxt upgrades often include runtime and config behavior changes.",
      "Modules and auto-import behavior need targeted validation.",
    ],
  },
  prisma: {
    packageName: "prisma",
    guides: [
      {
        title: "Prisma upgrade guides",
        url: "https://www.prisma.io/docs/orm/more/upgrade-guides",
      },
      {
        title: "Prisma release notes",
        url: "https://github.com/prisma/prisma/releases",
      },
    ],
    risks: [
      "Schema settings and generated client types can change across majors.",
      "Migration and engine behavior must be validated against the target database.",
    ],
  },
  "@prisma/client": {
    packageName: "@prisma/client",
    guides: [
      {
        title: "Prisma upgrade guides",
        url: "https://www.prisma.io/docs/orm/more/upgrade-guides",
      },
    ],
    risks: [
      "Client and CLI versions should be kept aligned.",
      "Generated client changes can cascade into TypeScript compile failures.",
    ],
  },
  express: {
    packageName: "express",
    guides: [
      {
        title: "Express change log",
        url: "https://github.com/expressjs/express/blob/master/History.md",
      },
    ],
    risks: [
      "Middleware ordering and async error handling should be revalidated.",
      "Third-party middleware compatibility may block major upgrades.",
    ],
  },
  fastify: {
    packageName: "fastify",
    guides: [
      {
        title: "Fastify migration guide",
        url: "https://fastify.dev/docs/latest/Guides/Migration-Guide/",
      },
    ],
    risks: [
      "Plugin compatibility is the main upgrade risk.",
      "Type-provider integrations should be checked after the bump.",
    ],
  },
};

export async function findBreakingChanges(
  rootPath = process.cwd(),
  targets?: string[],
  analysis?: ProjectAnalysis,
): Promise<BreakingChangeReference[]> {
  const projectAnalysis = analysis ?? (await analyzeProject(rootPath, false));
  const selectedTargets = new Set(
    targets && targets.length > 0
      ? targets
      : projectAnalysis.supportedDependencies.map((d) => d.name),
  );

  return [...selectedTargets]
    .map((packageName) => PACKAGE_GUIDES[packageName])
    .filter((entry): entry is BreakingChangeReference => Boolean(entry))
    .sort((left, right) => left.packageName.localeCompare(right.packageName));
}
