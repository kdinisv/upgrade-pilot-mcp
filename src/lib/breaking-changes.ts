import {
  type BreakingChangeReference,
  type ProjectAnalysis,
} from "../types.js";
import { analyzeProject } from "./analyzer.js";

const PACKAGE_GUIDES: Record<string, BreakingChangeReference> = {
  sass: {
    packageName: "sass",
    guides: [
      {
        title: "Dart Sass releases",
        url: "https://github.com/sass/dart-sass/releases",
      },
    ],
    risks: [
      "Deprecation warnings for legacy APIs can become hard errors across major versions.",
      "Color function and import behavior should be revalidated after Sass upgrades.",
    ],
  },
  postcss: {
    packageName: "postcss",
    guides: [
      {
        title: "PostCSS releases",
        url: "https://github.com/postcss/postcss/releases",
      },
    ],
    risks: [
      "Plugin API and parser expectations can shift across PostCSS majors.",
      "Build pipeline changes often cascade into Tailwind or bundler integration issues.",
    ],
  },
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
        title: "ESLint 8→9 migration guide",
        url: "https://eslint.org/docs/latest/use/migrate-to-9.0.0",
        fromMajor: 8,
        toMajor: 9,
      },
      {
        title: "ESLint configuration migration",
        url: "https://eslint.org/docs/latest/use/configure/migration-guide",
        fromMajor: 8,
        toMajor: 9,
      },
    ],
    risks: [
      "ESLint 9 centers flat config and may break legacy config assumptions.",
      "Plugin and parser compatibility must be verified alongside the core upgrade.",
    ],
  },
  prettier: {
    packageName: "prettier",
    guides: [
      {
        title: "Prettier blog and release notes",
        url: "https://prettier.io/blog/",
      },
    ],
    risks: [
      "Formatting output changes can create large diffs and require snapshot or lint updates.",
      "Plugin compatibility should be checked alongside any Prettier major upgrade.",
    ],
  },
  webpack: {
    packageName: "webpack",
    guides: [
      {
        title: "Webpack 4→5 migration guide",
        url: "https://webpack.js.org/migrate/5/",
        fromMajor: 4,
        toMajor: 5,
      },
    ],
    risks: [
      "Loader and plugin compatibility is the main risk surface for Webpack upgrades.",
      "Bundling defaults and dev-server behavior can shift across majors.",
    ],
  },
  rollup: {
    packageName: "rollup",
    guides: [
      {
        title: "Rollup migration guide",
        url: "https://rollupjs.org/migration/",
      },
    ],
    risks: [
      "Plugin compatibility should be verified before any Rollup major bump.",
      "Output defaults and config semantics can change across versions.",
    ],
  },
  esbuild: {
    packageName: "esbuild",
    guides: [
      {
        title: "esbuild releases",
        url: "https://github.com/evanw/esbuild/releases",
      },
    ],
    risks: [
      "Minification, target, and loader defaults can affect runtime behavior.",
      "Esbuild upgrades should be validated together with framework-specific adapters.",
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
        title: "Jest 29→30 upgrade guide",
        url: "https://jestjs.io/docs/upgrading-to-jest30",
        fromMajor: 29,
        toMajor: 30,
      },
    ],
    risks: [
      "Test environment defaults, snapshot output, and matcher behavior can shift across majors.",
      "Jest upgrades often surface transformer and ts-jest or babel-jest compatibility issues.",
    ],
  },
  mocha: {
    packageName: "mocha",
    guides: [
      {
        title: "Mocha releases",
        url: "https://github.com/mochajs/mocha/releases",
      },
    ],
    risks: [
      "Node.js support ranges and CLI behavior may change across Mocha majors.",
      "Reporter and setup-file behavior should be revalidated after upgrades.",
    ],
  },
  babel: {
    packageName: "babel",
    guides: [
      {
        title: "Babel 7→8 migration guide",
        url: "https://babeljs.io/docs/v8-migration",
        fromMajor: 7,
        toMajor: 8,
      },
    ],
    risks: [
      "Transpilation output and plugin compatibility can shift across Babel majors.",
      "Jest, webpack, and framework adapters often depend on synchronized Babel changes.",
    ],
  },
  swc: {
    packageName: "swc",
    guides: [
      {
        title: "SWC releases",
        url: "https://github.com/swc-project/swc/releases",
      },
    ],
    risks: [
      "Compiler output and transform behavior should be revalidated after SWC upgrades.",
      "Framework integrations may pin SWC behavior more tightly than semver suggests.",
    ],
  },
  react: {
    packageName: "react",
    guides: [
      {
        title: "React 18 upgrade guide",
        url: "https://react.dev/blog/2022/03/08/react-18-upgrade-guide",
        fromMajor: 17,
        toMajor: 18,
      },
      {
        title: "React 19 upgrade guide",
        url: "https://react.dev/blog/2024/04/25/react-19-upgrade-guide",
        fromMajor: 18,
        toMajor: 19,
      },
    ],
    risks: [
      "Client and server rendering behavior should be validated together with react-dom.",
      "Third-party component libraries may lag behind new React majors.",
    ],
  },
  "react-router": {
    packageName: "react-router",
    guides: [
      {
        title: "React Router v5→v6 upgrading guide",
        url: "https://reactrouter.com/upgrading/v5",
        fromMajor: 5,
        toMajor: 6,
      },
      {
        title: "React Router v6→v7 upgrading guide",
        url: "https://reactrouter.com/upgrading/v6",
        fromMajor: 6,
        toMajor: 7,
      },
    ],
    risks: [
      "Data APIs and route configuration semantics can change across major versions.",
      "Upgrades often require coordinated changes in loaders, actions, and route definitions.",
    ],
  },
  redux: {
    packageName: "redux",
    guides: [
      {
        title: "Redux migration guide",
        url: "https://redux.js.org/usage/migrations/migrating-to-modern-redux",
      },
    ],
    risks: [
      "Store setup, middleware, and typed hooks often need modernization during Redux upgrades.",
      "Redux Toolkit and legacy Redux code can require different migration paths inside one repo.",
    ],
  },
  "react-query": {
    packageName: "react-query",
    guides: [
      {
        title: "TanStack Query v5 migration guide",
        url: "https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5",
      },
    ],
    risks: [
      "Query defaults and cache behavior can change in ways that look like runtime regressions.",
      "Hook option signatures and mutation behavior should be retested after upgrades.",
    ],
  },
  next: {
    packageName: "next",
    guides: [
      {
        title: "Next.js 14→15 upgrade guide",
        url: "https://nextjs.org/docs/app/guides/upgrading/version-15",
        fromMajor: 14,
        toMajor: 15,
      },
      {
        title: "Next.js 15→16 upgrade guide",
        url: "https://nextjs.org/docs/app/guides/upgrading/version-16",
        fromMajor: 15,
        toMajor: 16,
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
        title: "Vue 2→3 migration guide",
        url: "https://v3-migration.vuejs.org/",
        fromMajor: 2,
        toMajor: 3,
      },
    ],
    risks: [
      "Template compiler and macro semantics should be retested.",
      "Library compatibility matters as much as the framework version itself.",
    ],
  },
  "vue-router": {
    packageName: "vue-router",
    guides: [
      {
        title: "Vue Router migration guide",
        url: "https://router.vuejs.org/guide/migration/",
      },
    ],
    risks: [
      "Route configuration and navigation guard behavior should be revalidated across majors.",
      "Vue Router upgrades can require paired changes in app bootstrap and typed route helpers.",
    ],
  },
  pinia: {
    packageName: "pinia",
    guides: [
      {
        title: "Pinia releases",
        url: "https://github.com/vuejs/pinia/releases",
      },
    ],
    risks: [
      "Store hydration and plugin behavior should be revalidated after major upgrades.",
      "Interoperability with Vue Router and SSR setup should be checked in Nuxt and Vue apps.",
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
  svelte: {
    packageName: "svelte",
    guides: [
      {
        title: "Svelte 4→5 migration guide",
        url: "https://svelte.dev/docs/svelte/v5-migration-guide",
        fromMajor: 4,
        toMajor: 5,
      },
    ],
    risks: [
      "Component API and reactivity semantics can shift across Svelte majors.",
      "Compiler changes should be validated together with SvelteKit or bundler integrations.",
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
  "drizzle-orm": {
    packageName: "drizzle-orm",
    guides: [
      {
        title: "Drizzle ORM latest releases",
        url: "https://orm.drizzle.team/docs/latest-releases/drizzle-orm",
      },
    ],
    risks: [
      "Schema definition and query builder typing should be revalidated after upgrades.",
      "Driver and migration package versions may need coordinated changes.",
    ],
  },
  mongoose: {
    packageName: "mongoose",
    guides: [
      {
        title: "Mongoose migration guide",
        url: "https://mongoosejs.com/docs/migrating_to_8.html",
      },
    ],
    risks: [
      "Default schema behavior and connection options can change across majors.",
      "Model typing and query semantics should be revalidated with TypeScript enabled.",
    ],
  },
  typeorm: {
    packageName: "typeorm",
    guides: [
      {
        title: "TypeORM releases",
        url: "https://github.com/typeorm/typeorm/releases",
      },
    ],
    risks: [
      "Data source setup, migrations, and decorator metadata often drift across TypeORM versions.",
      "Runtime database behavior should be revalidated together with entity typing changes.",
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
  husky: {
    packageName: "husky",
    guides: [
      {
        title: "Husky migration guide",
        url: "https://typicode.github.io/husky/migrate-from-v4.html",
      },
    ],
    risks: [
      "Hook installation and repository bootstrap behavior often change across Husky majors.",
      "CI and local developer environments should both be validated after updates.",
    ],
  },
  "lint-staged": {
    packageName: "lint-staged",
    guides: [
      {
        title: "lint-staged releases",
        url: "https://github.com/lint-staged/lint-staged/releases",
      },
    ],
    risks: [
      "Task execution semantics and config loading can shift across major versions.",
      "lint-staged upgrades should be validated together with Husky and formatter changes.",
    ],
  },
  commitlint: {
    packageName: "commitlint",
    guides: [
      {
        title: "commitlint releases",
        url: "https://github.com/conventional-changelog/commitlint/releases",
      },
    ],
    risks: [
      "Rule defaults and parser behavior can change across commitlint majors.",
      "Hook integration should be revalidated together with Husky updates.",
    ],
  },
  supertest: {
    packageName: "supertest",
    guides: [
      {
        title: "Supertest releases",
        url: "https://github.com/forwardemail/supertest/releases",
      },
    ],
    risks: [
      "Assertion and HTTP behavior should be revalidated after major dependency upgrades.",
      "Framework adapter changes in Express, Fastify, or NestJS can surface in integration tests first.",
    ],
  },
  msw: {
    packageName: "msw",
    guides: [
      {
        title: "MSW v2 migration guide",
        url: "https://mswjs.io/docs/migrations/1.x-to-2.x",
      },
    ],
    risks: [
      "Request interception behavior and handler signatures can change across majors.",
      "Browser and Node test environments should be revalidated separately after upgrades.",
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
  hono: {
    packageName: "hono",
    guides: [
      {
        title: "Hono migration guide",
        url: "https://hono.dev/docs/migration",
      },
    ],
    risks: [
      "Context APIs and runtime adapters should be revalidated after major upgrades.",
      "Middleware assumptions can shift when Hono runtime support evolves.",
    ],
  },
  "socket.io": {
    packageName: "socket.io",
    guides: [
      {
        title: "Socket.IO migration guide",
        url: "https://socket.io/docs/v4/migrating-from-3-x-to-4-0/",
      },
    ],
    risks: [
      "Transport defaults and protocol compatibility should be revalidated after upgrades.",
      "Client and server packages often need coordinated version bumps.",
    ],
  },
  graphql: {
    packageName: "graphql",
    guides: [
      {
        title: "GraphQL.js upgrade guides",
        url: "https://www.graphql-js.org/upgrade-guides/",
      },
    ],
    risks: [
      "Schema utilities and validation behavior can change in subtle but breaking ways.",
      "Framework wrappers often expose GraphQL changes later than the core package.",
    ],
  },
  axios: {
    packageName: "axios",
    guides: [
      {
        title: "Axios migration guide",
        url: "https://github.com/axios/axios/blob/v1.x/MIGRATION_GUIDE.md",
      },
    ],
    risks: [
      "Request config defaults and interceptor behavior should be retested after major upgrades.",
      "HTTP client changes can surface only in production integrations if validation is too narrow.",
    ],
  },
  zod: {
    packageName: "zod",
    guides: [
      {
        title: "Zod 4 migration guide",
        url: "https://zod.dev/v4?id=migration-guide",
      },
    ],
    risks: [
      "Schema inference and issue formatting can change across Zod majors.",
      "Validation layer upgrades can cascade into API and form typing errors.",
    ],
  },
  lodash: {
    packageName: "lodash",
    guides: [
      {
        title: "Lodash releases",
        url: "https://github.com/lodash/lodash/releases",
      },
    ],
    risks: [
      "Import style and tree-shaking assumptions should be revalidated if usage is spread across the repo.",
      "Legacy CommonJS consumption patterns can complicate modernization work.",
    ],
  },
  rxjs: {
    packageName: "rxjs",
    guides: [
      {
        title: "RxJS migration guide",
        url: "https://rxjs.dev/guide/v7/migration",
      },
    ],
    risks: [
      "Operator imports and scheduler behavior can shift across RxJS majors.",
      "Framework-specific integrations often mask RxJS breaking changes until runtime.",
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
  turbo: {
    packageName: "turbo",
    guides: [
      {
        title: "Turborepo upgrade guide",
        url: "https://turborepo.com/docs/crafting-your-repository/upgrading",
      },
    ],
    risks: [
      "Pipeline semantics and task caching should be revalidated after Turbo upgrades.",
      "Monorepo tool changes can affect CI and local workflows differently.",
    ],
  },
  nx: {
    packageName: "nx",
    guides: [
      {
        title: "Nx migrations",
        url: "https://nx.dev/features/automate-updating-dependencies",
      },
    ],
    risks: [
      "Nx upgrades often span workspace config, generators, executors, and plugin packages.",
      "Affected commands and cache behavior should be revalidated in CI.",
    ],
  },
  tsup: {
    packageName: "tsup",
    guides: [
      {
        title: "tsup releases",
        url: "https://github.com/egoist/tsup/releases",
      },
    ],
    risks: [
      "Bundling defaults and output format behavior can change across tsup versions.",
      "tsup upgrades should be revalidated together with esbuild and package export settings.",
    ],
  },
};

const GUIDE_KEY_ALIASES: Record<string, string> = {
  "react-dom": "react",
  "@babel/core": "babel",
  "@swc/core": "swc",
  "@reduxjs/toolkit": "redux",
  "@tanstack/react-query": "react-query",
  playwright: "@playwright/test",
  "@commitlint/cli": "commitlint",
  storybook: "storybook",
};

const GUIDE_KEY_PREFIXES: ReadonlyArray<[string, string]> = [
  ["@storybook/", "storybook"],
  ["@nestjs/", "nestjs"],
  ["@remix-run/", "remix"],
  ["@angular/", "angular"],
];

function getGuideKey(packageName: string): string {
  const alias = GUIDE_KEY_ALIASES[packageName];
  if (alias) {
    return alias;
  }

  for (const [prefix, key] of GUIDE_KEY_PREFIXES) {
    if (packageName.startsWith(prefix)) {
      return key;
    }
  }

  return packageName;
}

type Guide = BreakingChangeReference["guides"][number];

export function filterGuidesByVersion(
  guides: Guide[],
  currentMajor: number | null | undefined,
  targetMajor: number | null | undefined,
): Guide[] {
  if (currentMajor == null || targetMajor == null) return guides;
  return guides.filter((g) => {
    if (g.fromMajor == null || g.toMajor == null) return true;
    return g.fromMajor >= currentMajor && g.toMajor <= targetMajor;
  });
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

  // Build a version map from supported dependencies for filtering
  const versionInfo = new Map<string, { currentMajor: number | null }>();
  for (const dep of projectAnalysis.supportedDependencies) {
    const key = getGuideKey(dep.name);
    if (!versionInfo.has(key)) {
      const match = dep.versionRange.match(/(\d+)/);
      versionInfo.set(key, {
        currentMajor: match ? Number(match[1]) : null,
      });
    }
  }

  const guideKeys = new Set(
    [...selectedTargets]
      .map((packageName) => getGuideKey(packageName))
      .filter((packageName) => Boolean(PACKAGE_GUIDES[packageName])),
  );

  return [...guideKeys]
    .map((key) => {
      const entry = PACKAGE_GUIDES[key];
      if (!entry) return null;
      const info = versionInfo.get(key);
      const currentMajor = info?.currentMajor ?? null;
      // Determine latest major from the highest toMajor in guides
      const latestGuide = entry.guides.reduce<number | null>(
        (max, g) => (g.toMajor != null ? Math.max(max ?? 0, g.toMajor) : max),
        null,
      );
      const filteredGuides = filterGuidesByVersion(
        entry.guides,
        currentMajor,
        latestGuide,
      );
      return {
        ...entry,
        guides: filteredGuides.length > 0 ? filteredGuides : entry.guides,
      };
    })
    .filter((entry): entry is BreakingChangeReference => Boolean(entry))
    .sort((left, right) => left.packageName.localeCompare(right.packageName));
}
