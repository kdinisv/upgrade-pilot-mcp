# upgrade-pilot-mcp

Specialized MCP server for JavaScript and TypeScript stack upgrades.

The first route is intentionally narrow:

- Node.js
- TypeScript
- ESLint
- Vite
- Vitest
- Vue 3 or Nuxt
- Prisma

The server is designed around agent workflow rather than thin API wrapping. The current v1 focuses on project fingerprinting, upgrade path detection, breaking-change guidance, targeted deprecation scanning, safe codemod execution, validation, and PR-summary generation.

## Implemented tools

- analyze_project
- detect_upgrade_paths
- find_breaking_changes
- scan_repo_for_deprecations
- generate_upgrade_plan
- apply_safe_codemods
- validate_upgrade
- write_upgrade_pr_summary

## Implemented prompts

- plan_upgrade_route
- draft_upgrade_pr

## Security posture

- stdio transport only
- no HTTP listener in v1
- no destructive codemods by default
- safe codemods are opt-in and explicit

## Scripts

- npm run dev
- npm run build
- npm run check
- npm run start

## Status

This repository currently contains the v1 scaffold and a runnable stdio MCP server with contract-aligned tools, prompts, and artifact resources.