# Ajo Auth Ability Plan

Last updated: 2026-06-21
External references last checked: 2026-06-21

This document records the authorization research and implementation plan for
moving `ajo-auth` from user roles as authorization checks to user abilities as
the authorization surface.

It is a planning document, not the current architecture contract. Current
runtime behavior remains in `ai/architecture.md` until implemented.

## Compatibility Stance

`ajo-kit` is not in production yet, so backward compatibility is not a design
constraint for this refactor.

Prefer the smallest cohesive final surface over migration shims, compatibility
aliases, fallback behavior, or public APIs that only exist because of the
current implementation. The goal is a metaframework that feels designed as one
piece, not an accumulated development trail.

Refactors are acceptable when they reduce total code surface, remove duplicate
concepts, improve authorization guarantees, and keep the framework simple,
robust, reliable, performant, and elegant.

## Goal

Make authorization in `ajo-kit` explicit, small, auditable, and production
ready:

- Application code checks abilities, not role names.
- Roles remain named bundles of abilities for assignment and admin display.
- The built-in `admin` role grants full access with `["*"]`.
- Bearer tokens never authorize more than the current user account can do.
- Cookie sessions and bearer API requests use the same ability vocabulary.
- Object ownership and field-level filtering remain close to data reads/writes.
- Public auth APIs expose the final cohesive model only; compatibility helpers
  are removed instead of carried forward.
- The implementation stays direct and local; no external policy engine is added
  before the app has multi-tenant or cross-service authorization needs.

## Current Local Baseline

The repo currently has two authorization models:

- User roles are stored in `roles` and `members`.
- User resolution in `packages/ajo-auth/src/wares.ts` loads `req.user.roles`.
- Admin browser routes use `auth.role('admin')`.
- App UI checks `user.roles?.includes('admin')`.
- Bearer API tokens store JSON `abilities` in `tokens.abilities`.
- `packages/ajo-auth/src/token.ts` already supports exact abilities,
  resource wildcards such as `tokens:*`, and full wildcard `*`.
- `auth.authorize(req, ...)` only restricts bearer tokens today. Cookie-session
  requests pass once authenticated.
- `/api/login` currently mints `["*"]` tokens for every valid user.
- `src/abilities.ts` already has a useful app ability vocabulary and grouped
  UI metadata.

Important current files:

- `packages/ajo-auth/migrations/0000_auth_initial.ts`
- `packages/ajo-auth/migrations/0000_auth_tokens.ts`
- `packages/ajo-auth/src/wares.ts`
- `packages/ajo-auth/src/guard.ts`
- `packages/ajo-auth/src/token.ts`
- `packages/ajo-kit/src/constants.ts`
- `src/abilities.ts`
- `src/(app)/admin/wares.ts`
- `src/(public)/login/handler.ts`
- `src/(app)/account/tokens/handler.ts`
- `src/(app)/tokens/handler.ts`

## Research Summary

The strongest pattern across current framework docs and security guidance is:
roles are useful for assignment and administration, but application code should
authorize named actions or permissions.

OWASP is the clearest source for this direction. The Authorization Cheat Sheet
recommends least privilege, deny-by-default behavior, validation on every
request, server-side checks, logging, and tests. OWASP Proactive Controls also
warns against hard-coded role checks in application code and recommends checking
feature or access names instead. OWASP ASVS 5 V8 makes the same idea testable:
authorization rules should be documented and should cover function-level,
data-specific, and field-level access.

API-specific OWASP guidance matters for `ajo-kit` because bearer tokens and
route actions can expose object IDs. API1:2023 BOLA says every endpoint that
accepts an object ID needs object-level checks. API3:2023 BOPLA says response
and write fields must be deliberately selected. That maps directly to Ajo's
existing explicit `select([...])`, route loaders, actions, and DTO-like return
objects.

NIST SP 800-162 describes ABAC as decisions made from subject attributes,
object attributes, operations, and sometimes environment context. Ajo does not
need enterprise ABAC now, but this validates the shape: abilities cover the
operation, while route/data code supplies object ownership and state checks.

