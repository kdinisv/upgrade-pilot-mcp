# upgrade-pilot-mcp v1 contracts

## Scope

V1 is a workflow MCP for popular JS/TS upgrade routes:

- package manager driven Node.js repositories
- TypeScript present or planned
- ESLint, Prettier
- PostCSS, Sass, Webpack, Rollup, esbuild, tsup
- Vite, Vitest, Jest, Mocha
- Babel, SWC
- React, React DOM, Next.js, React Router, Redux Toolkit, TanStack Query
- Vue, Vue Router, Pinia, Nuxt
- Astro, Svelte, SvelteKit, Remix
- Tailwind CSS, Storybook
- Playwright, Cypress, Supertest, MSW
- Prisma
- Express, Fastify, Hono, NestJS
- GraphQL, Socket.IO
- Mongoose, Drizzle ORM, TypeORM
- Husky, lint-staged, commitlint
- Turbo, Nx
- Axios, Zod, Lodash, RxJS
- Angular

Supported package families also include `@nestjs/*`, `@storybook/*`, `@remix-run/*`, and `@angular/*`.

The server is optimized for low-risk upgrade orchestration, not for generic package intelligence and not for arbitrary code transformation.

## Non-goals

- generic package manager wrapper
- monorepo-wide graph optimization
- arbitrary codemod execution from remote sources
- HTTP transport in v1
- silent mutation of user repositories

## Tool contracts

### analyze_project

Purpose: build a stable fingerprint of the repository before any upgrade work.

Input:

- rootPath: optional absolute path to the target repository
- includeScripts: optional boolean, defaults to true

Output:

- package manager and lockfile
- package.json metadata
- scripts
- dependency snapshot for supported packages
- config-file presence for TypeScript, ESLint, Prettier, PostCSS, Webpack, Rollup, Vite, Vitest, Jest, Mocha, Babel, SWC, Next, Nuxt, Astro, SvelteKit, Tailwind, Playwright, Cypress, Storybook, Husky, lint-staged, commitlint, Turbo, Nx, Nest, Remix, Angular, Prisma
- workspace detection (npm/yarn workspaces field and pnpm-workspace.yaml)
- detected stack tags
- warnings and upgrade readiness notes (including multiple-lockfile conflicts)

### detect_upgrade_paths

Purpose: compute a pragmatic upgrade sequence for supported packages.

Input:

- rootPath: optional absolute path
- targets: optional subset of supported packages

Output:

- installed ranges
- normalized current version baseline when derivable
- latest published version when resolvable
- required major-step sequence
- notes about unknown ranges and network-resolution failures

### find_breaking_changes

Purpose: attach curated migration references and risk themes to the selected packages.

Input:

- rootPath: optional absolute path
- targets: optional subset of supported packages

Output:

- official migration-guide URLs per package
- release-note URLs per package when known
- curated risk themes that should be checked during the upgrade

### scan_repo_for_deprecations

Purpose: search the codebase for high-signal deprecated or risky patterns related to the supported route.

Input:

- rootPath: optional absolute path
- targets: optional subset of supported packages
- maxFindings: optional limit, defaults to 100

Output:

- finding id and severity
- file path and line number
- affected package
- why it is risky
- recommended next action

### generate_upgrade_plan

Purpose: turn project analysis and package intelligence into an ordered upgrade plan.

Input:

- rootPath: optional absolute path
- targets: optional subset of supported packages

Output:

- phase-by-phase plan
- sequencing rationale
- commands or actions to take manually
- risk list
- validation checklist

### run_upgrade_pipeline

Purpose: execute the full diagnostic pipeline (analyze → paths → breaking changes → deprecations → plan) in a single call. Returns a compact text summary to minimize token usage while storing all artifacts for resource access.

Input:

- rootPath: optional absolute path
- targets: optional subset of supported packages
- skipSteps: optional list of steps to skip (findings, breakingChanges)

Output:

- compact text summary (project, stack, outdated counts, top risks, plan overview)
- all artifacts stored internally for resource access

### apply_safe_codemods

Purpose: execute only deterministic, local, reviewable codemods.

Input:

- rootPath: optional absolute path
- mode: dry-run or apply
- codemodIds: optional subset of supported codemods

Output:

- detected codemod candidates
- per-file replacements
- whether files were changed
- error message when a file write fails in apply mode
- unsupported codemod requests

