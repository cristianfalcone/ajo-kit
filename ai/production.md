# Production Readiness Refactor Plan

Last updated: 2026-06-20

This is the refactor plan for taking `ajo-kit` from a solid local
metaframework base to a production-ready base for real applications. It records
current findings, target outcomes, and the phase order. It is not the canonical
architecture document; update `ai/architecture.md` only after implementation
changes the current architecture.

## Baseline

Current verification before this plan:

- `pnpm exec tsc --noEmit`: passed.
- `pnpm audit --prod`: passed, no known vulnerabilities.
- `pnpm test:unit`: passed, 44 tests.
- `pnpm build`: passed.
- `pnpm test:e2e`: passed, 33 tests.
- `npm pack --dry-run --json ./packages/ajo-kit`: passed.
- `npm pack --dry-run --json ./packages/ajo-auth`: passed.
- `npm pack --dry-run --json ./packages/ajo-backup`: passed.
- `kit start` production-like local probe: dynamic HTML had defensive headers;
  static `/assets/*.js` did not.
- Invalid JSON body probe against an action returned `500` even though
  `@polka/parse` marks parse failures as client/body errors.

The framework is ready for app-pilot use. Before production with real users or
real data, complete the phases below or explicitly update this plan when
research changes the order or scope.

## Operating Rules

Every phase must follow `AGENTS.md` Operating Principles:

- Keep code micro, simple, cohesive, robust, and readable.
- Prefer direct concrete solutions over speculative architecture.
- Remove unnecessary abstractions, compatibility fallbacks, and dead code.
- Make changes in small honest slices; leave code looking intentional.
- Read current implementation, tests, docs, migrations, and package boundaries.
- Preserve user work and never stage unrelated changes.
- Optimize after measuring.
- Test behavior, contracts, security boundaries, and regressions.
- Add short TSDoc for public APIs touched by the phase.

Every phase starts with deep research before touching code:

1. Read the relevant current implementation, tests, docs, migrations, and package
   boundaries.
2. Research current primary sources online when the phase touches security,
   deployment, build/runtime, web platform behavior, Node/Vite behavior, or
   package publishing.
3. Evaluate `ajo-kit` as a whole system: CLI, Vite plugin, SSR, client runtime,
   auth, data, demo app, tests, package exports, and docs.
4. Decide the simplest "ajo-way" solution: direct, small, robust,
   micro-implementable, and cohesive with existing package boundaries.
5. If research finds a better order, a simpler solution, a security risk, or a
   dependency between phases, update this file before changing code.
6. Keep a separate commit per phase with a clear message.

Phase closeout:

- Run focused tests during implementation.
- Run the full gate before commit unless the phase is docs-only:
  `pnpm exec tsc --noEmit`, `pnpm test:unit`, `pnpm test:e2e`, `pnpm build`.
- For security phases, also run `pnpm audit --prod` and any phase-specific
  manual probes.
- Review `git diff`.
- Commit only the phase scope.
- Summarize what changed, what passed, and any residual risk.

## Research Baseline

These sources motivated the current findings and should be refreshed when a
phase begins:

- Vite SSR guide: SSR builds, externalization, `ssr.noExternal`, and production
  server shape: https://vite.dev/guide/ssr
- OWASP Node.js Security Cheat Sheet: secure cookies and security headers:
  https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet: signed double-submit, Fetch Metadata,
  origin verification, and defense in depth:
  https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: cookie attributes, idle timeout,
  absolute timeout, renewal, and server-side expiration:
  https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Secrets Management Cheat Sheet and SAMM secret management guidance:
  https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
  https://owaspsamm.org/model/implementation/secure-deployment/stream-b/
- Express production security checklist as ecosystem cross-check for Node
  server defaults: https://expressjs.com/en/advanced/best-practice-security/
- OWASP ASVS as verification vocabulary:
  https://owasp.org/www-project-application-security-verification-standard/

Use primary sources first. If a recommendation conflicts with the current
`ajo-kit` shape, prefer the smallest design that preserves `ajo-kit` simplicity
while satisfying the real security or production requirement.

