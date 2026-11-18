# Dependency security audit triage

Baseline: `main` at `9d4861259239f61232b84035fe1183740a613c78` (2026-11-18).
Command used: `npm audit --json` against the public npm registry (the local
machine's default registry does not implement the audit endpoint, so the
reports below were produced with `--registry=https://registry.npmjs.org`).

All 19 findings listed here existed on the baseline commit, before the
`feat/application-readiness` branch. None were introduced by this work.

## Triage summary

| Finding | Advisory | Vulnerable range | Path | Scope | Reachable in deployed app? | Resolution |
| --- | --- | --- | --- | --- | --- | --- |
| `zod` (high) | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — memory exhaustion validating oversized constrained collections | `<4.6.6` | direct: `apps/api` and `apps/web` | production | **Yes** — request validation and runtime env validation call `safeParse` on user-controlled bodies/queries | Upgraded direct dependency to `^4.6.7`; API and web typecheck, lint, unit tests and builds pass. |
| `vitest` / `@vitest/mocker` (critical → moderate) | [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) — `tinypool` prototype-pollution gadget and Vitest mock path traversal / code injection | `tinypool <=2.1.1`; `@vitest/mocker >=2.1.0 <4.1.12` | `apps/api` devDependency `vitest@3.x` → `tinypool`, `@vitest/mocker` | development/test only | No — Vitest, its workers and its mocker are not bundled into the API or web deploy output. Exposure is limited to CI runners executing this repository's own tests. | Accepted with controls. Upgrading requires Vitest 5 (major) and a Vite/ECMAScript test-runner migration; it is tracked as follow-up tooling work rather than a production risk. CI remains least-privilege (`contents: read`), ephemeral, and never receives production secrets. |
| `picomatch` (high) | [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) — ReDoS via single-branch repeated extglobs | `<=4.0.7` | `fast-glob`/`micromatch`/`fdir`/`tinyglobby` under `eslint`, `vite`, `vitest`, `typescript-eslint` | development/test only | No — build/lint/test tooling only; no user-controlled glob input. | Accepted; upstream fix depends on the same major tooling upgrade chain as Vitest/eslint-config-next. |
| `fdir`, `tinyglobby`, `vite`, `eslint-import-resolver-typescript` (high) | inherited from `picomatch` ReDoS | `fdir >=5.2.1`, `tinyglobby *`, `vite >=6.3.0-beta.0`, `eslint-import-resolver-typescript >=3.8.0` | `typescript-estree`, `vite`, `vitest`, `@next/eslint-plugin-next` | development/test only | No — local tooling. | Accepted for the same reason; fixed in later majors of the parent tools. |
| `@typescript-eslint/{eslint-plugin,parser,type-utils,typescript-estree,utils}`, `typescript-eslint` (high) | inherited from `tinyglobby`/`picomatch` | `>=8.47.1-alpha.0` | direct devDependency `typescript-eslint@^8.56.0` in `apps/api`; also under `eslint-config-next` | development/test only | No — lint-time only. | Accepted; upstream fix is tied to the eslint-config-next major line. |
| `eslint-config-next`, `@next/eslint-plugin-next`, `fast-glob`, `micromatch` (high) | inherited from `picomatch` ReDoS | `eslint-config-next >=10.2.1-canary.2` | direct devDependency `eslint-config-next@^16` in `apps/web` | development/test only | No — lint-time only. | Accepted. `npm audit` suggests `eslint-config-next@15.5.29`, which is a **downgrade** from the Next.js 16 toolchain and would break parity with the app framework; not applied. |

## Production gate

Because every remaining finding is confined to development/test tooling, the
meaningful gate is a production-only audit at `high` severity:

```bash
npm run audit:prod   # npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org
```

After the Zod upgrade this reports **0 vulnerabilities**. CI runs this gate as
its own step; a future high/critical finding in a production dependency will
fail the build. A blanket full-tree `audit --audit-level=high` gate is
deliberately **not** used: it would fail forever on known, accepted dev-tooling
findings and stop distinguishing real production risk from lint-runner noise.

## Verification

- Before fix: 19 total (2 critical, 16 high, 1 moderate) — all pre-existing on `main`.
- After fix: 18 total (2 critical, 15 high, 1 moderate), all development-only.
- Production-only audit: 0 total.
- Regression coverage: API and web typecheck, lint, unit tests and both builds
  pass with Zod 4.6.7; validation-schema assertions are in
  `apps/api/tests/unit/validation.test.ts`, real-route validation coverage is in
  `apps/api/tests/unit/routes.test.ts`, and Zod 4 React Hook Form compatibility
  is covered by `apps/web/tests/form-resolver.test.ts`.
