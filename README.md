# upgrade-pilot-mcp

[English](#upgrade-pilot-mcp) | [Русский](#upgrade-pilot-mcp-ru)

MCP server that helps AI agents safely upgrade JavaScript / TypeScript projects — from dependency analysis to PR summary generation.

## Supported packages

**Languages & tooling:** TypeScript, ESLint, Prettier, Babel, SWC
**Bundlers:** Vite, Webpack, Rollup, esbuild, tsup, PostCSS, Sass
**Testing:** Vitest, Jest, Mocha, Playwright, Cypress, Storybook, Supertest, MSW
**Frameworks:** React, Next.js, Vue, Nuxt, Astro, SvelteKit, Remix, Angular, NestJS, Express, Fastify, Hono
**Data & state:** Prisma, Drizzle ORM, TypeORM, Mongoose, Redux Toolkit, TanStack Query, Pinia, RxJS
**Networking:** Axios, GraphQL, Socket.IO, Zod
**Infra & DX:** Turbo, Nx, Husky, lint-staged, commitlint, Tailwind CSS, Lodash

Scoped families `@nestjs/*`, `@storybook/*`, `@remix-run/*`, `@angular/*` are recognized automatically.

## Tools

### Analysis & planning

| Tool                         | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `analyze_project`            | Fingerprint the project: deps, configs, lockfile, stack |
| `detect_upgrade_paths`       | Compute safe upgrade steps per package                  |
| `find_breaking_changes`      | Surface version-aware migration guides and risk areas   |
| `scan_repo_for_deprecations` | Find deprecated patterns in the codebase                |
| `generate_upgrade_plan`      | Build a phased upgrade plan                             |
| `run_upgrade_pipeline`       | All-in-one: analyze → paths → breaking → scan → plan   |

### Execution

| Tool                         | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `apply_safe_codemods`        | Run deterministic codemods (dry-run by default)         |
| `install_upgrade`            | Install specific package versions via npm/yarn/pnpm     |
| `check_compatibility`        | Verify peerDependency compatibility before installing   |

### Validation & rollback

| Tool                         | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `validate_upgrade`           | Run type-check, lint, test, build                       |
| `create_checkpoint`          | Tag current HEAD for safe rollback                      |
| `restore_checkpoint`         | Hard-reset to a previous checkpoint                     |
| `list_checkpoints`           | List all upgrade-pilot checkpoint tags                  |

### Reporting

| Tool                         | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `write_upgrade_pr_summary`   | Generate a reviewer-friendly markdown summary           |

### Token-saving features

- **Compact output** — 5 diagnostic tools accept `outputFormat: "compact"` (default) to strip verbose fields and return counts instead of arrays.
- **Analysis caching** — `validate_upgrade`, `generate_upgrade_plan`, and `write_upgrade_pr_summary` reuse a cached analysis when available, eliminating redundant project scans.
- **Quiet validation** — `validate_upgrade` accepts `quietOnSuccess: true` (default) to return a one-line summary when all checks pass.
- **Pipeline tool** — `run_upgrade_pipeline` replaces 5 sequential calls with one, storing full artifacts as resources while returning only a compact summary.

## Resources

Each URI returns the latest artifact from the current session:

| URI                                 | Content                       |
| ----------------------------------- | ----------------------------- |
| `upgrade://analysis/latest`         | Project analysis snapshot     |
| `upgrade://paths/latest`            | Upgrade path results          |
| `upgrade://breaking-changes/latest` | Breaking change references    |
| `upgrade://findings/latest`         | Deprecation findings          |
| `upgrade://plan/latest`             | Upgrade plan                  |
| `upgrade://pipeline/latest`         | Full pipeline result          |
| `upgrade://codemods/latest`         | Codemod results               |
| `upgrade://validation/latest`       | Validation results            |
| `upgrade://summary/latest`          | PR summary (markdown)         |

## Prompts

- **plan_upgrade_route** — walk the agent through a safe upgrade workflow
- **draft_upgrade_pr** — turn artifacts into a PR description

## Codemods

| ID                    | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `prisma-relation-mode`| Add `relationMode = "prisma"` to Prisma schema             |
| `eslint-flat-config`  | Generate `eslint.config.mjs` FlatCompat bridge from legacy |
| `tailwind-v4-import`  | Replace `@tailwind` directives with `@import "tailwindcss"`|

## Setup

```bash
npm install
npm run build
```

### MCP client configuration

Recommended after publishing:

Use this when the package is consumed from npm. If you are inside this repository itself, prefer the local development config below.

```json
{
  "mcpServers": {
    "upgrade-pilot": {
      "command": "npx",
      "args": ["-y", "upgrade-pilot-mcp@latest"]
    }
  }
}
```

Local development:

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

Windows note: if a client does not resolve `npx`, use `npx.cmd` as the command.

## Security

- stdio transport only — no HTTP listener
- All operations are read-only by default
- Codemods require explicit `mode: "apply"`
- `install_upgrade` runs the detected package manager (npm/yarn/pnpm install)
- `restore_checkpoint` performs `git reset --hard` — destructive by design
- Validation runs only local scripts from the target repo
- No remote code execution

---

<a id="upgrade-pilot-mcp-ru"></a>

# upgrade-pilot-mcp (RU)

[English](#upgrade-pilot-mcp) | [Русский](#upgrade-pilot-mcp-ru)

MCP-сервер, помогающий AI-агентам безопасно обновлять JavaScript / TypeScript проекты — от анализа зависимостей до генерации описания PR.

## Поддерживаемые пакеты

**Языки и тулинг:** TypeScript, ESLint, Prettier, Babel, SWC
**Сборщики:** Vite, Webpack, Rollup, esbuild, tsup, PostCSS, Sass
**Тестирование:** Vitest, Jest, Mocha, Playwright, Cypress, Storybook, Supertest, MSW
**Фреймворки:** React, Next.js, Vue, Nuxt, Astro, SvelteKit, Remix, Angular, NestJS, Express, Fastify, Hono
**Данные и стейт:** Prisma, Drizzle ORM, TypeORM, Mongoose, Redux Toolkit, TanStack Query, Pinia, RxJS
**Сеть:** Axios, GraphQL, Socket.IO, Zod
**Инфра и DX:** Turbo, Nx, Husky, lint-staged, commitlint, Tailwind CSS, Lodash

Scoped-семейства `@nestjs/*`, `@storybook/*`, `@remix-run/*`, `@angular/*` распознаются автоматически.

## Инструменты

### Анализ и планирование

| Инструмент                   | Назначение                                              |
| ---------------------------- | ------------------------------------------------------- |
| `analyze_project`            | Отпечаток проекта: зависимости, конфиги, lockfile, стек |
| `detect_upgrade_paths`       | Безопасные шаги обновления по каждому пакету            |
| `find_breaking_changes`      | Версионные migration guides и зоны риска                |
| `scan_repo_for_deprecations` | Поиск устаревших паттернов в коде                       |
| `generate_upgrade_plan`      | Пофазный план обновления                                |
| `run_upgrade_pipeline`       | Всё-в-одном: анализ → пути → breaking → скан → план    |

### Выполнение

| Инструмент                   | Назначение                                              |
| ---------------------------- | ------------------------------------------------------- |
| `apply_safe_codemods`        | Детерминистические кодмоды (dry-run по умолчанию)       |
| `install_upgrade`            | Установка конкретных версий через npm/yarn/pnpm         |
| `check_compatibility`        | Проверка совместимости peerDependencies                  |

### Валидация и откат

| Инструмент                   | Назначение                                              |
| ---------------------------- | ------------------------------------------------------- |
| `validate_upgrade`           | Запуск type-check, lint, тестов и build                 |
| `create_checkpoint`          | Тег текущего HEAD для безопасного отката                |
| `restore_checkpoint`         | Hard-reset к предыдущему чекпоинту                      |
| `list_checkpoints`           | Список всех чекпоинт-тегов upgrade-pilot                |

### Отчётность

| Инструмент                   | Назначение                                              |
| ---------------------------- | ------------------------------------------------------- |
| `write_upgrade_pr_summary`   | Markdown-описание для PR                                |

### Экономия токенов

- **Компактный вывод** — 5 диагностических инструментов принимают `outputFormat: "compact"` (по умолчанию), убирая многословные поля и заменяя массивы на счётчики.
- **Кеширование анализа** — `validate_upgrade`, `generate_upgrade_plan` и `write_upgrade_pr_summary` используют кешированный анализ, если он есть, устраняя повторные сканирования.
- **Тихая валидация** — `validate_upgrade` принимает `quietOnSuccess: true` (по умолчанию) и возвращает однострочный итог, если все проверки пройдены.
- **Pipeline** — `run_upgrade_pipeline` заменяет 5 последовательных вызовов одним, сохраняя полные артефакты в ресурсах и возвращая только компактный итог.

## Ресурсы

Каждый URI возвращает последний артефакт текущей сессии:

| URI                                 | Содержимое                    |
| ----------------------------------- | ----------------------------- |
| `upgrade://analysis/latest`         | Снимок анализа проекта        |
| `upgrade://paths/latest`            | Пути обновления               |
| `upgrade://breaking-changes/latest` | Breaking changes              |
| `upgrade://findings/latest`         | Найденные устаревшие паттерны |
| `upgrade://plan/latest`             | План обновления               |
| `upgrade://pipeline/latest`         | Полный результат pipeline     |
| `upgrade://codemods/latest`         | Результаты кодмодов           |
| `upgrade://validation/latest`       | Результаты валидации          |
| `upgrade://summary/latest`          | Саммари для PR (markdown)     |

## Промпты

- **plan_upgrade_route** — проводит агента через безопасный процесс обновления
- **draft_upgrade_pr** — превращает артефакты в описание PR

## Кодмоды

| ID                    | Назначение                                                          |
| --------------------- | ------------------------------------------------------------------- |
| `prisma-relation-mode`| Добавляет `relationMode = "prisma"` в схему Prisma                  |
| `eslint-flat-config`  | Генерирует `eslint.config.mjs` FlatCompat-мост из legacy-конфигов   |
| `tailwind-v4-import`  | Заменяет директивы `@tailwind` на `@import "tailwindcss"`           |

## Установка

```bash
npm install
npm run build
```

### Конфигурация MCP-клиента

Рекомендуемый вариант после публикации:

Используй этот вариант, когда пакет ставится из npm. Если ты находишься внутри самого репозитория, лучше использовать локальную конфигурацию ниже.

```json
{
  "mcpServers": {
    "upgrade-pilot": {
      "command": "npx",
      "args": ["-y", "upgrade-pilot-mcp@latest"]
    }
  }
}
```

Для локальной разработки:

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

Примечание для Windows: если клиент не находит `npx`, укажи в `command` значение `npx.cmd`.

## Безопасность

- Только stdio transport — без HTTP
- Все операции read-only по умолчанию
- Кодмоды требуют явный `mode: "apply"`
- `install_upgrade` запускает обнаруженный пакетный менеджер (npm/yarn/pnpm install)
- `restore_checkpoint` выполняет `git reset --hard` — деструктивная операция
- Валидация запускает только локальные скрипты целевого репозитория
- Никакого удалённого выполнения кода