Mainstream frameworks converge on ability-like checks:

- Laravel has gates for action checks and policies for model/resource checks.
  Sanctum stores per-token abilities/scopes.
- Django has permissions assigned directly to users and groups; groups are a
  bundle/assignment mechanism, not the only authorization surface.
- Django REST Framework runs permission checks before view code and supports
  object-level permissions.
- Spring Security stores granted authorities on the authenticated principal,
  then authorization managers read those authorities.
- ASP.NET Core roles are available, but role and claim checks are expressed
  through reusable policies and requirements.
- FastAPI models OAuth2 scopes as permission strings and leaves actual
  enforcement in application code.
- Google Cloud IAM and GitHub fine-grained PATs both show the production value
  of explicit permissions, minimal grants, resource boundaries, and expiration.

Policy engines and ReBAC systems are useful references but not the right first
implementation for this repo:

- OpenFGA models roles as relations and permissions as checks, which supports
  the chosen direction.
- Zanzibar proves the model at very large scale, but its global consistency and
  relationship tuple service are not needed for the current one-process Ajo
  topology.
- Casbin supports many models, but adding a policy language would violate the
  current preference for small inspectable package internals.

## Recommended Model

Use roles as named ability bundles.

```text
roles.name       -> admin, user, future app-defined bundle names
roles.abilities  -> JSON string array, e.g. ["*"] or ["profile:read"]
members          -> user-to-role assignment
req.user.roles   -> labels for admin/display only
req.user.abilities -> effective account abilities
req.token.abilities -> bearer token grant boundary
```

Authorization checks use abilities:

```ts
auth.authorize(req, 'admin:read')
auth.ability('tokens:create')
auth.can(req.user?.abilities ?? [], 'admin:write')
```

Do not use role names for new authorization checks:

```ts
// Avoid in authorization logic:
req.user.roles?.includes('admin')
auth.role('admin')
```

Remove `role()` from the final public API once the app has moved to ability
checks. Do not keep a compatibility alias.

## Ability Vocabulary

Keep the vocabulary app-owned in `src/abilities.ts`. The auth package should
understand the matching semantics, not the app's full list of valid names.

Current vocabulary is close:

```ts
tokens:read
tokens:create
tokens:delete
sessions:read
sessions:delete
profile:read
profile:update
chats:read
chats:create
chats:send
admin:read
admin:write
```

Recommended addition:

```ts
profile:delete
```

Reason: account deletion is materially different from profile update and should
be independently checkable.

Recommended standard roles:

```json
{
  "admin": ["*"],
  "user": [
    "profile:read",
    "profile:update",
    "profile:delete",
    "sessions:read",
    "sessions:delete",
    "tokens:read",
    "tokens:create",
    "tokens:delete",
    "chats:read",
    "chats:create",
    "chats:send"
  ]
}
```

`admin:*` remains useful for UI token selection, but the admin role itself
should use `["*"]` so future abilities are covered intentionally by the root
administrator role.

## Matching Rules

Keep matching small and predictable:

- `*` matches every ability.
- Exact grant matches exact required ability.
- `<resource>:*` matches any ability whose first segment is `<resource>`.
- Unknown ability strings do not match unless explicitly present or covered by
  wildcard.
- Missing user abilities are `[]`, not full access.
- No negative/deny grants in this slice.

The current wildcard behavior in `token.can()` is a good base. It should move
to a generic `ability` helper so users and tokens share the same semantics.

## Effective Authorization

The effective permission set depends on the credential:

```text
cookie session -> user abilities
bearer token   -> user abilities AND token abilities
```

This has three important security properties:

- A token cannot exceed the current account.
- Revoking or changing a user's role bundle applies on the next request because
  `wares.session()` resolves the user from the database.
- A token's own grant can still be narrower than the account and can be revoked
  independently.

