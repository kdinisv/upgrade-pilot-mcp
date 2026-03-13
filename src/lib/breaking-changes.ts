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
  jest: {
    packageName: "jest",
    guides: [
      {
        title: "Jest upgrade guide",
        url: "https://jestjs.io/docs/upgrading-to-jest30",
      },
    ],
    risks: [
      "Test environment defaults, snapshot output, and matcher behavior can shift across majors.",
      "Jest upgrades often surface transformer and ts-jest or babel-jest compatibility issues.",
    ],
  },
  react: {
    packageName: "react",
    guides: [
      {
        title: "React 19 upgrade guide",
        url: "https://react.dev/blog/2024/04/25/react-19-upgrade-guide",
      },
    ],
    risks: [
      "Client and server rendering behavior should be validated together with react-dom.",
      "Third-party component libraries may lag behind new React majors.",
    ],
  },
  next: {
    packageName: "next",
    guides: [
      {
        title: "Next.js upgrade guide",
        url: "https://nextjs.org/docs/app/guides/upgrading/version-16",
      },
      {
        title: "Next.js blog",
        url: "https://nextjs.org/blog",
      },
    ],
    risks: [
      "Runtime, routing, and caching behavior can change across majors.",
      "React and react-dom versions should be upgraded in lockstep with Next.js.",
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
  astro: {
    packageName: "astro",
    guides: [
      {
        title: "Astro upgrade guides",
        url: "https://docs.astro.build/en/guides/upgrade-to/",
      },
      {
        title: "Astro blog",
        url: "https://astro.build/blog/",
      },
    ],
    risks: [
      "Adapter compatibility and content collection behavior should be revalidated.",
      "Integration packages may require coordinated upgrades with the Astro core.",
    ],
  },
  "@sveltejs/kit": {
    packageName: "@sveltejs/kit",
    guides: [
      {
        title: "SvelteKit migration guide",
        url: "https://svelte.dev/docs/kit/migrating-to-sveltekit-2",
      },
    ],
    risks: [
      "Adapter and deployment targets should be revalidated after a SvelteKit upgrade.",
      "Vite and Svelte compiler changes can surface as cascading build failures.",
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
  tailwindcss: {
    packageName: "tailwindcss",
    guides: [
      {
        title: "Tailwind CSS upgrade guide",
        url: "https://tailwindcss.com/docs/upgrade-guide",
      },
    ],
    risks: [
      "CSS entrypoints and config conventions can change across Tailwind majors.",
      "Build pipeline integrations should be revalidated together with PostCSS or Vite plugins.",
    ],
  },
  "@playwright/test": {
    packageName: "@playwright/test",
    guides: [
      {
        title: "Playwright release notes",
        url: "https://playwright.dev/docs/release-notes",
      },
    ],
    risks: [
      "Browser version bumps can cause snapshot and timing regressions.",
      "CI environment assumptions should be rechecked together with reporter settings.",
    ],
  },
  cypress: {
    packageName: "cypress",
    guides: [
      {
        title: "Cypress migration guide",
        url: "https://docs.cypress.io/app/references/migration-guide",
      },
    ],
    risks: [
      "Bundler, browser support, and component-testing settings can change across majors.",
      "CI and plugin behavior should be revalidated after any Cypress major bump.",
    ],
  },
  storybook: {
    packageName: "storybook",
    guides: [
      {
        title: "Storybook migration guide",
        url: "https://storybook.js.org/docs/migration-guide",
      },
    ],
    risks: [
      "Builder and framework adapters can require synchronized upgrades.",
      "Storybook upgrades often surface config drift in addons and preview setup.",
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
  nestjs: {
    packageName: "nestjs",
    guides: [
      {
        title: "NestJS migration guide",
        url: "https://docs.nestjs.com/migration-guide",
      },
    ],
    risks: [
      "Decorators, metadata reflection, and platform adapters should be revalidated together.",
      "NestJS upgrades often span multiple coordinated @nestjs packages.",
    ],
  },
  remix: {
    packageName: "remix",
    guides: [
      {
        title: "Remix changelog",
        url: "https://remix.run/docs/en/main/start/changelog",
      },
    ],
    risks: [
      "Routing and server runtime behavior should be revalidated after upgrades.",
      "Build tooling and adapter packages may need coordinated version changes.",
    ],
  },
  angular: {
    packageName: "angular",
    guides: [
      {
        title: "Angular update guide",
        url: "https://angular.dev/update-guide",
      },
    ],
    risks: [
      "Angular major upgrades commonly require synchronized framework, CLI, and TypeScript changes.",
      "Template compilation and builder settings should be revalidated after the bump.",
    ],
  },
};

function getGuideKey(packageName: string): string {
  if (packageName === "react-dom") {
    return "react";
  }
  if (packageName === "playwright") {
    return "@playwright/test";
  }
  if (packageName === "storybook" || packageName.startsWith("@storybook/")) {
    return "storybook";
  }
  if (packageName.startsWith("@nestjs/")) {
    return "nestjs";
  }
  if (packageName.startsWith("@remix-run/")) {
    return "remix";
  }
  if (packageName.startsWith("@angular/")) {
    return "angular";
  }

  return packageName;
}

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

  const guideKeys = new Set(
    [...selectedTargets]
      .map((packageName) => getGuideKey(packageName))
      .filter((packageName) => Boolean(PACKAGE_GUIDES[packageName])),
  );

  return [...guideKeys]
    .map((packageName) => PACKAGE_GUIDES[packageName])
    .filter((entry): entry is BreakingChangeReference => Boolean(entry))
    .sort((left, right) => left.packageName.localeCompare(right.packageName));
}