V1 codemods:

- prisma-relation-mode: rename referentialIntegrity to relationMode in schema.prisma
- eslint-flat-config: generate eslint.config.mjs FlatCompat bridge from legacy .eslintrc.\* files
- tailwind-v4-import: replace @tailwind base/components/utilities and @import tailwindcss/\* with @import "tailwindcss"

### validate_upgrade

Purpose: run the smallest reliable validation set after dependency and config changes.

Input:

- rootPath: optional absolute path
- include: optional list of validations from types, lint, test, build
- timeoutMs: optional command timeout in milliseconds, defaults to 300 000 (5 minutes)

Output:

- executed commands
- exit codes
- stdout and stderr excerpts (head + tail preserved when truncated)
- overall pass/fail summary
- skipped validations with reasons

### write_upgrade_pr_summary

Purpose: produce a PR-ready markdown summary from the current repository state and computed plan.

Input:

- rootPath: optional absolute path
- targets: optional subset of supported packages

Output:

- markdown summary with change scope
- package upgrade route
- risks
- validation status if available
- manual follow-up checklist

### install_upgrade

Purpose: install specific package versions using the detected package manager (npm, yarn, pnpm).

Input:

- rootPath: optional absolute path
- packages: array of { name, version, dev? }

Output:

- command executed
- exit code, stdout, stderr
- packages installed

### check_compatibility

Purpose: verify peerDependency compatibility for a set of packages before installing.

Input:

- packages: array of { name, version }

Output:

- per-package peer dependency map
- compatibility status
- conflict descriptions

### create_checkpoint

Purpose: tag current HEAD for safe rollback during upgrade.

Input:

- rootPath: optional absolute path
- label: checkpoint name, defaults to "pre-upgrade"

Output:

- created tag ref
- success status

### restore_checkpoint

Purpose: hard-reset to a previously created checkpoint tag.

Input:

- rootPath: optional absolute path
- label: checkpoint name

Output:

- restored tag ref
- success status

### list_checkpoints

Purpose: list all upgrade-pilot checkpoint tags in the repository.

Input:

- rootPath: optional absolute path

Output:

- list of checkpoint tag names

## Cross-cutting features

### outputFormat parameter

Five diagnostic tools accept `outputFormat?: "full" | "compact"`:

- analyze_project
- detect_upgrade_paths
- find_breaking_changes
- scan_repo_for_deprecations
- generate_upgrade_plan

When `"compact"`, responses are stripped to essential fields with counts replacing arrays. Saves tokens on subsequent calls.

### Analysis caching

`validate_upgrade`, `generate_upgrade_plan`, and `write_upgrade_pr_summary` accept an optional `analysis` object (a previously returned `ProjectAnalysis`). When supplied, the tool skips redundant `analyzeProject()` calls.

### quietOnSuccess

`validate_upgrade` accepts `quietOnSuccess?: boolean`. When true and all checks pass, returns a one-line summary (`"types ✓, lint ○..."`) instead of full validation output.

### Version-aware breaking changes

`find_breaking_changes` filters guide entries by the detected version transition. Guide entries carry `fromMajor`/`toMajor` ranges; only guides matching the current→latest major transition are returned. When versions are unknown, all guides are included as a fallback.

## Resource contracts

Resource URIs are intentionally stable and artifact-shaped:

- upgrade://analysis/latest
- upgrade://paths/latest
- upgrade://breaking-changes/latest
- upgrade://findings/latest
- upgrade://plan/latest
- upgrade://pipeline/latest
- upgrade://codemods/latest
- upgrade://validation/latest
- upgrade://summary/latest

Each resource represents the last successfully generated artifact for the current server process and must be read-only.

## Prompt contracts

### plan_upgrade_route

Purpose: instruct a client agent to execute the safest upgrade workflow in the correct order.

Arguments:

- rootPath
- targets
- objective

### draft_upgrade_pr

Purpose: instruct a client agent to turn current artifacts into a concise, reviewer-friendly PR description.

Arguments:

- rootPath
- targets
- includeValidation

## Safety rules

- Default behavior is read-only.
- Codemods require explicit mode=apply.
- Validation only executes local commands from the target repository.
- Network access is limited to version resolution and curated migration-reference URLs.
- Tools should return actionable diagnostics instead of generic failures.
