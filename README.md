# Doctor Tracker

Doctor Tracker is a production-minded clinical administration dashboard for managing doctors, patients, and operational analytics through a separate Next.js frontend and Express REST API backed by MongoDB.

## Features

### Authentication & Access
- Administrator-only login (no public registration)
- HTTP-only JWT cookie authentication
- Protected frontend routes and protected `/api/v1` resources
- Login rate limiting and Origin verification for browser state-changing requests
- Authenticated profile endpoint and logout

### Dashboard (`/dashboard`)
- Real-time summary statistics: total doctors, total patients, new patients in period
- Date range selector for period-based analytics
- Charts: patient registrations over time, patients per doctor
- Loading, empty, and error states

### Doctors (`/doctors`, `/doctors/[id]`)
- Create doctor profiles
- Search by name/specialization/hospital
- Filter by specialization, hospital, and date range
- Server-side pagination with URL-persisted state (10/20/50)
- Doctor detail view with patient count and assigned patients
- Add patient to selected doctor and delete patients from doctor detail

### Patients (`/patients`)
- Cross-doctor patient listing
- Create, edit, delete patients (with confirmation)
- Search by name/phone/email
- Filter by doctor, condition, and date range
- Server-side pagination and newest/oldest sorting

## Technology Stack

**Frontend (`apps/web`)**
- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4, shadcn/ui-style components (Radix primitives), Lucide icons
- TanStack Query, React Hook Form + Zod, Recharts
- Deployed target: Vercel

**Backend (`apps/api`)**
- Node.js, Express 5, TypeScript
- MongoDB, Mongoose 9
- Zod validation, bcrypt password hashing, JWT auth (HTTP-only cookies)
- Helmet, CORS allowlist + credentials, express-rate-limit
- Deployed target: Vercel Functions

**Database**
- MongoDB Atlas (separate collections: `users`, `doctors`, `patients`)

## Monorepo Structure

```text
doctor-tracker/
  apps/
    web/                  # Next.js frontend
      src/
        app/              # App Router pages/layouts
        components/       # UI, layout, charts, shared components
        hooks/            # Client hooks (auth, debounce)
        lib/              # API client and utilities
        types/            # Shared frontend types
      .env.example
    api/                  # Express REST API
      api/index.ts        # Vercel Functions entrypoint
      src/
        config/           # env + db connection
        controllers/      # request handlers
        middleware/       # auth, validation, errors, rate limit
        models/           # Mongoose schemas/indexes
        routes/           # versioned API routes
        services/         # business logic / aggregation
        utils/            # pagination, normalization, helpers
        validators/       # Zod schemas
        scripts/          # admin bootstrap, demo seed
      tests/              # Vitest tests
      vercel.json
      .env.example
  docs/screenshots/       # real screenshots (add when captured)
  README.md
  .gitignore
```

## Local Setup Guide

### Prerequisites
- Node.js 24 (CI uses Node 24; local verification also passed on Node 22)
- npm 10+
- MongoDB (local instance or isolated test/development database). Never use a production database for tests or demo seeding.

### Installation
```bash
npm install
```

### Environment Configuration
Create environment files from examples:

**Backend:** `apps/api/.env` (from `apps/api/.env.example`)
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/doctor_tracker
JWT_SECRET=replace-with-strong-secret-at-least-16-chars
JWT_EXPIRES_IN=7d
COOKIE_NAME=dt_token
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=
CORS_ORIGINS=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-unique-password
```
> Example values are placeholders only. Choose a strong, unique admin password and JWT secret; never reuse values from this repository.

**Frontend:** `apps/web/.env` (from `apps/web/.env.example`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
COOKIE_NAME=dt_token
```

### MongoDB Setup
- Local: ensure MongoDB is running and `MONGODB_URI` points to it.
- Atlas: create a cluster/database user, allow network access, and set `MONGODB_URI` to the Atlas URI.
- **No external database is seeded or modified by this repository unless you run the seed commands with your configured URI.**

