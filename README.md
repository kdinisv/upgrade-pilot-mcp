# upgrade-pilot-mcp

[English](#upgrade-pilot-mcp) | [Русский](#upgrade-pilot-mcp-ru)

Specialized workflow MCP server for safer JavaScript / TypeScript stack upgrades and migrations.

The v1 route covers:

- Node.js
- TypeScript
- ESLint
- Vite / Vitest / Jest
- React / React DOM / Next.js
- Vue / Nuxt
- Astro / SvelteKit / Remix
- Tailwind CSS / Storybook
- Playwright / Cypress
- Prisma
- Express / Fastify / NestJS
- Angular

Recognized package families also include `@nestjs/*`, `@storybook/*`, `@remix-run/*`, and `@angular/*`.

The server is designed around agent workflow rather than thin API wrapping. It focuses on project fingerprinting, upgrade path detection, breaking-change guidance, targeted deprecation scanning, safe codemod execution, validation, and PR-summary generation.

## Tools

| Tool                         | Purpose                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `analyze_project`            | Read package metadata, lockfiles, and config files to fingerprint the project |
| `detect_upgrade_paths`       | Compute constrained upgrade steps per supported package                       |
| `find_breaking_changes`      | Attach official migration guides and curated risk areas                       |
| `scan_repo_for_deprecations` | Find high-signal deprecated patterns in the codebase                          |
| `generate_upgrade_plan`      | Build a phased, ordered upgrade plan                                          |
| `apply_safe_codemods`        | Run deterministic codemods allowed by the v1 safety model                     |
| `validate_upgrade`           | Execute type-check, lint, test, and build commands                            |
| `write_upgrade_pr_summary`   | Generate a reviewer-friendly markdown summary                                 |

## Resources

Each resource provides the last successfully generated artifact for the current server session.

| URI                                 | Content                    |
| ----------------------------------- | -------------------------- |
| `upgrade://analysis/latest`         | Project analysis snapshot  |
| `upgrade://paths/latest`            | Upgrade path results       |
| `upgrade://breaking-changes/latest` | Breaking change references |
| `upgrade://findings/latest`         | Deprecation scan findings  |
| `upgrade://plan/latest`             | Upgrade plan               |
| `upgrade://validation/latest`       | Validation results         |
| `upgrade://summary/latest`          | PR summary (markdown)      |

## Prompts

- **plan_upgrade_route** — guide an agent through the safest upgrade workflow
- **draft_upgrade_pr** — turn upgrade artifacts into a concise PR description

## Project structure

```
src/
├── server.ts                  # MCP server entry point (stdio transport)
├── types.ts                   # Shared type definitions
└── lib/
    ├── analyzer.ts            # Project fingerprinting
    ├── upgrade-paths.ts       # Version resolution and upgrade steps
    ├── breaking-changes.ts    # Curated migration guides data
    ├── deprecation-scanner.ts # Pattern-based deprecation scanning
    ├── plan-generator.ts      # Plan generation and PR summary
    ├── codemods.ts            # Safe codemod execution
    ├── validation.ts          # Type-check, lint, test, build runner
    └── fs-utils.ts            # File system helpers
```

## Security posture

- stdio transport only — no HTTP listener in v1
- default behavior is read-only
- codemods require explicit `mode: "apply"`
- validation only executes local scripts from the target repository
- no remote code execution

## Scripts

```bash
npm run dev     # watch mode via tsx
npm run build   # compile TypeScript to dist/
npm run check   # type-check without emitting
npm run start   # run compiled server
```

## MCP client configuration

```json
{
  "mcpServers": {
    "upgrade-pilot": {
      "command": "node",
      "args": ["path/to/upgrade-pilot-mcp/dist/server.js"]
    }
  }
}
```

## Status

v1 scaffold with a runnable stdio MCP server, contract-aligned tools, prompts, and artifact resources. See [docs/v1-contracts.md](docs/v1-contracts.md) for the full contract specification.

---

<a id="upgrade-pilot-mcp-ru"></a>

# upgrade-pilot-mcp (RU)

[English](#upgrade-pilot-mcp) | [Русский](#upgrade-pilot-mcp-ru)

Специализированный workflow MCP-сервер для безопасного обновления и миграции JavaScript / TypeScript стеков.

Маршрут v1 охватывает:

- Node.js
- TypeScript
- ESLint
- Vite / Vitest / Jest
- React / React DOM / Next.js
- Vue / Nuxt
- Astro / SvelteKit / Remix
- Tailwind CSS / Storybook
- Playwright / Cypress
- Prisma
- Express / Fastify / NestJS
- Angular

Дополнительно распознаются семейства пакетов `@nestjs/*`, `@storybook/*`, `@remix-run/*` и `@angular/*`.

Сервер спроектирован вокруг рабочего сценария агента, а не как тонкая обёртка над API. Он решает конкретную дорогую задачу: «обнови проект с минимальным риском, не сломай типы, тесты, конфиг, линтер, билды и CI».

## Инструменты (tools)

| Инструмент                   | Назначение                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `analyze_project`            | Читает package.json, lockfile, tsconfig и прочие конфиги для построения отпечатка проекта |
| `detect_upgrade_paths`       | Вычисляет допустимые пути обновления по каждому поддерживаемому пакету                    |
| `find_breaking_changes`      | Подтягивает официальные migration guides и курированные зоны риска                        |
| `scan_repo_for_deprecations` | Ищет в коде устаревшие паттерны и опасные места                                           |
| `generate_upgrade_plan`      | Строит пофазный, упорядоченный план обновления                                            |
| `apply_safe_codemods`        | Выполняет детерминистические кодмоды, разрешённые моделью безопасности v1                 |
| `validate_upgrade`           | Запускает type-check, lint, тесты и build                                                 |
| `write_upgrade_pr_summary`   | Генерирует markdown-описание изменений для PR                                             |

## Ресурсы (resources)

Каждый ресурс отдаёт последний успешно сгенерированный артефакт текущей сессии сервера.

| URI                                 | Содержимое                          |
| ----------------------------------- | ----------------------------------- |
| `upgrade://analysis/latest`         | Снимок анализа проекта              |
| `upgrade://paths/latest`            | Результаты расчёта путей обновления |
| `upgrade://breaking-changes/latest` | Ссылки на breaking changes          |
| `upgrade://findings/latest`         | Найденные устаревшие паттерны       |
| `upgrade://plan/latest`             | План обновления                     |
| `upgrade://validation/latest`       | Результаты валидации                |
| `upgrade://summary/latest`          | Саммари для PR (markdown)           |

## Промпты (prompts)

- **plan_upgrade_route** — проводит агента через безопасный рабочий процесс обновления
- **draft_upgrade_pr** — превращает артефакты обновления в краткое описание PR

## Структура проекта

```
src/
├── server.ts                  # Точка входа MCP-сервера (stdio transport)
├── types.ts                   # Общие типы
└── lib/
    ├── analyzer.ts            # Анализ проекта
    ├── upgrade-paths.ts       # Разрешение версий и шаги обновления
    ├── breaking-changes.ts    # Курированные данные миграционных гайдов
    ├── deprecation-scanner.ts # Сканирование устаревших паттернов
    ├── plan-generator.ts      # Генерация плана и PR-саммари
    ├── codemods.ts            # Безопасные кодмоды
    ├── validation.ts          # Запуск tsc, lint, тестов и build
    └── fs-utils.ts            # Утилиты файловой системы
```

## Безопасность

- Только stdio transport — никакого HTTP в v1
- По умолчанию все операции read-only
- Кодмоды требуют явного `mode: "apply"`
- Валидация запускает только локальные скрипты целевого репозитория
- Никакого удалённого выполнения кода

## Скрипты

```bash
npm run dev     # watch-режим через tsx
npm run build   # компиляция TypeScript в dist/
npm run check   # проверка типов без генерации файлов
npm run start   # запуск скомпилированного сервера
```

## Конфигурация MCP-клиента

```json
{
  "mcpServers": {
    "upgrade-pilot": {
      "command": "node",
      "args": ["path/to/upgrade-pilot-mcp/dist/server.js"]
    }
  }
}
```

## Статус

v1 scaffold — работающий stdio MCP-сервер с инструментами, промптами и ресурсами артефактов. Полная контрактная спецификация: [docs/v1-contracts.md](docs/v1-contracts.md).
