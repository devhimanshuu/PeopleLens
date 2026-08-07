# PeopleLens

**Enterprise Workforce Intelligence Platform**

PeopleLens is a modern enterprise People Analytics platform that helps HR leaders
and executives monitor **workforce health**, **employee performance**,
**organizational structure**, and **business insights** from a single source of
truth.

> **Status — Phase 1 (Foundation).** This phase deliberately initializes the
> repository only: monorepo scaffolding, shared packages, tooling, and two
> runnable application shells. No business logic, data models, authentication,
> or dashboards yet — those arrive in later phases on a foundation designed for
> them.

---

## Project Vision

People data lives across HRIS, ATS, performance reviews, and engagement surveys.
Leaders rarely see it as one coherent picture. PeopleLens unifies these signals
into an enterprise-grade intelligence platform — early warnings instead of
rearview metrics, governed data instead of spreadsheet sprawl, board-ready
narratives instead of raw exports.

## Architecture

A **scalable monorepo**: deployable applications in `apps/`, shared libraries in
`packages/`, and single-source tooling at the root. Turborepo orchestrates the
task graph (build → lint → typecheck → test) with caching across all workspaces.

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│          apps/web           │     │          apps/api           │
│      Next.js 15 · React     │     │   NestJS 11 · Prisma 6      │
│     Tailwind · shadcn/ui    │────▶│  REST under /api prefix     │
└─────────────┬───────────────┘     └──────────────┬──────────────┘
              │                                    │
   ┌──────────┴────────────────────────────────────┴──────────┐
   │                        packages/                          │
   │   ui (components) · types (contracts) · config (tsconfig) │
   │                    eslint-config                           │
   └───────────────────────────────────────────────────────────┘
```

Design principles:

- **Dependency direction is enforced:** `apps → packages`, never the reverse.
- **Shared contracts** (`@peoplelens/types`) keep web and API models from drifting.
- **Single-source tooling:** one lint config package, one tsconfig preset set,
  one Prettier/EditorConfig — consistent for every contributor.
- **Strict TypeScript everywhere**; path aliases (`@/*` in web, `@app/*` in API)
  configured and ready for growth.

## Tech Stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router) · React 19 · TypeScript               |
| Styling      | Tailwind CSS 4 · shadcn/ui (new-york)                         |
| Backend      | NestJS 11 · TypeScript (strict)                               |
| Database     | PostgreSQL 16 (provisioning deferred)                         |
| ORM          | Prisma 6 (schema skeleton, no models yet)                     |
| Monorepo     | pnpm workspaces · Turborepo                                   |
| Code quality | ESLint 9 (flat) · Prettier · Husky · lint-staged · Commitlint |

> **Version pinning note:** `next` is pinned to the 15.x line and `prisma` to the
> 6.x line deliberately — the newest majors (Next 16, Prisma 7) are not yet the
> stable choice for this foundation.

## Repository Structure

```
.
├── apps/
│   ├── web/                    # Next.js 15 application
│   │   ├── src/app/            # App Router (layout, landing page)
│   │   └── components.json     # shadcn/ui configuration
│   └── api/                    # NestJS 11 application
│       ├── prisma/             # Schema skeleton (datasource only, Phase 1)
│       └── src/                # Bootstrap, root module, /api/health
├── packages/
│   ├── ui/                     # Shared shadcn-based component kit
│   ├── types/                  # Cross-app TypeScript contracts
│   ├── config/                 # tsconfig presets (base/nextjs/nestjs/react-library)
│   └── eslint-config/          # Flat ESLint configs (base/next/nest)
├── docs/
│   └── architecture.md         # Detailed architecture & decision rationale
├── .github/
│   ├── ISSUE_TEMPLATE/         # Bug report & feature request forms
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── scripts/
│   └── setup.mjs               # Env bootstrap + Node version check
├── .husky/                     # pre-commit (lint-staged) & commit-msg (commitlint)
└── turbo.json                  # Task graph & caching
```

## Getting Started

### Prerequisites

- **Node.js ≥ 20.19** (Node 24 recommended)
- **pnpm ≥ 10**
- **Git**
- PostgreSQL later (Phase 2) — Docker not required in Phase 1

### 1. Install

```bash
git clone <repository-url> peoplelens
cd peoplelens
pnpm install
```

### 2. Bootstrap environment files

```bash
pnpm bootstrap
```

Copies `.env.example` → `.env` / `.env.local` for each app (idempotent).

> Named `bootstrap` because `pnpm setup` is a reserved pnpm command.

### 3. Run the platform

```bash
pnpm dev            # web + api together (Turborepo)
```

| Service | URL                              |
| ------- | -------------------------------- |
| Web     | http://localhost:3000            |
| API     | http://localhost:3001/api/health |

## Development Commands

| Command                                         | Description                             |
| ----------------------------------------------- | --------------------------------------- |
| `pnpm dev`                                      | Run web + API in watch mode             |
| `pnpm dev:web`                                  | Run only the web app                    |
| `pnpm dev:api`                                  | Run only the API                        |
| `pnpm build`                                    | Production build for all workspaces     |
| `pnpm lint`                                     | Lint all workspaces                     |
| `pnpm typecheck`                                | Typecheck all workspaces                |
| `pnpm test`                                     | Run unit tests (API)                    |
| `pnpm format`                                   | Format everything with Prettier         |
| `pnpm format:check`                             | Verify formatting                       |
| `pnpm --filter @peoplelens/api prisma:generate` | Generate Prisma client (Phase 2 models) |

Run any workspace script with `pnpm --filter <package> <script>`.

## Commit Conventions

The repository enforces **Conventional Commits** via Husky + Commitlint:

```
feat(web): add onboarding flow
fix(api): correct health endpoint status code
docs: explain monorepo rationale
```

Types allowed: `feat fix docs style refactor perf test build ci chore revert`.
`lint-staged` runs ESLint and Prettier on staged files before every commit.

## Roadmap

| Phase | Scope                                                         |
| ----- | ------------------------------------------------------------- |
| 1 ✅  | Monorepo foundation, shared packages, tooling, app shells     |
| 2     | Data layer: Prisma models, migrations, seeding                |
| 3     | Authentication & authorization, role-based access             |
| 4     | Domain modules (workforce health, performance, org structure) |
| 5     | Dashboards, reporting, API surface completion                 |

See [docs/architecture.md](./docs/architecture.md) for the full architectural
rationale and evolution plan.

## License

Proprietary — all rights reserved.