### UAT Seed — one command
```bash
npm run seed:uat
```
This is the complete local UAT setup. It:
- creates the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `apps/api/.env` only if that account does not exist,
- upserts the existing demo dataset: **12 fictional doctors** and **84 fictional patients** (varied specializations, hospitals, conditions, ages and dates),
- is idempotent, preserves unrelated users/doctors/patients, and prints a short summary that never includes passwords, Mongo URIs or JWT secrets,
- fails clearly when `MONGODB_URI`, `ADMIN_EMAIL` or `ADMIN_PASSWORD` is missing or MongoDB is unreachable.

Admin-only or demo-only setup is also available:
```bash
npm run seed:uat -- --admin-only
npm run seed:uat -- --demo-only
npm run seed:uat -- --help
```

### Admin login (local)
Open **http://localhost:3000/login** and sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `apps/api/.env`. The API endpoint is `POST http://localhost:4000/api/v1/auth/login`; the response sets an HTTP-only auth cookie.

**Supported login methods and roles (current application):**
- Web login form at `http://localhost:3000/login` — administrator role only.
- Direct API login at `POST /api/v1/auth/login` — administrator role only.
- There is no public registration, no OAuth/SSO, and no second user role (such as doctor or patient). The `User` model supports only `role: "admin"`.
- **Doctors and patients are data records, not users. Doctors currently do not have login accounts.** No doctor credentials are generated by any seed script.

### Explicit admin password reset
A repeated `npm run seed:uat` never overwrites an existing admin password. To change it deliberately, update `ADMIN_PASSWORD` in `apps/api/.env`, then run both confirmation flags:
```bash
npm run seed:uat -- --reset-password --confirm-reset-password
```
`--reset-password` alone is rejected. The reset uses the value currently configured in `ADMIN_PASSWORD`.

### Reset or remove demo records safely
Demo records use deterministic IDs owned by the seeder. Reset (delete then re-seed) or removal never touches unrelated records, but both require the exact connected database name:
```bash
# delete seeder-owned demo IDs, then re-create the 12/84 dataset
npm run seed:uat -- --reset --confirm-reset --database=<exact-database-name>

# delete seeder-owned demo IDs only (no re-seed)
npm run seed:uat -- --demo-only --remove-demo --confirm-reset --database=<exact-database-name>
```
The connected database name is verified before any write. In production, both operations require additional owner opt-in (see below).

### Build, deploy and seed are separate steps
`npm run build` (and the Vercel build/deploy pipeline) only compiles and bundles code; it never runs a seed script. No seed runs on API/web application startup or cold start. Seeding is always a separate, explicit command run by a person against a chosen database.

### Development Commands
```bash
# run API + web together
npm run dev

# run separately
npm run dev:api
npm run dev:web
```
- Web: http://localhost:3000
- API: http://localhost:4000/api/v1

## Production UAT Bootstrap (owner-only, manual)

Nothing in `npm run build`, Vercel builds/deployments, or application startup seeds data. The repository owner must run the commands below from a **trusted local terminal**, using values supplied by the owner from their own secret manager. Never put these opt-in variables or credentials in Vercel environment variables, source code, README, or Git.

> **Warning:** the demo dataset is entirely fictional (`@example.com` addresses, `555-*` phones, invented conditions). Do not mix fictional UAT patients with real patient data. If the target database contains real patient records, do not run the demo seed. Production demo seeding remains an explicit owner decision.

Set the owner-supplied values in the trusted shell (placeholders below are not credentials):
```bash
export NODE_ENV=production
export MONGODB_URI='<owner-supplied-mongodb-uri>'
export JWT_SECRET='<owner-supplied-jwt-secret-at-least-16-chars>'
export ADMIN_EMAIL='<owner-supplied-admin-email>'
export ADMIN_PASSWORD='<owner-supplied-strong-admin-password>'
export UAT_SEED_DATABASE='<exact-database-name-from-the-uri>'
export UAT_SEED_ALLOW_PRODUCTION=true
```

