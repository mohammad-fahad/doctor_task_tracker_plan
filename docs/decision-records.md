# Decision records

## Validation boundary

**Decision:** Zod schemas infer controller input types; parsed data is stored in `res.locals.validated[source]` via `initializeValidated`, `validate`, and `validated`.

**Why:** Express `req.query` is read-only/getter-based in Express 5, and assigning parsed values to it is brittle. A dedicated validated-data store avoids `any`, supports body/query/params in one chain, and makes controller contracts explicit.

**Alternatives rejected:** casting `req` objects (hid type errors), re-parsing inside controllers (duplicated logic), and mutating query objects (runtime risk).

## Serverless database lifecycle

**Decision:** The Vercel handler validates env at cold start, keeps one shared `connectDb()` promise per instance, resets it after failure, bypasses DB waits for `/health`, and exposes `/ready` backed by a real `ping`.

**Why:** Concurrent warm invocations must not spawn a connection storm, and transient DB startup failures must not poison all future invocations. Liveness should remain available to diagnose a DB outage.

**Alternatives rejected:** connecting per request (connection churn), caching failures forever (no recovery), and using `/health` as a database check (conflates liveness and readiness).

## Demo seed safety

**Decision:** Deterministic IDs, target-database assertion, production fail-closed, explicit `--reset --database=<name>`, admin bootstrap error propagation, and deletion limited to seeder-owned IDs.

**Why:** A demo utility must be idempotent and incapable of wiping unrelated or production data. Earlier code swallowed admin-seed errors and reset broad collections.

**Alternatives rejected:** generate random IDs each run (not idempotent), reset whole collections (unsafe), and allow reset based only on the current URI (too easy to point at the wrong DB).

## Web proxy migration

**Decision:** Rename `middleware.ts` to `proxy.ts` and export `proxy()` for Next.js 16.

**Why:** Next.js 16 deprecates the `middleware` convention. The migration preserves matcher behavior, cookie lookup, protected-route redirects with `next` query preservation, and login redirects.

**Alternatives rejected:** remain on deprecated middleware (future upgrade debt) and move all protection to client components (insecure on direct navigation).

## API base URL configuration

**Decision:** `resolveApiBaseUrl()` rejects missing/malformed/non-HTTP(S) values in production, rejects production localhost URLs, normalizes trailing slashes, and allows localhost fallback only in development/test. `joinApiUrl()` composes paths without duplicate separators.

**Why:** A client pointed at the wrong API domain fails silently at runtime; failing the build makes misconfiguration visible before deployment.

**Alternatives rejected:** hard-coded URLs, silent fallback in production, and runtime-only validation.

## Search semantics

**Decision:** Keep the existing case-insensitive substring regex behavior, but document it and continue escaping user input.

**Why:** Changing to strict prefix matching would be a behavioral change beyond the readiness scope. Escaping already prevents regex injection.

**Alternatives rejected:** silently changing search semantics or removing escaping.

## Dependency remediation

**Decision:** Upgrade direct `zod` to `^4.6.7`, upgrade `@hookform/resolvers` to `^7.0.7` and `react-hook-form` to `^7.55.0` for Zod 4 compatibility, normalize `package-lock.json` resolved URLs to the public npm registry, and gate production dependencies with `npm audit --omit=dev --audit-level=high`; document accepted dev-only findings.

**Why:** Zod is reachable from user-controlled request validation in deployed code. The remaining findings are confined to CI/build tooling with no user-controlled glob input and no exposure in deploy output.

**Alternatives rejected:** blanket full-tree audit gate (permanently failing on accepted tooling issues), downgrading Next.js ESLint tooling to satisfy an advisory (framework version regression), and ignoring production findings.