Do not treat `req.token.abilities` as sufficient by itself. A bearer token is a
credential boundary inside the account boundary, not a replacement for account
authorization.

## Token Issuance Policy

Change token creation from "default full access" to "explicit, bounded access".

Rules:

- Low-level `token.create()` should not silently default to `["*"]` for new
  call sites. Prefer a required `abilities` argument or a default of `[]`.
- `/api/login` must stop minting `["*"]` for every user.
- If `/api/login` keeps an omitted-abilities default, grant the compact current
  account abilities at issuance time. This avoids automatic future expansion if
  the account later receives new abilities.
- If an admin explicitly requests `["*"]`, allow it only because the current
  account has `*`.
- API token creation must validate the requested abilities against both:
  - current user abilities
  - current bearer token abilities, when the caller is using bearer auth
- Account UI token creation should show only abilities the current user can
  grant. For admin, show full access as `*`.
- Existing stored tokens with `["*"]` are still bounded by current user
  abilities after the guard refactor.

This mirrors the practical lessons from OAuth scopes, Laravel Sanctum token
abilities, GitHub fine-grained PATs, and cloud IAM session boundaries.

## Object And Field Authorization

Abilities are function-level gates. They do not replace data-specific checks.

Use this pattern:

```ts
auth.authorize(req, 'tokens:delete')

const token = await db()
  .selectFrom('tokens')
  .select(['id', 'user'])
  .where('id', '=', id)
  .executeTakeFirst()

if (!token || token.user !== req.user!.id) throw new Missing('Token not found')
```

For self-owned pages, prefer queries constrained by `req.user.id` instead of
fetching arbitrary rows and checking later.

For admin pages:

- `admin:read` gates list/detail reads.
- `admin:write` gates administrative mutations such as revoking another user's
  token.
- Admin response objects should still select and return only fields needed by
  the UI.

Do not add a generic object-policy engine yet. If organizations, teams,
resource sharing, or cross-tenant rules arrive, add a separate plan for
resource relations or ABAC/ReBAC.

## Schema Plan

Use the smallest schema change that fits the current product:

```ts
roles.abilities text not null default '[]'
```

Store JSON arrays in the same style as `tokens.abilities`.

Migration behavior:

- Add `roles.abilities`.
- Set `admin` to `["*"]`.
- Set `user` to the standard user ability list.
- Leave unknown/custom roles as `[]` unless an app migration updates them.
- Keep `roles.name` unique.
- Keep `members` unchanged.

Alternative rejected for this slice:

- `abilities`, `role_abilities`, and `user_abilities` tables.

Reason: those tables are more flexible and indexable, but the current app has a
tiny ability vocabulary, no admin role editor, and no measured need for direct
per-user grants. JSON arrays are already used for bearer tokens and keep the
first implementation small.

## Public API Shape

Recommended package-level helpers:

```ts
export type Ability = string

export function can(grants: Ability[], required: Ability): boolean
export function all(grants: Ability[], required: Ability[]): boolean
export function compact(grants: Ability[]): Ability[]
export function merge(...sets: Ability[][]): Ability[]
export function intersect(a: Ability[], b: Ability[]): Ability[]
export function authorize(req: Request, ...required: Ability[]): void
export const ability: (...required: Ability[]) => Middleware
```

`compact()` should remove redundant exact grants covered by a resource wildcard
or full wildcard. `intersect()` must preserve wildcard semantics, not only exact
string overlap.

Public types:

```ts
interface User {
  id: number
  roles?: string[]
  abilities?: string[]
  [key: string]: unknown
}
```

Add short TSDoc to public helpers because `@kit/auth` is a public API.

## Micro Implementation Plan

### Slice 1: Generic Ability Helpers

Scope:

- Move `can()` and `all()` semantics out of `token.ts` into a generic helper.
- Remove duplicate token-local ability helpers instead of keeping compatibility
  reexports. `token.ts` should use the generic helper internally.