1. Verify that the exact database name in `MONGODB_URI` matches `UAT_SEED_DATABASE`, then bootstrap only the admin:
```bash
npm run seed:uat -- --production --confirm-production --database="$UAT_SEED_DATABASE" --admin-only
```
2. **Optional owner decision:** seed the 12 fictional doctors and 84 fictional patients:
```bash
npm run seed:uat -- --production --confirm-production --database="$UAT_SEED_DATABASE" --demo-only
```
3. **Optional explicit password reset:** set the new value in `ADMIN_PASSWORD` first, then:
```bash
export UAT_SEED_RESET_PASSWORD=true
npm run seed:uat -- --production --confirm-production --database="$UAT_SEED_DATABASE" --admin-only --reset-password --confirm-reset-password
```
4. **Optional demo cleanup** (requires one more opt-in):
```bash
export UAT_SEED_RESET_DEMO=true
npm run seed:uat -- --production --confirm-production --database="$UAT_SEED_DATABASE" --demo-only --reset --confirm-reset
# or remove only, without re-seeding:
npm run seed:uat -- --production --confirm-production --database="$UAT_SEED_DATABASE" --demo-only --remove-demo --confirm-reset
```

Production safety behavior:
- Requires `NODE_ENV=production`, `UAT_SEED_ALLOW_PRODUCTION=true`, `--production`, and `--confirm-production`. Any missing item fails closed before writing.
- `UAT_SEED_DATABASE` and `--database` must be identical **and** must exactly match the MongoDB database name reported by the active connection before any write.
- Existing admin accounts are preserved; passwords change only with `--reset-password --confirm-reset-password` plus `UAT_SEED_RESET_PASSWORD=true`.
- Only seeder-owned demo IDs are removed on reset/removal; all unrelated records are preserved.
- Console output never prints passwords, MongoDB URIs, or JWT secrets.
- After running, the owner must verify production admin login; this repository does not claim production UAT readiness until that verification is done.

## System Architecture

```mermaid
flowchart LR
  U[Admin Browser] -->|HTTPS + cookies| W[Next.js Web App\nVercel]
  W -->|REST /api/v1 fetch (credentials: include)| A[Express API\nVercel Functions / Node]
  A -->|Mongoose queries + aggregations| M[(MongoDB Atlas)]

  subgraph Frontend
    W --> RQ[TanStack Query cache]
    W --> UI[App Router pages\nRHF + Zod forms]
  end

  subgraph Backend
    A --> MW[Helmet/CORS/Origin/Auth/Validation]
    MW --> C[Controllers]
    C --> S[Services]
    S --> MD[Models + Indexes]
    A --> H[/health: liveness]
    A --> R[/ready: database ping]
  end
```

The web app inlines `NEXT_PUBLIC_API_BASE_URL` at build time and validates it when an API request is made, so a missing/invalid production value raises a clear `ApiConfigurationError` without blocking Vercel preview builds. The serverless API validates its runtime environment at cold start and waits for one shared MongoDB connection before serving non-liveness requests; failed initialization is retried on the next invocation.

**Data flow:** UI actions -> validated client forms -> API client (`fetch` with cookies) -> Express middleware/validation -> service layer -> Mongoose/MongoDB -> normalized JSON responses -> TanStack Query cache/invalidation.

## Technical Decisions

### A. Separate Doctor and Patient Collections, Indexing, and Server-side Search/Pagination
Doctors and patients are stored in separate MongoDB collections with `Patient.doctorId` as an `ObjectId` reference (not embedded arrays). This avoids unbounded document growth, supports cross-doctor patient queries (`/patients`), simplifies updates/deletes, and enables efficient joins via `$lookup` only where needed (analytics).

Server-side pagination, filtering, sorting, and search are implemented in the API (`page`, `limit` with max cap, allowlisted limits 10/20/50, stable sort). The frontend sends debounced queries and persists state in URL params. Read paths use `.lean()` and selective population to reduce overhead and avoid loading all records client-side.

