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

**Decision:** One-command local `npm run seed:uat` with deterministic IDs, idempotent upserts, exact connected-database verification, explicit `--reset`/`--remove-demo` with `--database`, explicit `--reset-password --confirm-reset-password`, separate production env/CLI opt-ins, and deletion limited to seeder-owned IDs.

**Why:** A demo utility must be idempotent and incapable of wiping unrelated or production data. Earlier code swallowed admin-seed errors, reset broad collections, and blocked all production seeding. The current design keeps production fail-closed by default while allowing an owner to opt in deliberately from a trusted local terminal.

**Alternatives rejected:** generate random IDs each run (not idempotent), reset whole collections (unsafe), allow reset based only on the current URI (too easy to point at the wrong DB), and add doctor users/roles to satisfy a seed requirement (not a real application feature).

## Web proxy migration and session gate

**Decision:** Use the Next.js 16 `proxy.ts` convention only to redirect an already cookie-bearing visitor away from `/login`. Authorization is enforced by the protected layout calling `GET /api/v1/auth/me`, with the API verifying the JWT cookie and user on every protected request; unauthenticated users are redirected to `/login?next=...`.

**Why:** Next.js 16 deprecates the `middleware` convention, and the cross-origin login fix showed that inspecting a proxy-visible cookie is not a valid authorization gate when the API is on another domain. API-side session verification is the authoritative check, while the proxy remains a small UX optimization on the login route.

**Alternatives rejected:** treating cookie presence in the proxy as proof of authentication, and relying on client-only UI hiding without API-side protection.

## API base URL configuration

**Decision:** `resolveApiBaseUrl()` rejects missing/malformed/non-HTTP(S) values in production, rejects production localhost URLs, normalizes trailing slashes, and allows localhost fallback only in development/test. `joinApiUrl()` composes paths without duplicate separators.

**Why:** A client pointed at the wrong API domain should fail loudly. Validation is deferred to the first API call so Vercel preview builds and CI are not blocked by environment values that are only meaningful at runtime; the thrown `ApiConfigurationError` names the exact variable.

**Alternatives rejected:** hard-coded URLs, silent fallback in production, and runtime-only validation.

## Search semantics

**Decision:** Keep the existing case-insensitive substring regex behavior, but document it and continue escaping user input.

**Why:** Changing to strict prefix matching would be a behavioral change beyond the readiness scope. Escaping already prevents regex injection.

**Alternatives rejected:** silently changing search semantics or removing escaping.

## Dependency remediation

**Decision:** Upgrade direct `zod` to `^4.6.7`, upgrade `@hookform/resolvers` to `^7.0.7` and `react-hook-form` to `^7.55.0` for Zod 4 compatibility, normalize `package-lock.json` resolved URLs to the public npm registry, and gate production dependencies with `npm audit --omit=dev --audit-level=high`; document accepted dev-only findings.

**Why:** Zod is reachable from user-controlled request validation in deployed code. The remaining findings are confined to CI/build tooling with no user-controlled glob input and no exposure in deploy output.

**Alternatives rejected:** blanket full-tree audit gate (permanently failing on accepted tooling issues), downgrading Next.js ESLint tooling to satisfy an advisory (framework version regression), and ignoring production findings.
