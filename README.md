# PeopleLens

**Enterprise Workforce Intelligence Platform**

PeopleLens is a modern enterprise People Analytics platform that helps HR leaders
and executives manage their **workforce**, **organizational structure**, and
**headcount intelligence** from a single source of truth.

> **Status — Phase 3 complete.** The Phase 2 MVP has undergone a full
> production-readiness pass: security review, hardened CSV pipeline, database
> health checks, request correlation, dashboard slice filters, expanded tests,
> and professional documentation. See the [Roadmap](#roadmap) for what is
> planned next.

---

## Problem

HR leaders run on spreadsheets and disconnected tools. Headcount, attrition,
and organizational structure live in half-maintained files; questions like
_"how many engineers are in the Berlin office?"_ or _"which department has the
most probationary staff?"_ require manual digging, and answers are stale by
the time they are shared. Sensitive employee data is passed around by email,
making access control an afterthought.

## Product Vision

PeopleLens is the single source of truth for workforce intelligence. It turns
employee and organizational data into answers an HR leader can act on — who is
here, how the organization is shaped, and what is changing — while enforcing
role-based access so sensitive records are only ever visible to the people who
should see them. The platform is deliberately narrow in Phase 3: reliable
foundations first, intelligent layers later.

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
Emails listed in the optional `ADMIN_EMAILS` env var are always provisioned (or
re-promoted) as admins — the durable way to grant specific identities full
access across environments and reseeds.

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
- `ADMIN_EMAILS` (optional) — comma-separated emails granted the **Admin** role
  at first contact and re-promoted on every sign-in (bootstrap admins)

  ```bash
  ADMIN_EMAILS=you@example.com,ops@example.com
  ```

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

## Analytics

The dashboard aggregates **real data from the seeded workspace** (42 employees
across 10 departments and 8 teams) into:

| Question it answers                      | KPI / chart                                       |
| ---------------------------------------- | ------------------------------------------------- |
| How large is the workforce?              | **Total Employees** / **Active** KPI cards        |
| Where is the workforce organizationally? | **Department Distribution** bar chart             |
| What is changing?                        | **Recent Hires** list (latest 6 by hire date)     |
| What is the composition?                 | **Employment Status** and **Gender** donut charts |

**Global slice filters** (department / status / gender) narrow the entire
overview at once — KPIs, distributions and recent hires update together. Filters
are applied server-side and intersected with the caller's RBAC scope, so a
manager can only ever slice the departments they are assigned to.

Every metric is computed directly from the `Employee` table. Metrics that the
dataset cannot support (attrition rate, average compensation, performance
distribution) are deliberately **not** shown — the platform never invents
numbers it cannot back with data.

## Testing

Backend unit tests cover the highest-risk business logic:

- **RBAC** — role write-gates, department scoping, resource-level checks
- **Employees** — CRUD, soft delete/restore, unique constraint handling
- **Dashboard** — manager scoping and slice filters cannot leak outside scope
- **CSV** — parsing, row-level validation, duplicate detection
- **Audit** — best-effort recording
- **Health** — DB-up and degraded states

Run them with `pnpm test`. The GitHub Actions workflow runs
**typecheck → lint → test → build** on every push and pull request.

## Deployment

The stack deploys as two stateless services plus a managed database:

1. **PostgreSQL** — a Neon project (managed) or any Postgres 16 instance.
2. **API** (`apps/api`) — Node 20+, `pnpm install`, `prisma deploy`, `pnpm build`,
   `node dist/index` on port 3001. Set the env vars from the table below.
3. **Web** (`apps/web`) — `pnpm build && pnpm start` on port 3000, pointed at the
   API via `NEXT_PUBLIC_API_URL`. `NEXT_PUBLIC_API_URL` must be public in the
   browser, so use the deployed API origin (e.g. `https://api.example.com/api/v1`).

Both services are horizontally scalable behind a reverse proxy. For production:
set `NODE_ENV=production`, enable `TRUST_PROXY=true`, configure `CORS_ORIGINS`
to your exact web origin, and keep `SWAGGER_ENABLED=false` unless you
intentionally expose the docs.

## Engineering Decisions & Trade-offs

| Decision                                    | Rationale                                                                                                                       | Trade-off                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Neon Auth as the identity provider**      | No custom password storage/hashing; the platform focuses on authorization, not authentication                                   | App identity is tied to Neon; self-hosting auth later requires a migration                                                                      |
| **Soft deletes via `deletedAt`**            | History, audit trails and dashboard counts survive "removal"                                                                    | Global unique indexes mean deleted records keep their email/code occupied                                                                       |
| **Marker cookie for frontend route guards** | Edge middleware cannot read `localStorage`; the cookie mirrors the session for UX redirects                                     | It is a UX guard only — the API remains the security boundary                                                                                   |
| **In-memory session cache (60s TTL)**       | Avoids a Neon `get-session` round-trip on every request                                                                         | A revoked token stays valid for ≤60s; acceptable for an MVP                                                                                     |
| **Bootstrap admins via `ADMIN_EMAILS`**     | Root-like identities are granted admin at first contact and re-promoted on every session — no manual DB pokes, survives reseeds | Env-listed accounts **cannot** be demoted or deactivated via the UI (the promotion re-asserts admin + active on their next sign-in) — by design |
| **`createMany` avoided in imports**         | Per-row inserts report exact success counts and stay transactional                                                              | Slower than bulk insert for very large files (fine up to ~10 MB)                                                                                |
| **No React Query**                          | The app's `useAsync` hook covers data-fetching needs; adding a cache layer would be overengineering at this stage               | Manual memoization where needed                                                                                                                 |

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

| Phase | Scope                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1 ✅  | Monorepo foundation, shared packages, tooling, app shells                                                                           |
| 2 ✅  | **MVP:** auth + RBAC, departments/teams, employees, dashboard, CSV import, landing page                                             |
| 3 ✅  | **Production readiness:** security review, DB health checks, dashboard filters, request correlation, hardened CSV, docs, more tests |
| 4     | AI assistant, predictive analytics, workforce insights                                                                              |
| 5     | Reports, notifications, email service, workflow automation                                                                          |
| 6     | Integrations, billing, multi-tenancy, background jobs                                                                               |

See [docs/architecture.md](./docs/architecture.md) for the full architectural
rationale and evolution plan.

## License

Proprietary — all rights reserved.