**Indexes (query-aligned):**
- Doctor: `{ createdAt: -1 }`, `{ nameNormalized: 1 }`, `{ specializationNormalized: 1 }`, `{ hospitalNormalized: 1 }`, `{ specializationNormalized: 1, hospitalNormalized: 1, createdAt: -1 }` (+ `_id` unique default)
- Patient: `{ doctorId: 1, createdAt: -1 }`, `{ conditionNormalized: 1, createdAt: -1 }`, `{ nameNormalized: 1 }`, `{ phoneNormalized: 1 }`, `{ emailNormalized: 1 }`, `{ createdAt: -1 }`
- User: `{ email: 1, unique }`

Search uses normalized lowercase fields and escaped regex with anchored/prefix-friendly matching. Duplicate/unnecessary indexes were avoided. For production tuning, representative queries can be checked with `explain()` in Mongo shell/Compass (documented, not automated) to validate index usage against real data distributions.

### B. MongoDB Aggregation for Dashboard Analytics
Dashboard metrics are computed in MongoDB via aggregation pipelines (`$match`, `$group`, `$dateToString`, `$lookup`, `$project`, `$sort`, `$limit`) instead of fetching patient records into the frontend/backend memory. This minimizes data transfer, scales with collection size, and keeps grouping/counting close to the data. The API returns only required chart/summary payloads and distinguishes all-time totals from date-filtered period metrics. Empty datasets are handled with zeroed/empty responses for clean UI states.

### C. Typed Validation Boundary and Safe Serverless Startup
Validated request data is stored in `res.locals.validated` by source (`body`, `query`, `params`), so controllers consume inferred Zod types without mutating Express request objects or using `any`. Next.js 16's `proxy` replaces deprecated middleware while preserving cookie-based route protection and redirect query preservation. The Vercel handler validates env at cold start, shares one DB connection promise, bypasses DB waits for `/health`, and exposes `/ready` with an actual `ping`.

### D. Search Semantics and Demo Seed Safety
Search regexes use escaped input with case-insensitive substring matching; this preserves existing behavior while preventing regex injection. Demo seeding uses deterministic IDs, is idempotent, and validates the exact target database. Production seeding requires separate environment and CLI opt-ins plus an exact connected-database match; unconfirmed resets/passwords are rejected, admin bootstrap errors propagate, and reset/removal only touches IDs owned by the seeder.

See [decision records](docs/decision-records.md) for the rationale and alternatives considered.

## API Documentation

Base URL: `/api/v1` (JSON responses: `{ success, data, ... }` or `{ success: false, message, details? }`)

### Authentication
- `POST /api/v1/auth/login`
  - Body: `{ email: string, password: string }`
  - 200: sets HTTP-only auth cookie, returns `{ success: true, data: { user } }`
  - 401 invalid credentials, 429 rate limited
- `POST /api/v1/auth/logout` (auth required) – clears auth cookie
- `GET /api/v1/auth/me` (auth required) – returns current admin user

### Doctors (auth required)
- `GET /api/v1/doctors`
  - Query: `page`, `limit` (10|20|50), `search`, `specialization`, `hospital`, `from`, `to`, `sort=newest|oldest`
- `POST /api/v1/doctors`
  - Body: `{ name, specialization, hospital, phone, email }`
- `GET /api/v1/doctors/filters/options` – specialization/hospital lists
- `GET /api/v1/doctors/:id` – doctor detail + `patientCount`
- `GET /api/v1/doctors/:id/patients` – paginated patients for doctor
- `POST /api/v1/doctors/:id/patients`
  - Body: `{ name, age, gender, condition, phone, email? }`

### Patients (auth required)
- `GET /api/v1/patients`
  - Query: `page`, `limit`, `search` (name/phone/email), `doctorId`, `condition`, `from`, `to`, `sort`
- `POST /api/v1/patients`
  - Body: `{ name, doctorId, age, gender, condition, phone, email? }`
