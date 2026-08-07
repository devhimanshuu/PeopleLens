# PeopleLens — Architecture

This document captures the architectural intent of the PeopleLens platform and
the reasoning behind the decisions made in Phase 1 (Foundation). It is the
source of truth engineers should consult before introducing new structure.

## 1. Why a monorepo?

PeopleLens will grow into several applications and shared libraries: a customer
web app, an API service, and later potentially admin tools, worker processes,
and reporting apps — all sharing data contracts, UI primitives, and engineering
conventions.

| Concern                          | Polyrepo                                 | Monorepo                          |
| -------------------------------- | ---------------------------------------- | --------------------------------- |
| Shared type contracts            | versioned packages, release choreography | one PR changes web + API together |
| Cross-cutting refactors          | multi-repo PR trains                     | atomic single PR                  |
| Tooling (lint, format, tsconfig) | drift between repos                      | single source of truth            |
| CI complexity                    | N pipelines                              | one pipeline, one task graph      |
| Onboarding                       | N setups                                 | one `pnpm install`                |

The trade-off (larger repository, careful CI) is managed with two rules:

1. **Dependency direction:** `apps/` may depend on `packages/`; packages never
   depend on apps.
2. **Deployable boundaries:** each app owns its runtime config (env, build,
   deployment). No app imports another app.

## 2. Repository layout

```
apps/      Deployable units (web, api). Thin: routing, composition, runtime config.
packages/  Reusable libraries. No business logic in Phase 1.
docs/      Architecture & decisions.
scripts/   Dependency-free repository tooling.
.github/   Contribution templates + dependency automation.
```

## 3. Why these technologies

### Next.js 15 (App Router) + React 19

React Server Components enable the API-adjacent data fetching pattern the
dashboards of Phase 4 will need, with per-route code splitting. Next 15 is the
current stable line; the monorepo deliberately does not chase Next 16 yet.

### NestJS 11

Nest's modular DI design maps 1:1 to domain modules (Workforce Health,
Performance, Org Structure, Reporting). Each domain becomes an independently
testable module with its own controllers, services, and providers — a clean
foundation for future bounded contexts.

### PostgreSQL 16 + Prisma 6

Postgres is the correct relational engine for workforce data (relational
integrity, JSONB for survey payloads, window functions for analytics). Prisma 6
provides typed clients and migration files. Prisma is pinned to 6.x: the 7.x
generator/adapter model is too new to be the stable enterprise base. Phase 2
introduces the actual models; Phase 1 only initializes the schema skeleton.

### Tailwind CSS 4 + shadcn/ui

Design tokens live as CSS variables (light + dark) so future theming is a
variable change, not a class hunt. `components.json` wires shadcn conventions
(aliases, utils, icon library) so new primitives are one command away.

### pnpm + Turborepo

pnpm's strict, content-addressed store gives disk-efficient installs and
enforces workspace boundaries; Turborepo caches build/lint/typecheck/test tasks
and will later enable remote caching in CI.

### Quality gates

ESLint 9 flat config (single package, three variants), Prettier, EditorConfig,
Husky hooks (`pre-commit` → lint-staged, `commit-msg` → commitlint). Conventional
Commits keep releases and changelogs automatable.

## 4. Conventions

- **TypeScript:** strict in every workspace, enforced via shared presets in
  `packages/config/tsconfig/`.
- **Path aliases:** `@/*` in web (native), `@app/*` in the API. The API
  registers `tsconfig-paths` in `src/index.ts` before bootstrapping, so the
  alias resolves at runtime, not just for the typechecker. Jest maps the alias
  via `moduleNameMapper`.
- **Environment:** `.env.example` files are the templates; `pnpm bootstrap`
  materializes local copies. Never commit real secrets.
- **Shared contracts:** put cross-app shapes in `@peoplelens/types`; domain
  models stay in the API until a provider boundary demands otherwise.

## 5. Evolution plan

| Phase | Change                     | Architectural impact                                                                                                          |
| ----- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 2     | Prisma models + migrations | `PrismaModule` as a shared provider; typed client via `@app/*` alias                                                          |
| 3     | AuthN/Z                    | Auth module + guards; role-based access control on every route group                                                          |
| 4     | Domain modules             | One Nest module per domain; web feature slices per dashboard                                                                  |
| 5+    | Scale                      | Horizontal API replicas, read replicas, background jobs, event-driven sync from HRIS, observability (structured logs, traces) |

Nothing in the Phase 1 foundation constrains these outcomes: the seams
(module boundaries, contract types, env-first config, transpiled UI package)
were placed exactly where growth will need them.

## 6. Known deferrals (by design)

- **Docker / Compose:** removed from Phase 1 per team decision; PostgreSQL and
  containerization will be reintroduced when the data layer lands.
- **Database models, authentication, dashboards:** explicitly out of scope until
  their phases.
- **CI pipeline:** the task graph is defined in `turbo.json`; CI wiring is the
  first item of the next phase.
