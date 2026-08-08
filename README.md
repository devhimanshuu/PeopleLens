# PeopleLens

**Enterprise Workforce Intelligence Platform**

PeopleLens turns workforce data into strategic intelligence. HR leaders, managers, and executives use it to understand headcount, attrition, engagement, organizational structure, and the patterns worth investigating — with role-based access and a natural-language Copilot grounded in real data.

---

## Problem

HR leaders run on spreadsheets and disconnected tools. Headcount, attrition, and organizational structure live in half-maintained files; questions like _"which department has the highest attrition?"_ or _"how does overtime relate to retention?"_ require manual digging, and answers are stale by the time they are shared. Sensitive employee data is passed around by email, making access control an afterthought.

## Product Vision

PeopleLens is the single source of truth for workforce intelligence. It turns employee data into answers an HR leader can act on — who is here, how the organization is shaped, where retention risk concentrates, and what deserves attention — while enforcing role-based access so sensitive records are only visible to authorized people.

---

## Features

| Area                            | What's included                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔐 **Authentication & RBAC**    | Email/password + Google/GitHub sign-in (Neon Auth), password reset, inactivity auto-logout, session management, **Admin / Manager / Viewer** roles enforced server-side; managers are scoped to their assigned departments                                                                                                                             |
| 📊 **Workforce Analytics**      | Backend-computed KPIs (headcount, attrition rate, average tenure/age/income, overtime rate, performance rating) with workforce overview, retention & attrition by department/role/age/tenure/overtime/satisfaction, engagement & culture, talent & hiring, composition, and department comparison — every metric answers a business question           |
| 🎯 **Global Analytics Filters** | One centralized filter state (department, job role, gender, age group, tenure group, overtime, satisfaction, status) applied server-side across all dashboard sections; URL-preserved for shareable views (`/dashboard?department=Sales&gender=Female`)                                                                                                |
| 💡 **Workforce Insights**       | Deterministic, data-grounded pattern cards ("Sales has the highest observed attrition") — explicitly correlation, never causation or prediction                                                                                                                                                                                                        |
| ⚖️ **Department Comparison**    | Side-by-side headcount, attrition, tenure, income, overtime, satisfaction, and performance across selected departments                                                                                                                                                                                                                                 |
| 🔍 **Employee Explorer**        | Search, filters, sorting, pagination, and a detail view — salary and personal fields gated by role                                                                                                                                                                                                                                                     |
| 🕸️ **Organization Chart**       | Visual, expandable org hierarchy from manager/team relationships; search, employee preview, department navigation                                                                                                                                                                                                                                      |
| 🧭 **Dashboard Drill-down**     | Charts filter the dashboard on click; insights deep-link into filtered Employee Explorer; employees open their profile                                                                                                                                                                                                                                 |
| 📝 **Executive Summary**        | "Workforce Health" snapshot computed from real data with the areas that need attention                                                                                                                                                                                                                                                                 |
| 🛡️ **Data Quality**             | Dataset health score, valid/missing/duplicate/invalid counts, and last-import time                                                                                                                                                                                                                                                                     |
| 📥 **CSV Import & History**     | Per-row validation, duplicate detection, bulk insert, error report, template download; import history with file name, uploader, status, counts, and duration                                                                                                                                                                                           |
| 🤖 **AI Workforce Copilot**     | Natural-language Q&A over your data ("Which department has the highest attrition?"), grounded in real analytics via a controlled tool layer — the LLM can never touch the database directly. Multi-provider failover (OpenAI / Groq / OpenRouter free models), RBAC-aware tools, conversation history, rate limiting, and deep links back into the app |
| 📋 **Operations**               | Departments, teams, users & roles, audit log with actor/time for every mutation                                                                                                                                                                                                                                                                        |
| 🎨 **Landing page**             | Polished SaaS marketing site with modern animations                                                                                                                                                                                                                                                                                                    |
| 🛠️ **Quality**                  | Loading / empty / error states, toasts, form validation, responsive design, accessibility basics, error boundary + 404, Swagger docs                                                                                                                                                                                                                   |