- Add `compact()`, `merge()`, and `intersect()`.
- Unit test exact grants, resource wildcards, full wildcard, compacting, and
  token/user intersection.

Out of scope:

- Database migrations.
- App route changes.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
```

### Slice 2: Role Bundles In Database

Scope:

- Add a migration for `roles.abilities`.
- Update `packages/ajo-auth/src/types.ts`.
- Update seed data in `db/seeds/sample.ts` and `tests/e2e-server.ts`.
- Update the default user resolver in `wares.ts` to return both `roles` and
  compact merged `abilities`.
- Treat invalid/malformed role ability JSON as fail-closed, not full access.

Out of scope:

- Changing guards.
- Replacing app UI checks.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
```

### Slice 3: Guard Semantics

Scope:

- Change `authorize(req, ...required)` to require the user account abilities.
- If `req.token` exists, require the token abilities too.
- Keep error shape stable enough for current API tests:
  `Missing ability: <name>`.
- Change `ability(...required)` to use the new `authorize()`.
- Remove `role()` from `@kit/auth` and update all local callers in the same
  refactor window.

Out of scope:

- Token issuance changes.

Security tests:

- Cookie session without required ability gets 403.
- Cookie session with required ability passes.
- Bearer token with required token grant but missing user grant gets 403.
- Bearer token with user grant but missing token grant gets 403.
- Bearer token with both grants passes.
- Role downgrade applies on next request.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
```

### Slice 4: App Authorization Migration

Scope:

- Replace `src/(app)/admin/wares.ts` with `auth.ability('admin:read')`.
- Add handler-local `admin:write` checks to admin mutations.
- Replace `roles.includes('admin')` UI checks with ability checks.
- Add `profile:delete` and gate account deletion.
- Keep role labels only for display, not access decisions.
- Update dashboard/admin text from "roles" where it now means abilities or
  access.

Out of scope:

- Admin role editor UI.
- Direct per-user grants.

Gate:

```bash
rg -n "role\\(|roles\\?\\.includes|roles\\.includes|auth\\.role" src packages tests
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
```

Expected remaining role hits after this slice should be limited to resolver,
schema/types, seed/migration, docs describing role bundles, and display-only
labels.

### Slice 5: Token Creation Boundaries

Scope:

- Stop `/api/login` from creating `["*"]` for every user.
- Add optional requested abilities to API login, or default to compact current
  user abilities.
- Ensure token creation from cookie sessions cannot request abilities outside
  the user account.
- Ensure token creation from bearer requests cannot request abilities outside
  user abilities or current bearer abilities.
- Update account token UI to only offer grantable abilities.
- Decide whether a non-admin "select all" stores the explicit current account
  abilities instead of `["*"]`.

Recommended default:

- Store explicit compact current account abilities for non-admin "all".
- Store `["*"]` only when the account has `*` and the request explicitly asks
  for full access.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm test:prod
```

Security scenarios:

- Normal API login cannot call admin endpoints.
- Admin API login can call admin endpoints only when those endpoints are API
  endpoints and the token/user both allow admin ability.
- Limited token cannot mint broader token.
- User role upgrade does not automatically expand old non-admin tokens that
  stored explicit abilities.
- User role downgrade immediately limits old tokens even if they stored `*`.

### Slice 6: Docs And Contract Cleanup

Scope:

- Update `readme.md`, `packages/ajo-auth/README.md`, `ai/architecture.md`, and
  `ai/LLMs.md`.
- Document roles as bundles and abilities as checks.
- Document token/user ability intersection.
- Remove public `role()` documentation and examples.
- Keep `ai/auth.md` as the historical plan and move implemented truth to
  `ai/architecture.md`.

Gate:

```bash
rg -n "role\\(|roles\\?\\.includes|roles\\.includes|checks token abilities \\(when bearer token is present\\)|\\[\"\\*\"\\]" readme.md packages ai src tests
git diff --check
```

### Slice 7: Full Verification