- `GET /api/v1/patients/:id`
- `PATCH /api/v1/patients/:id` – partial update
- `DELETE /api/v1/patients/:id`

### Analytics & Health
- `GET /api/v1/dashboard/summary?from=&to=` (auth required)
  - Returns `{ totals, period, patientsPerDoctor, registrationsOverTime }`
- `GET /api/v1/health` – liveness/status (does not wait for MongoDB)
- `GET /api/v1/ready` – readiness; `200` with `{ status: "ready", database: "connected" }` after a successful `ping`, otherwise `503`

**Pagination response shape:**
```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 }
}
```

## Security Considerations
- No public registration; admin bootstrap via env-driven command
- Passwords hashed with bcrypt; hashes never exposed in responses
- JWT stored in HTTP-only cookie (not localStorage); secure/samesite/domain configurable
- Explicit CORS origin allowlist with credentials
- Origin verification on browser state-changing requests
- Helmet security headers and login rate limiting
- Zod validation, ObjectId validation, centralized error handling (no stack traces in production)
- Frontend and API route protection with 401 handling
- Production-only dependency audit gate (`npm run audit:prod`) with documented dev-tooling exceptions in [security audit triage](docs/security-audit.md)
- Seed scripts are fail-closed by default, production requires separate env/CLI opt-ins plus exact DB-name verification, and reset cannot remove non-demo data
- CI uses least-privilege `contents: read` permissions, pinned action SHAs, and never receives production secrets

## Performance Considerations
- Server-side pagination/search/filter/sort across list endpoints
- MongoDB indexes aligned to query patterns; normalized searchable fields
- Escaped regex searches and capped/validated pagination limits
- `.lean()` reads and selective population
- Aggregation pipelines for analytics (no full collection transfer)
- TanStack Query caching/invalidation and debounced frontend search
- Avoids N+1 patterns by targeted queries/aggregations

## Testing Instructions

Full local verification (Node 24, npm 10+):
```bash
npm ci
npm run lint
npm run typecheck
npm run audit:prod
npm run test:unit
npm run test:integration
npm run build:api
npm run build:web
```

`npm run test:unit` runs API unit tests plus web tests (no database required). Coverage includes validation schemas, query builders, dashboard aggregation mapping, real Express routes with mocked services, seed CLI parsing/guards and output safety, serverless lifecycle/retry/concurrency, API config resolution, and proxy redirects.

`npm run test:integration` runs DB-backed API tests only when `MONGODB_URI_TEST` points to a reachable isolated MongoDB. Without it, the suite skips cleanly. CI provides a `mongo:7` service and sets `MONGODB_URI_TEST`, so integration coverage runs on every PR. The tests drop only their dedicated test database in `afterAll`; never point this variable at production. UAT seed integration coverage includes admin creation/preservation, explicit password reset with successful login, idempotent 12/84 demo seeding, unrelated-record preservation, exact database verification, and safe demo reset/removal.

> `next build` deliberately does not require `NEXT_PUBLIC_API_BASE_URL`; the first API call in production throws a clear configuration error if it is missing or invalid. Set it to the real API URL on Vercel for a usable deployment.

## Deployment Readiness (Vercel + MongoDB Atlas)

### Targets
- **Frontend:** Vercel project `web`, root `apps/web`, framework Next.js 16.
- **Backend:** Vercel project `api`, root `apps/api`, Node function entry `api/index.ts` via `vercel.json`.
- **Database:** MongoDB Atlas, one cluster with dedicated database/user per environment where possible.
- **Observability:** liveness `GET /api/v1/health`, readiness `GET /api/v1/ready`.

