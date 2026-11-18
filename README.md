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
- Node.js LTS (tested with Node 22.x)
- npm 10+
- MongoDB (local instance or MongoDB Atlas connection string)

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
ADMIN_PASSWORD=ChangeMe123!
```

**Frontend:** `apps/web/.env` (from `apps/web/.env.example`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

### MongoDB Setup
- Local: ensure MongoDB is running and `MONGODB_URI` points to it.
- Atlas: create a cluster/database user, allow network access, and set `MONGODB_URI` to the Atlas URI.
- **No external database is seeded or modified by this repository unless you run the seed commands with your configured URI.**

### Admin Bootstrap (idempotent)
Creates the administrator account from `ADMIN_EMAIL`/`ADMIN_PASSWORD` if it does not exist.
```bash
npm run seed:admin
```

### Demo Seed (idempotent demo dataset)
Resets demo collections and seeds 12 fictional doctors and 84 fictional patients with varied dates/specializations/conditions. Also ensures admin exists.
```bash
npm run seed:demo
```
> All seeded data is fictitious and uses `@example.com`/non-real contact details.

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
  end
```

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
- `GET /api/v1/health` – service status/timestamp

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

## Performance Considerations
- Server-side pagination/search/filter/sort across list endpoints
- MongoDB indexes aligned to query patterns; normalized searchable fields
- Escaped regex searches and capped/validated pagination limits
- `.lean()` reads and selective population
- Aggregation pipelines for analytics (no full collection transfer)
- TanStack Query caching/invalidation and debounced frontend search
- Avoids N+1 patterns by targeted queries/aggregations

## Testing Instructions

Backend tests (Vitest, no external DB required for included tests):
```bash
npm run test -w apps/api
# or
npm run test
```
Included coverage:
- Login/doctor/patient validation (including invalid doctor reference format)
- Search/filter query builder logic
- Pagination boundary/default behavior
- Date-range parsing used by dashboard/services

Type checks / lint / builds:
```bash
npm run typecheck
npm run lint
npm run build
```
> If MongoDB-backed integration tests are added, provide a dedicated test database URI; builds and included unit tests do not require production credentials.

## Deployment Readiness (Vercel + MongoDB Atlas)

### Targets
- **Frontend:** Vercel (`apps/web`)
- **Backend:** Vercel Functions (`apps/api`, entry `api/index.ts`, `vercel.json`)
- **Database:** MongoDB Atlas

### Production Environment Variables
**Backend (`apps/api`)**
- `NODE_ENV=production`
- `MONGODB_URI` (Atlas)
- `JWT_SECRET` (strong secret, >=16 chars)
- `JWT_EXPIRES_IN` (e.g. `7d`)
- `COOKIE_NAME` (e.g. `dt_token`)
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none` (for cross-site frontend/backend domains; requires HTTPS)
- `COOKIE_DOMAIN` (set only if needed for shared parent domain)
- `CORS_ORIGINS=https://<your-web-domain>`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (for bootstrap command execution context)

**Frontend (`apps/web`)**
- `NEXT_PUBLIC_API_BASE_URL=https://<your-api-domain>/api/v1`

### Notes
- Configure CORS origin to exact frontend URL(s) and keep credentials enabled.
- For separate Vercel domains, use `SameSite=None; Secure` cookies over HTTPS.
- Health check: `GET /api/v1/health`
- Build/start commands: root/app scripts (`npm run build`, `npm run dev` locally); Vercel uses project builds (`next build`, serverless function bundling for API).
- `.env` files and secrets must never be committed. Demo credentials should be shared privately.

## Visual Evidence
Add real captured screenshots to `docs/screenshots/` and update links here:
- Desktop: `docs/screenshots/dashboard-desktop.png`, `docs/screenshots/doctors-desktop.png`, `docs/screenshots/patients-desktop.png`
- Mobile: `docs/screenshots/dashboard-mobile.png`, `docs/screenshots/doctors-mobile.png`, `docs/screenshots/patients-mobile.png`

> Screenshots are not fabricated in this environment; capture from a running instance after configuring MongoDB and seeding demo data.

## Local Run Quickstart
```bash
npm install
# configure apps/api/.env and apps/web/.env
npm run seed:admin
npm run seed:demo
npm run dev
# open http://localhost:3000 and sign in with your configured admin credentials
```