## Roles

| Role    | Access                                                                                 |
| ------- | -------------------------------------------------------------------------------------- |
| Admin   | Everything — full CRUD, role management, org structure, audit log, copilot metrics     |
| Manager | Write access **scoped to their assigned departments**; read access across the platform |
| Viewer  | Read-only across the platform                                                          |

## Tech Stack

| Layer        | Technology                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Frontend     | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4                                                 |
| Charts       | Recharts 3                                                                                                   |
| Backend      | NestJS 11 · TypeScript (strict)                                                                              |
| Database     | PostgreSQL (managed: Neon; local dev via Docker) · Prisma 6                                                  |
| Auth         | Neon Auth (Managed Better Auth) — email/password + OAuth                                                     |
| AI           | OpenAI-compatible providers with automatic failover: OpenAI · Groq · OpenRouter (free-tier models supported) |
| API docs     | Swagger / OpenAPI (served at `/api/v1/docs`)                                                                 |
| Monorepo     | pnpm workspaces · Turborepo                                                                                  |
| Code quality | ESLint 9 (flat) · Prettier · Husky · lint-staged · Commitlint · CI                                           |

## Architecture

A **scalable monorepo**: deployable applications in `apps/`, shared libraries in `packages/`. Dependency direction is enforced: `apps → packages`, never the reverse. Shared contracts (`@peoplelens/types`) keep the web and API models from drifting.

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

**Analytics flow:** the dashboard never computes metrics in the browser. The web app calls the analytics API, which runs RBAC-scoped aggregations in the database and returns structured results.

**Copilot architecture:** the LLM never has direct database access.

```
User → Copilot UI → Copilot API → Session + RBAC → CopilotService
     → planning call (JSON) → backend validates arguments
     → controlled tools → AnalyticsService / EmployeesService / ImportsService (RBAC-scoped)
     → structured result → grounding call → grounded answer + deep links
```

Every tool forwards the caller's identity into the existing RBAC-scoped services, so a manager can never retrieve data outside their departments — even if the model is manipulated. Salary is excluded from tool projections, and the backend strips unknown arguments (prompt-injection defense). Provider keys live only in the API environment, never the frontend.

**Authentication flow:** the web app owns sign-in/sign-up via Neon Auth. Neon sets HttpOnly session cookies through the `/api/auth` proxy; the API validates every request by forwarding the session cookie to Neon's `get-session` endpoint. The confirmed identity maps to a local `User` row — the source of truth for the platform role. The first account to sign in becomes **admin**; later sign-ups are **viewers** until an admin promotes them. Emails in the optional `ADMIN_EMAILS` env var are always provisioned (or re-promoted) as admins.

### Demo walkthrough (for reviewers)

1. **Start the platform** — `pnpm dev`, then open http://localhost:3000.
2. **Sign in** — Google/GitHub, or register with email/password. Seed data is ready on first sign-in: 10 departments, 8 teams, 42 employees.
3. **Explore the dashboard** — Executive summary, KPI grid, and the attrition / engagement / composition / compare / insights sections. Use the global filters to slice everything at once; charts deep-link on click.
4. **Ask the Copilot** — open the drawer (top bar or "Ask PeopleLens" card), ask _"Which department has the highest attrition?"_ or _"Compare Engineering and Sales."_ Deep links in the answer open the filtered view.
5. **Browse employees** — search, filter, sort, paginate, open a profile, edit, soft-delete/restore.
6. **View the org chart** — expand the hierarchy from manager/team relationships, search, preview employees.
7. **Import a dataset** — download the CSV template from **CSV Import**, add rows (try one with a bad email and a duplicate code), upload it, and read the summary + per-row error report. History is retained.
8. **See RBAC in action** — the first account is **Admin** (all menu items). Promote a second account to **Manager** and assign it a department; it sees and writes only its departments. A third account stays a **Viewer** — read-only.