## Phase 1: Static Asset Security Headers

Finding:

- `packages/ajo-kit/src/server.tsx` applies defensive headers to dynamic
  responses.
- `packages/ajo-kit/src/node.ts` serves `dist/client` through `sirv` before
  proxying to the SSR app, so static assets currently miss framework security
  headers in `kit start`.

Research before implementation:

- Verify current `sirv` header hooks and Vite production asset expectations.
- Re-check whether static assets should receive the same baseline headers as
  dynamic responses or a narrower static-safe subset.
- Confirm HSTS behavior behind TLS/proxy with `APP_URL`.

Target:

- Share one small header helper or policy between dynamic and static production
  responses without introducing a header framework.
- Static assets served by `kit start` get at least `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, and
  production HTTPS HSTS when applicable.
- Preserve long-lived static caching only if research shows `sirv` or Vite
  already provides correct immutable behavior; otherwise do not invent caching
  in this phase.

Likely files:

- `packages/ajo-kit/src/server.tsx`
- `packages/ajo-kit/src/node.ts`
- `tests/e2e/data-flow.spec.ts` or a focused runtime/header test
- `ai/architecture.md` after implementation

Acceptance:

- Production-like `kit start` probe shows static JS/CSS assets have the intended
  headers.
- Existing dynamic header tests still pass.
- No broad middleware abstraction.

## Phase 2: Body Parser Error Mapping

Finding:

- Invalid JSON or body-size errors from `@polka/parse` can reach Polka
  `onError`.
- `normalize()` currently turns non-`Failure` errors into status `500`, so
  parse errors marked as `413` or `422` can become masked internal failures.

Research before implementation:

- Inspect `@polka/parse` current error shape and status behavior.
- Decide which status codes are safe to preserve from unknown errors.
- Confirm JSON/action/API client behavior for parse errors.

Target:

- Preserve safe HTTP status codes from parser errors and similar middleware
  errors.
- Keep production masking for `500+`.
- Return stable JSON error shapes for API/action requests.
- Avoid exposing parser internals beyond a short public message.

Likely files:

- `packages/ajo-kit/src/constants.ts`
- `packages/ajo-kit/src/server.tsx` if error handling needs small routing tweaks
- `tests/unit/packages/ajo-kit.test.ts`
- `tests/e2e/api.spec.ts` or `tests/e2e/data-flow.spec.ts`

Acceptance:

- Invalid JSON returns a client/body status, not `500`.
- Oversized JSON returns `413`.
- Production `500+` masking remains intact.

## Phase 3: Production Secret Fail-Closed

Finding:

- `packages/ajo-auth/src/verify.ts` falls back to `change-in-production` when
  `APP_SECRET` is missing.
- This is acceptable for local development ergonomics but unsafe as a
  production default.

Research before implementation:

- Review all signing and secret uses in `ajo-auth`.
- Re-check secret-management guidance and how existing tests configure env.
- Decide whether fail-closed belongs at module load, first sign/validate call,
  or app boot.

Target:

- In production, missing or placeholder `APP_SECRET` fails closed.
- Development remains ergonomic.
- Error message is explicit server-side and masked for users when it reaches
  public responses.
- Docs list production required env vars.

Likely files:

- `packages/ajo-auth/src/verify.ts`
- `packages/ajo-auth/README.md`
- `readme.md`
- `ai/architecture.md`
- unit/e2e env tests

Acceptance:

- Production without a real `APP_SECRET` cannot sign or validate verification
  links silently.
- Development tests can still run without global secret setup.

## Phase 4: Session-Bound CSRF Tokens

Finding:

- Current CSRF supports same-origin proof and a naive double-submit
  `XSRF-TOKEN` cookie plus `X-XSRF-TOKEN` header.
- OWASP recommends signed double-submit tokens bound to authenticated session
  data for new code because naive double-submit is vulnerable to cookie
  injection in some deployment shapes.

Research before implementation:

- Refresh OWASP CSRF guidance, Fetch Metadata guidance, and browser support.
- Review current cookie parsing, session middleware ordering, action/API flows,
  and unauthenticated public API behavior.
- Decide whether signed CSRF should use `APP_SECRET`, session id, a dedicated
  secret, or a small HMAC helper.
- Confirm whether `__Host-` cookie naming is viable without breaking local dev.

Target:

- Cookie-auth unsafe requests require same-origin proof or a session-bound
  signed CSRF token.
- Bearer `/api/*` requests continue to bypass CSRF.
- Unauthenticated public API requests keep intended behavior.
- Keep the middleware direct; no CSRF framework abstraction.

Likely files:

- `packages/ajo-auth/src/csrf.ts`
- `packages/ajo-auth/src/wares.ts`
- `packages/ajo-auth/src/cookie.ts` if cookie naming changes
- `tests/unit/packages/ajo-auth.test.ts`
- `tests/e2e/api.spec.ts`
- `tests/e2e/data-flow.spec.ts`
- docs after implementation

Acceptance:

- Existing CSRF coverage passes.
- Forged cross-site cookie-auth actions/API mutations fail.
- Valid same-origin and valid token flows pass.
- Token validation is bound to the current credential where applicable.

## Phase 5: Session Idle Timeout and Last-Seen Touch

Finding:

- Sessions have absolute expiry and store `last`.
- `session.touch()` exists, but the auth middleware does not currently call it.
- UI displays last activity based on stored `last`, so it can be stale.

Research before implementation:

- Review OWASP session idle timeout and renewal guidance.
- Inspect all session create, validate, revoke, password reset/change, SSE
  revalidation, and session-list flows.
- Decide the minimum config surface: constants, env vars, or no public config.
- Measure/write strategy so every request does not create needless SQLite writes.

Target:

- Enforce a server-side idle timeout for cookie sessions.
- Touch `last` at a throttled interval, not on every request.
- Keep absolute timeout semantics.
- Avoid distributed/session-store abstraction while production mode remains
  single-process SQLite.

Likely files:

- `packages/ajo-auth/src/session.ts`
- `packages/ajo-auth/src/wares.ts`
- `packages/ajo-auth/migrations/*` only if schema changes are truly needed
- session/account/admin e2e tests
- docs after implementation

Acceptance:

- Idle-expired session is rejected and cookie cleared.
- Active session touches `last` after the threshold.
- Session-list UI reflects real activity without hot write amplification.

## Phase 6: Migration Collision Safety

Finding:

- `packages/ajo-kit/src/migrate.ts` merges migration maps with
  `Object.assign({}, ...all)`.
- If app and plugin migrations share a name, one can overwrite another
  silently.

Research before implementation:

- Inspect `kysely-ctl` migration provider naming behavior.
- Review package plugin discovery and installed package layouts.
- Decide whether to namespace plugin migration keys or fail on duplicate names.

Target:

- Duplicate migration names fail loudly before running migrations, or plugin
  namespacing makes collisions impossible.
- Keep migration files simple and user-readable.
- Avoid a migration registry abstraction unless research proves it is needed.

Likely files:

- `packages/ajo-kit/src/migrate.ts`
- `packages/ajo-kit/src/discover.ts` only if provider metadata is needed
- unit tests for duplicate collision behavior
- `packages/ajo-kit/README.md`
- `ai/architecture.md`

Acceptance:

- Duplicate migration names cannot be silently skipped or overwritten.
- Existing app and plugin migrations still run in deterministic order.

## Phase 7: Template and Published Package Reality

Finding:

- `packages/template` is behind `readme.md` on JSX settings and dependency
  versions.
- Published packages intentionally ship source `.ts/.tsx` and the `kit` binary
  runs through `tsx`.

Research before implementation:

- Re-check current package publishing behavior with `npm pack --dry-run`.
- Verify a temp app can install from packed tarballs or the published packages
  without monorepo path assumptions.
- Confirm the desired JSX tsconfig shape for Ajo apps.

Target:

- Template, README, package READMEs, and packed package contents agree.
- New apps do not rely on `../ajo`, workspace aliases, or unpublished local path
  assumptions.
- Source-shipping and `tsx` CLI dependency are documented as intentional, or the
  package build changes in a measured follow-up.

Likely files:

- `packages/template/package.json`
- `packages/template/tsconfig.json`
- `packages/template/vite.config.ts`
- `readme.md`
- `packages/ajo-kit/README.md`
- `ai/LLMs.md`

Acceptance:

- A fresh template app typechecks/builds.
- `npm pack --dry-run` remains clean and small.
- README and template setup do not disagree.

## Phase 8: Production Mode Statement

Finding:

- Topic versions, SSE fanout, and rate limiting are in-memory per process.
- This is simple and coherent for single-process SQLite production, but not for
  multi-instance deployments.

Research before implementation:

- Evaluate whether the first supported production mode is explicitly
  single-process Node + SQLite.
- Review rate-limit needs for login/register/forgot/confirm/token endpoints.
- Consider whether external rate limiting belongs to `ajo-auth`, app code,
  reverse proxy, or later multi-instance work.

Target:

- State the supported production topology clearly.
- Keep in-memory rate limiting and topic versions if single-process is the
  intended first production mode.
- If multi-instance support is needed now, define the smallest shared adapter
  after research; do not add a speculative distributed abstraction.

Likely files:

- `readme.md`
- `ai/architecture.md`
- `ai/LLMs.md`
- maybe `packages/ajo-auth/README.md`

Acceptance:

- Docs make it impossible to accidentally assume multi-instance coherence.
- Any code changes are justified by a concrete production topology decision.

## Phase 9: Production Smoke and Release Gate

Finding:

- The normal full suite is green, but production readiness needs a repeatable
  smoke that exercises built output.

Research before implementation:

- Review Playwright webServer support for built server smoke.
- Check whether smoke should live in e2e or as a separate script.
- Keep it fast enough to run before release.

Target:

- Add a small production smoke path for `pnpm build` + `kit start`.
- Probe logged-out SSR, static asset headers, invalid JSON error mapping,
  login route, and one route JSON request.
- Keep full browser e2e as the behavioral suite; smoke is deploy sanity, not a
  duplicate test suite.

Likely files:

- `package.json`
- `tests/e2e` or `tests/production`
- `playwright.config.ts` only if needed
- docs

Acceptance:

- One command can verify the built app's production serving behavior.
- It fails on the regressions found in this plan.

## Phase 10: Final Documentation Sync

Research before implementation:

- Re-read `AGENTS.md`, `readme.md`, package READMEs, `ai/architecture.md`,
  `ai/LLMs.md`, and this file.
- Compare docs against the implemented code and tests.

Target:

- `ai/architecture.md` reflects final implemented architecture.
- `readme.md` explains production setup for humans.
- `ai/LLMs.md` explains app-building constraints for AI agents.
- Package READMEs do not contradict root docs.
- This file marks completed phases or is replaced by a concise residual
  follow-up list.

Acceptance:

- Documentation is DRY: architecture for implementation contracts, README for
  human app builders, LLMs for agents, this file for remaining production plan.
- `git diff --check` passes.

## Out of Scope Until Research Reopens It

- Multi-process topic bus or distributed rate limiter before choosing a
  multi-instance production topology.
- Complex config system for every auth/security knob.
- Full CSP allow-list for arbitrary app assets before a real app needs it.
- Serverless/edge runtime support.
- Replacing SQLite before measurement shows it is the bottleneck.
- Pre-rendering/SSG.
- Normalized client cache or implicit data tracking.

## Completion Criteria

`ajo-kit` is production-ready for the first real app when:

- All phases are implemented or this plan records why a phase was changed,
  merged, postponed, or made unnecessary by research.
- Full verification passes.
- Security phases have targeted tests and manual production-like probes.
- Docs describe required production env vars, supported topology, package setup,
  and deployment assumptions.
- No temporary hacks, stale compatibility paths, or contradictory docs remain.
