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

| Tool                         | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `analyze_project`            | Fingerprint the project: deps, configs, lockfile, stack |
| `detect_upgrade_paths`       | Compute safe upgrade steps per package                  |
| `find_breaking_changes`      | Surface migration guides and risk areas                 |
| `scan_repo_for_deprecations` | Find deprecated patterns in the codebase                |
| `generate_upgrade_plan`      | Build a phased upgrade plan                             |
| `apply_safe_codemods`        | Run deterministic codemods (dry-run by default)         |
| `validate_upgrade`           | Run type-check, lint, test, build                       |
| `write_upgrade_pr_summary`   | Generate a reviewer-friendly markdown summary           |

## Resources

Each URI returns the latest artifact from the current session:

| URI                                 | Content                    |
| ----------------------------------- | -------------------------- |
| `upgrade://analysis/latest`         | Project analysis snapshot  |
| `upgrade://paths/latest`            | Upgrade path results       |
| `upgrade://breaking-changes/latest` | Breaking change references |
| `upgrade://findings/latest`         | Deprecation findings       |
| `upgrade://plan/latest`             | Upgrade plan               |
| `upgrade://validation/latest`       | Validation results         |
| `upgrade://summary/latest`          | PR summary (markdown)      |

## Prompts

- **plan_upgrade_route** — walk the agent through a safe upgrade workflow
- **draft_upgrade_pr** — turn artifacts into a PR description

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

| Инструмент                   | Назначение                                              |
| ---------------------------- | ------------------------------------------------------- |
| `analyze_project`            | Отпечаток проекта: зависимости, конфиги, lockfile, стек |
| `detect_upgrade_paths`       | Безопасные шаги обновления по каждому пакету            |
| `find_breaking_changes`      | Migration guides и зоны риска                           |
| `scan_repo_for_deprecations` | Поиск устаревших паттернов в коде                       |
| `generate_upgrade_plan`      | Пофазный план обновления                                |
| `apply_safe_codemods`        | Детерминистические кодмоды (dry-run по умолчанию)       |
| `validate_upgrade`           | Запуск type-check, lint, тестов и build                 |
| `write_upgrade_pr_summary`   | Markdown-описание для PR                                |

## Ресурсы

Каждый URI возвращает последний артефакт текущей сессии:

| URI                                 | Содержимое                    |
| ----------------------------------- | ----------------------------- |
| `upgrade://analysis/latest`         | Снимок анализа проекта        |
| `upgrade://paths/latest`            | Пути обновления               |
| `upgrade://breaking-changes/latest` | Breaking changes              |
| `upgrade://findings/latest`         | Найденные устаревшие паттерны |
| `upgrade://plan/latest`             | План обновления               |
| `upgrade://validation/latest`       | Результаты валидации          |
| `upgrade://summary/latest`          | Саммари для PR (markdown)     |

## Промпты

- **plan_upgrade_route** — проводит агента через безопасный процесс обновления
- **draft_upgrade_pr** — превращает артефакты в описание PR

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
- Валидация запускает только локальные скрипты целевого репозитория
- Никакого удалённого выполнения кода
