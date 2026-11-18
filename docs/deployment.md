# Deployment guide

## Topology

| Component | Vercel project | Root | Entry / build | Notes |
| --- | --- | --- | --- | --- |
| Web | `web` | `apps/web` | Next.js 16 build | `NEXT_PUBLIC_API_BASE_URL` is inlined at build time. |
| API | `api` | `apps/api` | `api/index.ts` via `vercel.json` | Shared MongoDB connection per warm function instance. |
| Database | MongoDB Atlas | external | Mongoose 9 | Use isolated database/user per environment where possible. |

Observed project details from Vercel bot PR comments on the baseline work:
- API project ID `prj_kBWELC2IJqZevNVGNn945LlSPtte`, root `apps/api`.
- Web project ID `prj_XLsNOYPy1fVvyJUfAtcvT99uxhf7`, root `apps/web`.
- Baseline production commit statuses for web and api pointed to:
  - https://vercel.com/fahads-projects-555b1c80/web/3oMFK4VP86PxWswpkK5kjRSZQVR9
  - https://vercel.com/fahads-projects-555b1c80/api/5nWFHLsM3piiodrVSm9FbynAZTgG

Detailed dashboard configuration (environment variable values, domains, function logs, production promotion settings) was not inspected because the user instructed not to use Vercel CLI/tokens and the dashboard page is dynamic. Mark those items **NOT VERIFIED** unless an owner checks them.

## Environment variables

### API

Set these on both Production and Preview, with environment-specific values:

- `NODE_ENV=production` (normally set by Vercel)
- `MONGODB_URI`
- `JWT_SECRET` (>=16 chars, unique per environment)
- `JWT_EXPIRES_IN=7d`
- `COOKIE_NAME=dt_token`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none`
- `COOKIE_DOMAIN` (empty unless using a shared parent domain)
- `CORS_ORIGINS` (exact origins, comma-separated, no trailing slash)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (bootstrap context only; rotate after use)
- `DEMO_SEED_DATABASE` (optional, local/preview demo seeding only)

### Web

- `NEXT_PUBLIC_API_BASE_URL=https://<api-domain>/api/v1` (required for a usable production deployment; missing/invalid values throw a clear runtime error)
- `COOKIE_NAME=dt_token` (server-side proxy; must match API)

`NEXT_PUBLIC_*` variables are compiled into the client bundle. Changing the API URL requires a redeploy.

## Cross-origin and cookie rules

- Web and API on different Vercel domains require `SameSite=None; Secure` cookies over HTTPS.
- `CORS_ORIGINS` must contain the exact web origin(s), and credentialed CORS must remain enabled.
- The web proxy reads `COOKIE_NAME` server-side; the API uses the same value for cookie set/clear.
- Do not set `COOKIE_DOMAIN` for unrelated `*.vercel.app` domains.

## Preview verification

For each PR:

1. Wait for GitHub CI to pass all checks.
2. Wait for Vercel bot comments on both projects and record the preview URLs.
3. Smoke-test: login, `/dashboard`, `/doctors`, `/doctors/[id]`, `/patients`, create/edit/delete, logout, browser refresh on a protected route, and query-string preservation after login redirect.
4. Confirm `GET /api/v1/health` returns 200 and `GET /api/v1/ready` returns 200 with `database: "connected"`.
5. Confirm no browser console errors and that cookies are `HttpOnly`, `Secure`, `SameSite=None` on preview domains.

## Production promotion

1. Merge only after green CI, green preview checks, and required review.
2. Vercel promotes the merged commit; confirm both commit statuses are successful for the exact SHA.
3. Smoke-test production using the same checklist as preview.
4. Record the production URLs and commit SHA in the final report.

## Rollback

- Preferred: redeploy the previous known-good Vercel deployment for the affected project(s).
- Alternative: revert the merge commit and let CI/Vercel redeploy; confirm both projects receive the revert SHA.
- Never roll back by mutating production data. Database state is independent of application version.

## Owner actions still required

- Enable branch protection on `main` requiring the CI check and review. The API currently returns `404 Branch not protected`; CI is configured but not enforced.
- Verify dashboard-only Vercel settings and production logs with an owner who has access.
- Confirm production environment variable values match the target origins and database without logging secrets.