### Environment Variables by Scope
**API (Vercel project `api`, Production + Preview)**
- `NODE_ENV=production` (set by Vercel for production deployments)
- `MONGODB_URI` — Atlas connection string for the target environment
- `JWT_SECRET` — strong secret (>=16 chars), unique per environment
- `JWT_EXPIRES_IN=7d`
- `COOKIE_NAME=dt_token` — must match the web proxy's `COOKIE_NAME`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none` — required for cross-site `*.vercel.app` or separate domains
- `COOKIE_DOMAIN` — only for a shared parent domain; leave empty for independent Vercel domains
- `CORS_ORIGINS` — exact comma-separated frontend origin(s), no trailing slash
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — only in the trusted local bootstrap shell; never in Vercel environment variables
- `UAT_SEED_ALLOW_PRODUCTION`, `UAT_SEED_DATABASE`, `UAT_SEED_RESET_PASSWORD`, `UAT_SEED_RESET_DEMO` — owner-only local seed opt-ins; never set in Vercel or application runtime environments

**Web (Vercel project `web`, Production + Preview)**
- `NEXT_PUBLIC_API_BASE_URL=https://<api-domain>/api/v1` — required for a usable production deployment; missing/invalid values throw a clear runtime error
- `COOKIE_NAME=dt_token` — server-side proxy only, must match API

> `NEXT_PUBLIC_*` values are inlined at build time. Changing them requires a redeploy. Preview deployments must point at the preview API and include that preview web origin in the API's `CORS_ORIGINS`.

### Pre-deploy / Promotion Checklist
1. Confirm the PR CI run is green: lint, typecheck, production audit, unit tests, DB-backed integration tests, API build, web build.
2. Confirm Vercel bot comments show a successful preview deployment for both projects and manually smoke-test login, protected routes, create/edit/delete, and dashboard on the preview URL.
3. Verify `CORS_ORIGINS`, cookie domain/SameSite/Secure, and `NEXT_PUBLIC_API_BASE_URL` match the exact target origins.
4. Confirm branch protection requires the CI check and review before merging (currently an owner action; see below).
5. Merge the PR; Vercel promotes the same commit to Production. Confirm production commit statuses and smoke-test `/health`, `/ready`, login, and one read/write flow.
6. Rollback by redeploying the previous known-good Vercel deployment (or reverting the merge commit and allowing CI/Vercel to redeploy). Do not mutate production data during rollback.

### Current Repository Evidence and Limits
- Main baseline `9d4861259239f61232b84035fe1183740a613c78` had a successful CI run and successful Vercel commit statuses for both projects.
- Vercel bot preview evidence for PR #1 exists for `api` and `web`; detailed dashboard-only production settings are dynamic and must be verified by an owner with dashboard access.
- Branch protection on `main` currently returns `404 Branch not protected`. CI is configured but not enforced until an owner enables it. This is reported as an owner action, not silently assumed.
- No production secrets were inspected, installed, or logged. The Vercel CLI was not used.

See [deployment guide](docs/deployment.md) and [CI/CD notes](docs/ci-cd.md) for details.

## Additional Documentation
- [Deployment guide](docs/deployment.md) — Vercel setup, env scoping, preview smoke tests, promotion and rollback.
- [CI/CD notes](docs/ci-cd.md) — required checks, pinned actions, integration-test database, branch protection owner action.
- [Security audit triage](docs/security-audit.md) — production gate and accepted development-only findings.
- [Decision records](docs/decision-records.md) — rationale for validation, serverless lifecycle, proxy migration, and seed safety.

## Visual Evidence
Add real captured screenshots to `docs/screenshots/` and update links here:
- Desktop: `docs/screenshots/dashboard-desktop.png`, `docs/screenshots/doctors-desktop.png`, `docs/screenshots/patients-desktop.png`
- Mobile: `docs/screenshots/dashboard-mobile.png`, `docs/screenshots/doctors-mobile.png`, `docs/screenshots/patients-mobile.png`

> Screenshots are not fabricated in this environment; capture from a running instance after configuring MongoDB and seeding demo data.

## Local Run Quickstart
```bash
npm install
# configure apps/api/.env and apps/web/.env (ADMIN_EMAIL/ADMIN_PASSWORD come from apps/api/.env)
npm run seed:uat
npm run dev
# open http://localhost:3000/login and sign in with your configured admin credentials
```