> The seeded workspace contains real workforce data, so no reviewer ever lands on an empty dashboard.

## Repository Structure

```
.
├── apps/
│   ├── web/                     # Next.js 15 application
│   │   └── src/
│   │       ├── app/             # App Router (landing, auth, (app) workspace)
│   │       ├── components/      # app-shell, dashboard, copilot, org-chart, ui kit
│   │       ├── hooks/           # useAsync, useAnalyticsFilters
│   │       └── lib/             # api client, auth facade, copilot client, formatters
│   └── api/                     # NestJS 11 application
│       ├── prisma/              # schema, migrations, seed
│       └── src/
│           ├── common/          # guards (session/roles/throttle), filter, interceptors
│           ├── ai/copilot/      # LLM providers, tools, prompts, rate limiter, eval
│           ├── analytics/       # analytics service + repository (RBAC-scoped)
│           ├── auth/            # Neon session bridge
│           ├── imports/         # CSV pipeline + import history
│           ├── departments/     # feature modules (employees, teams, users, …)
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
- Optional for the Copilot: an API key for Groq and/or OpenRouter (free tiers work)

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

Copies `.env.example` → `.env` / `.env.local` for each app (idempotent), then fill in the values in `apps/api/.env` and `apps/web/.env.local`:

- `DATABASE_URL` — your Neon Postgres connection string
- `NEON_AUTH_BASE_URL` — from Neon Console → Branch → Auth → Configuration
- `NEON_AUTH_COOKIE_SECRET` — `openssl rand -base64 32`
- `NEXT_PUBLIC_API_URL` — default `http://localhost:3001/api/v1`
- `ADMIN_EMAILS` (optional) — comma-separated emails granted the **Admin** role at first contact and re-promoted on every sign-in

  ```bash
  ADMIN_EMAILS=you@example.com,ops@example.com
  ```

- **Copilot** (optional) — set `GROQ_API_KEY` and/or `OPENROUTER_API_KEY` in `apps/api/.env` to enable the AI Copilot. Provider chain order is `AI_PROVIDER` (openai | groq | openrouter) → Groq → OpenRouter; any provider without a key is skipped, and the next one takes over on rate limit / timeout / error. Free-tier models are the defaults. The Copilot is fully optional — the dashboard works without it.

> **Optional:** a local Postgres is available via `docker compose up -d` — the `.env.example` defaults point at it.

### 3. Migrate & seed the database

```bash
pnpm --filter @peoplelens/api prisma:migrate dev
pnpm --filter @peoplelens/api prisma:seed
```

The seed is idempotent and creates demo workspace data: 10 departments, 8 teams, and 42 employees. No user accounts are seeded — platform accounts are provisioned from Neon Auth on first sign-in.

> **Important — Neon email verification:** Neon Auth enables _Email verification required_ by default, which blocks email/password sign-in until the address is verified. For an evaluation environment, switch **Email verification required** off in **Neon Console → Branch → Auth → Settings**.

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

```csv
employeeCode, firstName, lastName, email, phone, jobTitle, gender,
dateOfBirth, hiredAt, status, department, team, managerEmail
```

- `department` / `team` / `managerEmail` are matched by name/email (case-insensitive)
- Rows are validated individually — one bad row never blocks a good file
- Duplicates (within the file or already in the database) are reported, not inserted
- The result shows total / imported / duplicates / failed counts plus a per-row error report; every import is retained in history with uploader, status, and duration

## Analytics

All metrics are computed server-side from the seeded workspace (42 employees across 10 departments) and scoped to the caller's RBAC permissions:

- **Workforce Overview** — headcount, active employees, attrition rate, average tenure/age/monthly income, overtime rate, and performance rating KPIs. Metrics that need history the dataset lacks are labeled as current snapshots, never invented.
- **Retention & Attrition** — attrition by department, job role, age group, tenure, overtime, and job satisfaction, to answer _"where is retention risk concentrated?"_
- **Engagement & Culture** — satisfaction dimensions actually present in the dataset (job, environment, relationship), work-life balance, and overtime; metrics the dataset cannot support are marked "not available", not fabricated.
- **Talent / Hiring** — hiring velocity (last 12 months by department), quality-of-hire proxy (performance of recent hires), and early attrition (<1-year tenure). Hiring-pipeline metrics the dataset cannot support (time-to-hire, cost-per-hire, offer acceptance rate) are listed explicitly as unavailable.
- **Workforce Composition** — department, job role, gender, age, education, and tenure distributions with drill-down.
- **Executive Summary** — deterministic "Workforce Health" readout computed from real data.
- **Insights** — observed patterns only (correlation, never causation): _"Employees working overtime show a higher observed attrition rate in the current dataset."_
- **Department Comparison** — headcount, attrition, tenure, income, overtime, satisfaction, and performance across selected departments.

Global filters are applied server-side and intersected with the caller's RBAC scope, so a manager can only ever slice the departments they are assigned to.

## AI Workforce Copilot

The Copilot answers natural-language questions about workforce data — _"Which department has the highest attrition?"_, _"Compare Engineering and Sales."_, _"Show me employees in Sales working overtime."_ — using the same RBAC-scoped analytics services as the dashboard.

- **Grounded, not generative** — the model plans with a controlled tool set, the backend executes trusted services, and a second pass writes the answer from the structured result. It cannot invent metrics the dataset lacks and says so when data is unavailable.
- **Tool layer** — overview, attrition, engagement, composition, compare, department metrics, employee search/details, data quality, and import history tools, each with schema validation and authorization checks.
- **Provider failover** — OpenAI, Groq, and OpenRouter are all supported; providers without keys are skipped, and the next provider serves the request automatically on rate limit, timeout, or error.
- **Safe by default** — the LLM never touches PostgreSQL, never sees API keys, and cannot bypass RBAC even if prompted. Unknown tool arguments are stripped, conversation input is length-capped, and per-user rate limiting applies.
- **Deep links** — answers include buttons that open the filtered dashboard or Employee Explorer.
- **Conversations** — lightweight history stored per user (conversation + messages only; no tokens, keys, or salaries), resumable from the drawer.

## Development Commands

| Command                                       | Description                                          |
| --------------------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                                    | Run web + API in watch mode                          |
| `pnpm dev:web` / `pnpm dev:api`               | Run a single app                                     |
| `pnpm build`                                  | Production build for all workspaces                  |
| `pnpm lint`                                   | Lint all workspaces                                  |
| `pnpm typecheck`                              | Typecheck all workspaces                             |
| `pnpm test`                                   | Run unit tests (API + web)                           |
| `pnpm format` / `pnpm format:check`           | Format / verify formatting                           |
| `pnpm --filter @peoplelens/api prisma:studio` | Browse the database                                  |
| `pnpm --filter @peoplelens/api prisma:deploy` | Apply migrations (production)                        |
| `pnpm --filter @peoplelens/api eval:ai`       | Run the Copilot evaluation suite against the live DB |

> The `eval:ai` script runs `npx ts-node -r tsconfig-paths/register src/ai/copilot/eval/run-eval.ts` — it exercises the 8 evaluation cases (including manager RBAC scoping and prompt-injection) against the seeded database with the configured LLM providers.

## Testing

Backend unit tests (Jest) cover the highest-risk business logic:

- **RBAC** — role write-gates, department scoping, resource-level checks
- **Analytics** — calculations, department comparison, filter behavior, data quality
- **Employees** — CRUD, soft delete/restore, explorer queries, unique constraints
- **CSV / Imports** — parsing, row validation, duplicates, the full pipeline, import history
- **Auth** — Neon session validation, bootstrap-admin provisioning
- **Copilot** — provider abstraction (mock LLM), rate limiter, tool schemas + RBAC filtering, service orchestration, prompt-injection scenarios, and an evaluation dataset of 8 real questions run against the live database
- **DTO metadata** — regression guard ensuring `design:paramtypes` survives compilation so validation can never be silently disabled
- **Audit & Health** — best-effort recording; DB-up and degraded states

Frontend unit tests (Vitest + Testing Library) cover formatting, RBAC gating, and auth forms. The GitHub Actions workflow runs **typecheck → lint → test → build** on every push and pull request.

## Deployment

The stack deploys as two stateless services plus a managed database:

1. **PostgreSQL** — a Neon project (managed) or any Postgres 16 instance.
2. **API** (`apps/api`) — Node 20+, `pnpm install`, `prisma deploy`, `pnpm build`, `node dist/index` on port 3001. Set the env vars from `apps/api/.env.example` — including the Copilot keys (`GROQ_API_KEY` / `OPENROUTER_API_KEY`) if enabled.
3. **Web** (`apps/web`) — `pnpm build && pnpm start` on port 3000, pointed at the API via `NEXT_PUBLIC_API_URL` (must be the public, browser-reachable API origin).

Both services are horizontally scalable behind a reverse proxy. For production: set `NODE_ENV=production`, enable `TRUST_PROXY=true`, configure `CORS_ORIGINS` to your exact web origin, and keep `SWAGGER_ENABLED=false` unless you intentionally expose the docs. The Copilot rate limiter is in-memory per instance — if you run multiple API replicas, swap it for a shared store.

## Engineering Decisions & Trade-offs

| Decision                                    | Rationale                                                                                                                       | Trade-off                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Neon Auth as the identity provider**      | No custom password storage/hashing; the platform focuses on authorization                                                       | App identity is tied to Neon; self-hosting auth later requires a migration      |
| **Soft deletes via `deletedAt`**            | History, audit trails and dashboard counts survive "removal"                                                                    | Global unique indexes mean deleted records keep their email/code occupied       |
| **Marker cookie for frontend route guards** | Edge middleware cannot read `localStorage`; the cookie mirrors the session for UX redirects                                     | It is a UX guard only — the API remains the security boundary                   |
| **In-memory session cache (60s TTL)**       | Avoids a Neon `get-session` round-trip on every request                                                                         | A revoked token stays valid for ≤60s; acceptable for an MVP                     |
| **Bootstrap admins via `ADMIN_EMAILS`**     | Root-like identities are granted admin at first contact and re-promoted on every session — no manual DB pokes, survives reseeds | Env-listed accounts **cannot** be demoted or deactivated via the UI — by design |
| **LLM never touches the database**          | Grounded, explainable answers; the backend controls all data access                                                             | The Copilot cannot answer questions the tool layer doesn't support              |
| **Deterministic two-pass Copilot**          | Planning + grounding keeps answers truthful and bounded; no autonomous agent loops                                              | Two LLM calls per question (latency/cost) — acceptable for correctness          |
| **`createMany` avoided in imports**         | Per-row inserts report exact success counts and stay transactional                                                              | Slower than bulk insert for very large files (fine up to ~10 MB)                |
| **No React Query**                          | The app's `useAsync` hook covers data-fetching needs                                                                            | Manual memoization where needed                                                 |

## CI & Quality Gates

Every push and pull request runs a GitHub Actions workflow (`.github/workflows/ci.yml`) that installs, generates the Prisma client, then runs **typecheck → lint → test → build**. Locally, Husky enforces Conventional Commits and lint-staged lints/formats staged files before every commit.

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
- Soft deletes keep history and audit rows intact; every mutation writes an audit trail

See [docs/architecture.md](./docs/architecture.md) for the full architectural rationale and evolution plan.

## License

Proprietary — all rights reserved.
