# PeopleLens

**Enterprise Workforce Intelligence Platform**

PeopleLens is a modern enterprise People Analytics platform that helps HR leaders
and executives manage their **workforce**, **organizational structure**, and
**headcount intelligence** from a single source of truth.

> **Status — Phase 2 complete (MVP).** Authentication with role-based access
> control, organization management, employee management, analytics dashboard,
> CSV bulk import, and a production-grade landing page are all implemented and
> working end-to-end. See the [Roadmap](#roadmap) for what is planned next.

---

## Features

| Area                  | What's included                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔐 **Authentication** | Email/password + Google/GitHub sign-in (Neon Auth), session management, role-based access control (**Admin / Manager / Viewer**) enforced on both the API and the frontend |
| 🏢 **Organization**   | Departments with a parent hierarchy, teams, department managers — full CRUD with proper database relations                                                                 |
| 👥 **Employees**      | Complete CRUD, search, pagination, sorting, filtering, status management, manager assignment, soft delete, profile/detail view                                             |
| 📊 **Dashboard**      | KPI cards (headcount, active, departments, managers, teams), department/status/gender distributions, recent hires — role-scoped (managers see only their departments)      |
| 📥 **CSV Import**     | Upload, per-row validation, duplicate detection, bulk insert, import summary with success/failed/duplicate counts and a full error report; downloadable template           |
| 🎨 **Landing page**   | Polished SaaS marketing site (hero, features, how it works, benefits, CTA, footer) with modern animations                                                                  |
| 🛡️ **Quality**        | Loading / empty / error states, toasts, form validation, responsive design, accessibility basics, app-level error boundary + 404, Swagger docs                             |

## Roles

| Role    | Access                                                                 |
| ------- | ---------------------------------------------------------------------- |
| Admin   | Everything — full CRUD, role management, org structure                 |
| Manager | Write access **scoped to their assigned departments**; read everything |
| Viewer  | Read-only across the platform                                          |

## Tech Stack

| Layer        | Technology                                                         |
| ------------ | ------------------------------------------------------------------ |
| Frontend     | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4       |
| Charts       | Recharts 3                                                         |
| Backend      | NestJS 11 · TypeScript (strict)                                    |
| Database     | PostgreSQL (managed: Neon; local dev via Docker) · Prisma 6        |
| Auth         | Neon Auth (Managed Better Auth) — email/password + OAuth           |
| API docs     | Swagger / OpenAPI (served at `/api/v1/docs`)                       |
| Monorepo     | pnpm workspaces · Turborepo                                        |
| Code quality | ESLint 9 (flat) · Prettier · Husky · lint-staged · Commitlint · CI |

## Architecture

A **scalable monorepo**: deployable applications in `apps/`, shared libraries in
`packages/`, single-source tooling at the root. Dependency direction is enforced:
`apps → packages`, never the reverse. Shared contracts (`@peoplelens/types`)
keep the web and API models from drifting.

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│          apps/web           │     │          apps/api           │
│      Next.js 15 · React     │────▶│   NestJS 11 · Prisma 6      │
│     Tailwind · Recharts     │     │  REST under /api/v1         │
└─────────────┬───────────────┘     └──────────────┬──────────────┘
              │                                    │
   ┌──────────┴────────────────────────────────────┴──────────┐
   │                        packages/                          │
   │   ui (components) · types (contracts) · config (tsconfig) │
   │                    eslint-config                           │
   └───────────────────────────────────────────────────────────┘
```

**Authentication flow:** the web app owns sign-in/sign-up via Neon Auth. The API
validates each request's session token against Neon and maps the confirmed
identity to a local `User` row — the source of truth for the platform role.
First-contact provisioning means the very first account to sign in becomes an
**admin**; every later sign-up is a **viewer** until an admin promotes them.

## Repository Structure

```
.
├── apps/
│   ├── web/                     # Next.js 15 application
│   │   └── src/
│   │       ├── app/             # App Router (landing, auth, (app) workspace)
│   │       ├── components/      # app-shell, dashboard, employees, ui kit
│   │       ├── hooks/           # useAsync, useDebouncedValue
│   │       └── lib/             # api client, auth facade, formatters
│   └── api/                     # NestJS 11 application
│       ├── prisma/              # schema, migrations, seed
│       └── src/
│           ├── common/          # guards (session/roles/throttle), filter, interceptors
│           ├── auth/            # Neon session bridge
│           ├── departments/     # feature modules (employees, teams, imports, …)
│           └── config/          # validated env contract + Swagger
├── packages/                    # ui · types · config · eslint-config
├── docs/architecture.md         # Detailed architecture & decision rationale
├── .github/workflows/ci.yml     # Typecheck → lint → test → build on every PR
├── docker-compose.yml           # Local PostgreSQL for development
└── scripts/setup.mjs            # Env bootstrap + Node version check
```

## Getting Started

### Prerequisites

- **Node.js ≥ 20.19** (Node 22/24 recommended)
- **pnpm ≥ 10**
- **Git**
- A **Neon project** (managed Postgres + Auth) — or Docker for a local Postgres

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

Copies `.env.example` → `.env` / `.env.local` for each app (idempotent), then
fill in the values in `apps/api/.env` and `apps/web/.env.local`:

- `DATABASE_URL` — your Neon Postgres connection string
- `NEON_AUTH_BASE_URL` — from Neon Console → Branch → Auth → Configuration
- `NEON_AUTH_COOKIE_SECRET` — `openssl rand -base64 32`
- `NEXT_PUBLIC_API_URL` — default `http://localhost:3001/api/v1`

> **Optional:** a local Postgres is available via `docker compose up -d` — the
> `.env.example` defaults point at it.

### 3. Migrate & seed the database

```bash
pnpm --filter @peoplelens/api prisma:migrate dev
pnpm --filter @peoplelens/api prisma:seed
```

The seed is idempotent and creates demo workspace data: 10 departments, 8
teams, and 42 employees. No user accounts are seeded — platform accounts are
provisioned from Neon Auth on first sign-in. The very first account to sign in
becomes **Admin** automatically (a fresh deployment is immediately usable);
every later sign-up is a **Viewer** until an admin promotes them.

> **Important — Neon email verification:** Neon Auth enables _Email verification
> required_ by default, which blocks email/password sign-in until the address is
> verified (`EMAIL_NOT_VERIFIED`). For an evaluation environment, open the
> **Neon Console → Branch → Auth → Settings** and switch **Email verification
> required** off — then registered accounts can sign in immediately. (The
> app-side sign-up already detects this and shows a friendly "verify your email"
> message instead of a broken redirect.)

### 4. Run the platform

```bash
pnpm dev            # web + api together (Turborepo)
```

| Service | URL                               |
| ------- | --------------------------------- |
| Web     | http://localhost:3000             |
| API     | http://localhost:3001/api/v1      |
| Swagger | http://localhost:3001/api/v1/docs |

## CSV Import

The import page ships a **Download Template** button; the expected columns are:

```
employeeCode, firstName, lastName, email, phone, jobTitle, gender,
dateOfBirth, hiredAt, status, department, team, managerEmail
```

- `department` / `team` / `managerEmail` are matched by name/email (case-insensitive)
- Rows are validated individually — one bad row never blocks a good file
- Duplicates (within the file or already in the database) are reported, not inserted
- The result shows total / imported / duplicates / failed counts plus a per-row
  error report; history is retained on the import page

## Development Commands

| Command                                       | Description                         |
| --------------------------------------------- | ----------------------------------- |
| `pnpm dev`                                    | Run web + API in watch mode         |
| `pnpm dev:web` / `pnpm dev:api`               | Run a single app                    |
| `pnpm build`                                  | Production build for all workspaces |
| `pnpm lint`                                   | Lint all workspaces                 |
| `pnpm typecheck`                              | Typecheck all workspaces            |
| `pnpm test`                                   | Run unit tests (API)                |
| `pnpm format` / `pnpm format:check`           | Format / verify formatting          |
| `pnpm --filter @peoplelens/api prisma:studio` | Browse the database                 |
| `pnpm --filter @peoplelens/api prisma:deploy` | Apply migrations (production)       |

## CI & Quality Gates

Every push and pull request runs a GitHub Actions workflow
(`.github/workflows/ci.yml`) that installs, generates the Prisma client, then
runs **typecheck → lint → test → build**. Locally, Husky enforces Conventional
Commits and lint-staged lints/formats staged files before every commit.

```
feat(web): add onboarding flow
fix(api): correct health endpoint status code
docs: explain monorepo rationale
```

## API Conventions

- Consistent envelope on every response: `{ success, message, data, timestamp }`
- Errors: `{ success: false, statusCode, message, error, details?, timestamp, path }`
- All routes are protected by default; `@Public()` opts out (health, signals)
- DTOs with `class-validator` enforce every contract (whitelist + forbid extras)
- Global guards: **rate limit** (per user/IP) → **session auth** → **roles**
- Soft deletes keep history and audit rows intact; every mutation writes an
  audit trail

## Roadmap

| Phase | Scope                                                                                   |
| ----- | --------------------------------------------------------------------------------------- |
| 1 ✅  | Monorepo foundation, shared packages, tooling, app shells                               |
| 2 ✅  | **MVP:** auth + RBAC, departments/teams, employees, dashboard, CSV import, landing page |
| 3     | AI assistant, predictive analytics, workforce insights                                  |
| 4     | Reports, notifications, email service, workflow automation                              |
| 5     | Integrations, billing, multi-tenancy, background jobs                                   |

See [docs/architecture.md](./docs/architecture.md) for the full architectural
rationale and evolution plan.

## License

Proprietary — all rights reserved.