Run the full gate for framework, security, data-flow, runtime, and
cross-package changes:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm test:prod
```

Manual security checks:

- Login as normal user, confirm admin nav is absent and `/admin` is forbidden.
- Login as admin, confirm admin nav is present and `/admin` works.
- Create a normal user's token with only `tokens:read`; verify create/delete
  token API calls fail.
- Create a token while authenticated with a limited bearer token; verify broader
  requested abilities fail.
- Change a user's role bundle; verify the next session and bearer requests use
  the new account abilities.
- Revoke a role or token; verify SSE/account/admin views do not leak stale
  privileged data after revalidation.
- Confirm account deletion is gated by `profile:delete` and still rejects admin
  self-deletion.

## Risk Notes

- The main risk is accidentally treating bearer token abilities as enough. They
  must be intersected with current user abilities.
- The second risk is preserving current cookie-session behavior where
  `authorize()` does nothing. This must change.
- The third risk is letting `["*"]` escape as the default token grant for
  normal users.
- The fourth risk is replacing role checks in UI but missing route wares or
  handler-local mutation checks. Server checks are the source of truth.
- The fifth risk is field-level leakage from admin or account loaders. Keep
  explicit `select([...])` and explicit return objects.

## Non-Goals For The First Implementation

- No external policy engine.
- No ReBAC tuple service.
- No general ABAC DSL.
- No negative/deny policies.
- No per-user direct grants table.
- No admin role editor UI.
- No JWT/self-contained permission metadata.
- No multi-process/distributed authorization cache.

These can be reconsidered if the product adds organizations, teams, shared
resources, customer-defined roles, or multi-instance deployment.

## Online Sources

Security standards and guidance:

- OWASP Authorization Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Top 10 A01 Broken Access Control:
  https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/
- OWASP API Security API1:2023 BOLA:
  https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
- OWASP API Security API3:2023 BOPLA:
  https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/
- OWASP ASVS 5 V8 Authorization:
  https://github.com/OWASP/ASVS/blob/master/5.0/en/0x17-V8-Authorization.md
- OWASP Proactive Controls C7 Enforce Access Controls:
  https://top10proactive.owasp.org/archive/2018/c7-enforce-access-controls/
- NIST SP 800-162 ABAC:
  https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-162.pdf
- OAuth 2.0 RFC 6749 scope semantics:
  https://datatracker.ietf.org/doc/html/rfc6749

Framework and platform references:

- Laravel authorization gates and policies:
  https://laravel.com/docs/13.x/authorization
- Laravel Sanctum token abilities:
  https://laravel.com/docs/13.x/sanctum
- Django permissions and groups:
  https://docs.djangoproject.com/en/6.0/topics/auth/default/
- Django REST Framework permissions:
  https://www.django-rest-framework.org/api-guide/permissions/
- Spring Security authorization architecture:
  https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html
- ASP.NET Core role authorization:
  https://learn.microsoft.com/en-us/aspnet/core/security/authorization/roles?view=aspnetcore-10.0
- ASP.NET Core policy authorization:
  https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies?view=aspnetcore-10.0
- FastAPI OAuth2 scopes:
  https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/
- Next.js authentication guide:
  https://nextjs.org/docs/app/guides/authentication
- Next.js data security guide:
  https://nextjs.org/docs/app/guides/data-security
- SvelteKit auth guide:
  https://svelte.dev/docs/kit/auth

Fine-grained authorization references:

- OpenFGA roles and permissions:
  https://openfga.dev/docs/modeling/roles-and-permissions
- OpenFGA custom roles:
  https://openfga.dev/docs/modeling/custom-roles
- Zanzibar paper:
  https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/
- Apache Casbin:
  https://casbin.apache.org/
- Kubernetes RBAC:
  https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- AWS IAM policy actions:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html
- AWS IAM policies and permissions:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html
- Google Cloud IAM roles and permissions:
  https://docs.cloud.google.com/iam/docs/roles-overview
- GitHub fine-grained PAT permissions:
  https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- GitHub PAT management:
  https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
