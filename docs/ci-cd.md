# CI/CD notes

## Workflow

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual dispatch.

Single `verify` job on `ubuntu-latest` with `contents: read` permissions and cancellation of superseded runs. It provides a `mongo:7` service and sets `MONGODB_URI_TEST` to an isolated database. `apps/api/vitest.integration.config.ts` derives `MONGODB_URI`, `NODE_ENV`, `JWT_SECRET`, `COOKIE_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` before application modules load, so runtime validation and admin bootstrap succeed in CI. The job runs:

1. Checkout (pinned `actions/checkout@v7.0.1` SHA)
2. Setup Node 24 (pinned `actions/setup-node@v7.1.0` SHA)
3. `npm ci`
4. `npm run lint`
5. `npm run typecheck`
6. `npm run audit:prod`
7. `npm run test:unit`
8. `npm run test:integration`
9. `npm run build:api`
10. `npm run build:web` (no API URL is required for the build)

Actions are pinned to commit SHAs with version comments so an upstream tag move cannot change workflow code without a reviewed diff. `.github/dependabot.yml` checks npm and GitHub Actions weekly and groups dev tooling updates.

## Test split

- API unit tests: `apps/api/vitest.config.ts`, `tests/unit/**/*.test.ts`, no database.
- API integration tests: `apps/api/vitest.integration.config.ts`, `tests/integration/**/*.test.ts`, serial execution, require `MONGODB_URI_TEST`.
- Web tests: `apps/web/vitest.config.ts`, run via `npm run test:unit`.

Integration tests skip locally when `MONGODB_URI_TEST` is absent. CI always supplies the MongoDB service, so skipped integration tests in a PR indicate a workflow configuration problem, not a passing result. Tests drop only the dedicated test database after the suite.

## Production audit gate

`npm run audit:prod` runs `npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org`. It passes with 0 vulnerabilities after the Zod 4 upgrade. The full-tree audit still reports known development-only findings; see [security audit triage](security-audit.md). Do not replace the production gate with a blanket full-tree gate without first upgrading the dev toolchain.

## Required checks and branch protection

The CI workflow is the required quality gate, but branch protection on `main` currently returns `404 Branch not protected`. An owner must enable:

- Require a pull request before merging.
- Require the `Lint, typecheck, tests, builds and production audit` status check.
- Require review approval.
- Dismiss stale approvals and require branches to be up to date.

Until this is configured, CI results are visible but not enforced. This is an owner action and must be reported as such, not assumed complete.

## Secrets

CI uses no production secrets. The web build uses a syntactically valid placeholder API URL only for build verification. Do not add Vercel tokens, MongoDB credentials, or JWT secrets to repository variables or workflow files.
