# Ajo Kit Architecture

Last updated: 2026-06-26

This is the canonical architecture document for `ajo-kit`. It describes the
current implementation and operating contracts for the framework, app runtime,
data flow, SSR, actions, APIs, auth, security, persistence, build, and tests.
It is factual: no historical phase log, migration story, or future roadmap is
included here.

## Operating Principles

`ajo-kit` is a small full-stack metaframework for Ajo. The implementation is
kept direct and explicit:

- Server loaders own durable application state.
- Components render server data from `args.data`.
- Live data is explicit through `req.track(topic)` and `emit(topic)`.
- Protocol boundaries stay small and stable.
- Public package surface is narrow.
- Security policy is route-owned where possible and credential-aware where
  needed.
- Measurements justify performance changes; speculative architecture is avoided.
- Tests protect behavior, security contracts, and regression boundaries.

Do not reintroduce implicit table tracking, normalized client stores, broad data
framework abstractions, or compatibility fallbacks that are not part of the
current local-project contract.

## Package Boundaries

| Package | Alias | Responsibility |
|---|---|---|
| `packages/ajo-kit` | `@kit`, `@kit/*` | Framework core, SSR, routing, data flow, database, validation, mail, build/runtime CLI |
| `packages/ajo-auth` | `@kit/auth` | Sessions, API tokens, passwords, reset/verify/confirm flows, CSRF, guards, auth migrations |
| `packages/ajo-backup` | none | Google Drive backup tooling |

Public app-facing imports and signatures are documented in `readme.md`. This
architecture document only records package boundaries when they affect runtime
design. Internal app runtime, route discovery, and migration helpers are not
public subpaths. The CLI can use those internals directly.

## Core Files

| File | Role |
|---|---|
| `packages/ajo-kit/src/index.ts` | Curated universal root API for `@kit` / `ajo-kit` |
| `packages/ajo-kit/src/server.tsx` | Polka SSR runtime, route wares/loaders/actions/API dispatch, JSON route data, route freshness, SSE fanout, `send`, `emit` |
| `packages/ajo-kit/src/app.tsx` | Client router, route resolution, JSON navigation, route cache use, SSE live updates |
| `packages/ajo-kit/src/client.tsx` | Hydration, SSR boot read, `action()` helper |
| `packages/ajo-kit/src/cache.ts` | Private bounded client route cache helpers |
| `packages/ajo-kit/src/freshness.ts` | Route hashes, topic normalization, topic versions, freshness parsing |
| `packages/ajo-kit/src/head.tsx` | Head merge/render/apply helpers |
| `packages/ajo-kit/src/headers.ts` | Shared defensive response header policy |
| `packages/ajo-kit/src/ssr.ts` | SSR boot payload serialization/parsing and data-script rendering |
| `packages/ajo-kit/src/constants.ts` | Shared public/internal types, errors, request helpers, auth request extensions, formatting |
| `packages/ajo-kit/src/vite.ts` | Vite plugin, virtual route modules, aliases, server-only guard, HMR, native externalization |
| `packages/ajo-kit/src/node.ts` | `kit dev`, `kit build`, `kit start`, HTML template compiler, listener |
| `packages/ajo-kit/src/database.ts` | SQLite connection and Kysely instance |
| `packages/ajo-kit/src/timing.ts` | `AJO_TIMING=1` measurement helpers |
| `packages/ajo-auth/src/wares.ts` | Session/bearer auth and CSRF middleware |
| `packages/ajo-auth/src/guard.ts` | Redirect, auth, ability, confirmation, verified guards |

## Build and Runtime

### Vite Plugin

`kit()` provides the app integration:

- `virtual:ajo/routes` exposes `import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}')`.
- `virtual:ajo/handlers` exposes handler and ware globs.
- `@kit` and `@kit/*` resolve to `ajo-kit` public subpaths.
- Plugin aliases from discovered packages map exact `@kit/<alias>` roots to package names.
- Server-only modules are blocked from the client graph.
- Page/layout modules receive Ajo HMR metadata in dev.
- Native modules such as `better-sqlite3` and `argon2` are externalized as
  `file://` URLs so production SSR bundles run on Windows ESM.

Default `guard` patterns include:

- route `handler` and `wares` files
- `/src/data/`
- discovered plugin packages marked `serverOnly`

Custom `guard` patterns are additive, not replacements.

### CLI Runtime

`kit dev`:

- Creates a Polka app.
- Runs Vite in middleware mode.
- Loads the SSR server through `vite.ssrLoadModule('ajo-kit/server')`.
- Compiles the HTML template and proxies requests to the current inner server.
- Reloads server routes on handler/wares/page/layout change, add, or unlink.
- Sends full reload for page/layout changes.

`kit build`:

- Builds `dist/client` with Vite.
- Builds `dist/server/server.js` using `ajo-kit/server` as the SSR entry.

`kit start`:

- Loads `dist/server/server.js` with a `file://` URL.
- Reads `dist/client/index.html`.
- Compiles SSR slots.
- Serves static client assets through `sirv`.
- Applies shared defensive headers to static client assets.
- Proxies dynamic requests to the built server.

`listen(app, port, { strict })` starts an HTTP server. In normal mode it tries
the next port on `EADDRINUSE`; in strict mode it rejects so e2e startup is
deterministic.

`ajo-kit/server` is the SSR runtime entry for the kit CLI/Vite build and the
server-only helper module for route handlers. App code imports `send` and
`emit` from `@kit/server`; `create()` is the runtime factory used by
`ajo-kit/node`.

### HTML Template

The HTML template uses slot comments:

```html
<!-- ssr:head -->
<!-- ssr:data -->
<!-- ssr:root -->
```

`compile(html)` splits on those markers and replaces missing slots with an empty
string. The default template includes a non-executable SSR data slot and a
client module script for `/src/client`.

## Routing Model

Routes are filesystem based:

- `page.tsx`: Ajo UI component.
- `layout.tsx`: nested layout component.
- `handler.ts`: server data loaders, actions, head loaders, and API handlers.
- `wares.ts`: middleware for a route subtree.

Examples:

- `src/(app)/dashboard/page.tsx` maps to `/dashboard`.
- `src/(app)/account/profile/page.tsx` maps to `/account/profile`.
- `src/(public)/reset/[token]/page.tsx` maps to `/reset/:token`.

Route groups such as `(app)` do not appear in URLs. Dynamic segments use
`[id]`; splats use `[...]`.

Handler exports:

```ts
export async function layout(req: Request, parent: Parent) {}
export async function page(req: Request, parent: Parent) {}
export async function head(req: Request, parent: Parent) {}
export const actions = { name: async (req, res) => {} }
export default { get, post, put, patch, delete, options, head }
```

Page and layout UI modules can export `pending = true`. During client
navigation, the page receives `loading=true` first; otherwise the innermost
pending layout receives it. This only controls loading UI ownership, not loader
execution or fetch timing.

`default` method handlers are mounted under `/api/<route>`. Page GET routes run
route middleware and loaders, but do not run the JSON body parser. Page POST
actions and API handlers run the JSON parser.

Ancestor route wares are collected for both page routes and API routes. This is
the authorization boundary for route subtrees. Keep subtree-specific checks in
`wares.ts` so loaders, actions, and API handlers share the same boundary.

## Loader Execution and Parent Data

The server executes layout loaders and the page loader through a small deferred
parent chain. This preserves parallel loader execution while allowing a child
loader to await `parent()` when it needs merged ancestor data.

Rules:

- Layouts own cross-route data.
- Pages return route-specific data.
- Use `parent()` only where it removes real duplicate reads or payload fields.
- Do not serialize duplicated user/account data just because it is convenient.

Current ownership:

- Root layout owns shell concerns.
- `(app)` layout owns authenticated user snapshot, roles, abilities, and mutable
  profile shell fields.
- Dashboard and profile reuse app-layout user data through `parent()`.
- Admin and account list pages keep bounded route-specific data.

`head()` loaders return the compact `Head` contract:

```ts
type Head = {
  title?: string
  meta?: Meta[]
  link?: Link[]
}
```

`description` and `canonical` are represented as regular `meta` and `link`
entries instead of derived fields.

## SSR and Hydration

### SSR Request

SSR runs route wares and loaders, resolves the Ajo component tree, renders HTML,
and embeds one initial route state in a data script:

```html
<script type="application/json" id="__SSR__">...</script>
```

The boot state contains:

- `url`
- `params`
- `data`
- `head`
- `hash`
- `topics`
- `versions`
- serialized error data when rendering an error route

The client reads this script during boot, parses it, stores it as the initial
route state, and renders without refetching the same route.

### Serialization Boundary

Only SSR boot data uses `devalue.stringify` and `devalue.parse` through
`packages/ajo-kit/src/ssr.ts`. This protects the script-tag boundary from values
such as `</script>` while still supporting values JSON cannot represent.

Route JSON, actions, SSE payloads, and public API responses remain plain JSON.
Handlers should keep those transport values JSON-compatible.

### Headers

Dynamic route HTML and JSON use:

- `Cache-Control: no-store`
- `Vary: Accept, Cookie`
- correct `Content-Type`

Global defensive headers are applied before route handling:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Content-Security-Policy: frame-ancestors 'none'`
- `Strict-Transport-Security` only in production when `APP_URL` is HTTPS

`kit start` applies the same defensive header policy to static client assets
served from `dist/client`.

HTML SSR does not use route-data `304`. JSON route-data requests can return
`304` with cache/freshness headers.

## Client Runtime

The client runtime uses `navaid` for routing and Ajo generator components for
stateful UI.
After hydration/boot, it marks `html[data-ajo-ready="true"]` so e2e automation
can wait for the app runtime without guessing network timing.

Navigation flow:

1. The router picks a page config from discovered pages.
2. `resolve()` loads the page/layout modules and yields a loading state when
   needed.
3. The client requests route JSON unless SSR initial state or server-side render
   data is already available.
4. Successful state updates `head`, route cache metadata, and active state.
5. The composed component tree renders from mutable route state.

The active route can be refreshed without a full navigation. SSE and action
fallback mutate the active state and call `this.next()` so the existing composed
route renders from current data.

HMR stores updated modules in `globalThis.__MODULES__`, clears Ajo generator and
memo state for affected DOM subtrees, and reruns the router.

## Route Data and Freshness

`ajo-kit` uses server-owned route data and explicit topic freshness.

A successful SSR or JSON route response includes:

- `head`
- `data`
- `hash`
- `topics`
- `versions`

JSON navigation sends:

- `Accept: application/json`
- `X-Have: <hash>` when the URL is cached
- `X-Ajo-Versions: {...}` when the URL has topic version metadata
- `credentials: include`
- `cache: no-store`

Server responses:

- `200` and `X-Ajo-Cache: miss` when loaders ran and data changed or was not
  cached by the client.
- `304` and `X-Ajo-Cache: fresh` before loaders when the client's topic
  versions prove the cached route is current.
- `304` and `X-Ajo-Cache: revalidated` after loaders when topic versions were
  stale but the recomputed route hash matches.

Route hashes are derived from `{ head, data }`. Topic versions are in-memory per
server process and incremented by `emit()`.

Wares and auth run before early `304`, so loader work is skipped only after the
route security boundary has passed.

## Client Route Cache

The route cache is private to `packages/ajo-kit/src/cache.ts` and accessed only
through helpers.

Policy:

- URL-keyed state cache.
- Max entries: 50.
- TTL: 5 minutes.
- Topic invalidation removes only intersecting routes.
- Invalidation without topics clears the cache.
- The active URL is protected from eviction during `set` pruning.

The cache is not a normalized store. Components render from active route state,
not from long-lived client mirrors.

## Live Updates

### Tracking

A loader opts into live updates by tracking every topic it reads:

```ts
export async function page(req: Request) {
  req.track?.('admin:users')
  return { users: await listUsers() }
}
```

### Emitting

Mutations call `emit(topic | topic[])` after durable writes commit:

```ts
const id = await db().transaction().execute(async trx => {
  return createdId
})

emit(['admin:users', `user:${id}`])
```

`emit()` normalizes topics, increments topic versions, records action-local
emitted topics through `AsyncLocalStorage`, and schedules a debounced SSE
revalidation pass.

### SSE Revalidation

Each live connection stores:

- original request
- auth mode label
- tracked topics
- current route hash
- route revalidation function
- route-ware verification function
- send/close hooks

When topics change, affected connections are filtered by topic intersection and
revalidated with a small concurrency limit.

Before loaders run, the server re-runs the same route wares through a probe
response. Auth middleware clears stale `req.user`, `req.session`, and
`req.token` before validating the current credential. If wares fail, redirect,
throw, or stop before `next()`, the SSE stream closes and private loaders do not
run.

If loaders produce the same route hash, no live payload is sent. If the hash
changes, SSE sends one root route payload:

```json
{
  "data": [head, ...entries],
  "hash": "...",
  "topics": ["..."],
  "versions": { "...": 1 }
}
```

The client writes that payload into active route state, applies head updates,
refreshes active route cache metadata, and re-renders.

SSE uses browser reconnection behavior. Heartbeats are comments. The client does
not parse heartbeat comments or maintain a second raw data document.

## Actions

Route actions are browser/SPAs mutations scoped to the current route:

```ts
export const actions = {
  async name(req: Request) {
    return { ok: true }
  }
}
```

The client uses:

```tsx
import { action } from '@kit/client'

const form = action<{ ok: true }>('name')
```

`action('name')` posts JSON to:

```txt
POST /current/route?/name
```

No name uses the `default` action.

The `action()` helper:

- serializes form data to JSON, preserving repeated field names and known array
  fields
- sends `credentials: include`
- sends `Accept: application/json`
- aborts previous in-flight invocation for the same action state
- exposes `loading`, `data`, `error`, `submit`, `invoke`, and `reset`
- navigates on `{ redirect }`
- dispatches `ajo:action` with returned metadata

JSON action success responses include returned body fields plus emitted
`topics` and current `versions` when topics were emitted. The client invalidates
matching cached URLs. If the action did not redirect and changed topics
intersect the active route topics, the client waits briefly for SSE when open;
if no SSE update lands, it refreshes the active route via JSON.

Actions are cookie-session browser flows. Bearer tokens do not authenticate
route-action URLs.

## API Handlers

`handler.ts` default exports define `/api/*` method handlers:

```ts
export default {
  async get(req: Request, res: Response) {},
  async post(req: Request, res: Response) {},
}
```

Supported keys:

- `get`
- `post`
- `put`
- `patch`
- `delete`
- `options`
- `head`

A file route such as `src/(app)/tokens/handler.ts` maps to `/api/tokens`.
API handlers own their response and should use `send(res, status, payload)` from
`@kit/server`.

API handlers and actions both receive `req.user` after auth middleware, but they
have different credential policy:

- Actions are browser route flows: cookie session plus CSRF.
- `/api/*` supports bearer tokens for external clients.
- If an `/api/*` request has both session cookies and an explicit Bearer token,
  the Bearer credential wins.
- Bearer token requests bypass CSRF because browsers do not attach bearer tokens
  automatically.
- Cookie-auth unsafe requests require CSRF, including `/api/*`.
- Unauthenticated public API requests can skip CSRF and return their intended
  auth/public response.

Protected API methods enforce abilities close to the method they protect.
`ability(...)` and `authorize(...)` require matching account abilities. Bearer
requests must also carry the required abilities on the presented token, so the
effective permission is account grants intersected with token grants.

Abilities are function-level gates. They do not replace object ownership or
field-level authorization; constrain self-owned queries by `req.user.id`, use
explicit selects, and keep admin response objects limited to fields the UI
needs.

Current app ability vocabulary is resource-action based:

- `profile:*`
- `sessions:*`
- `tokens:*`
- `chats:*`
- `admin:*`

Bearer token creation cannot request abilities outside the account grants or,
when the caller is a bearer token, outside the caller token's coverage. A full
access request from a non-admin account expands to that account's grantable
abilities instead of minting literal `*`.

## Auth and Security

### Middleware Stack

Root wares configure auth:

```ts
import { configure, wares } from '@kit/auth'
import { db } from '/src/data'

configure(() => db())

export default [wares.session(), wares.csrf]
```

`session()` clears prior request auth state, then validates:

1. Bearer token only for `/api/*` requests with `Authorization: Bearer ...`.
2. Cookie session for browser requests.

Default user resolution loads `id`, `name`, `email`, `verified`, `roles`, and
compact effective `abilities` from role ability bundles.

Roles are assignment and display labels backed by ability bundles. Application
code authorizes abilities, not role names. The built-in `admin` bundle grants
`["*"]`; the app `user` bundle grants the standard non-admin abilities from
`src/abilities.ts`. Keep role labels for admin/account UI only.

`csrf` allows:

- bearer-token requests
- safe methods: `GET`, `HEAD`, `OPTIONS`
- unauthenticated `/api/*` requests

All other unsafe cookie-auth requests need either same-origin proof or a
double-submit XSRF token. Double-submit tokens are HMAC signed with `APP_SECRET`
and bound to `req.session.id`; naive matching cookie/header values are rejected.

### Cookies and Secret Storage

Session cookies store plaintext random values. The database stores only
`sha256(cookiePlain)` in `sessions.id`. A database-only leak cannot be reused as
a cookie value.

Session validation enforces both absolute expiry and a 30-minute server-side
idle timeout. Expired session rows are deleted during validation. Active
sessions update `last` at most once every 5 minutes, so session/account/admin UI
shows real activity without writing on every request. Background credential
checks such as SSE freshness validate without renewing activity. Session list
and admin/dashboard loaders call `session.prune()` before counting/listing so
expired rows that are no longer presented by a browser cookie do not appear as
active sessions.

API tokens, reset tokens, and invitation tokens are stored hashed. Plaintext API
tokens and invitation tokens are shown or sent only once at creation.

Cookies are exact-parsed by name. Duplicate same-name cookies are rejected. The
session cookie is `HttpOnly`, `SameSite=Lax`, path-scoped, and `Secure` in
production. CSRF cookies are also `Secure` in production.

### Trusted Origin and IP

`origin(req)` behavior:

- If `APP_URL` is set, it must be an `http` or `https` URL, and its origin wins.
- In production, non-local hosts require `APP_URL` and fail closed if missing.
- Local loopback production runs such as `localhost:5173` and `127.0.0.1:5173`
  can use the request host so `kit start` works locally without `APP_URL`.
- Development can fall back to `Host`.
- `X-Forwarded-Proto` is trusted only when `TRUST_PROXY` is enabled.

`ip(req)` uses `remoteAddress` by default. `X-Forwarded-For` is trusted only
when `TRUST_PROXY` is enabled, and then the first valid forwarded IP is used.
Loopback addresses normalize to `localhost` for IP helper purposes.

### Guards

`@kit/auth` reexports guard helpers:

- `redirect(to)`
- `when(condition, middleware, otherwise?)`
- `protect(to?)`
- `guest(to?)`
- `auth()`
- `ability(...required)`
- `confirmed(window?)`
- `verified()`

`redirect()` returns a JSON redirect envelope for AJAX requests and an HTTP 302
for normal page requests.

`confirmed()` checks password-confirmation state for the current credential.
Confirmation stamps are keyed by session hash or bearer token id, not by user
alone. Confirmation cannot be borrowed across sessions or token credentials.
Confirmation state is cleared on logout, password lifecycle changes, session
revocation, token revocation, and account deletion.

The confirm action is rate-limited by credential/IP.

### Credential Lifecycle

Password reset/change are credential boundaries:

- Invalid reset form input does not consume a reset token.
- Successful reset consumes the token in the password update transaction.
- Reset deletes sessions, API tokens, and other reset tokens for the user.
- Password change rotates the current session, deletes other sessions, and
  revokes API tokens.
- Confirmation state is cleared after reset/change/logout and credential
  revocation.

Login paths use dummy password verification where needed so missing users do not
create obvious timing differences.

Email verification signatures are HMAC-SHA256 tokens using `APP_SECRET`.
Development can use the local fallback. Production fails closed before signing
or validating when `APP_SECRET` is missing, shorter than 32 characters, or left
as a sample placeholder; the failure logs a server-side security message and
public responses mask it as a 500.

### Registration Policy And Invitations

User onboarding runs through the registration routes and data module.

The app stores a singleton `registration` row with `signup = 'open' | 'invite'`.
The default migrated state is `open`, preserving public self-service
registration. Public `/register` and `/login` loaders track
`registration:policy`; admin mode changes emit `registration:policy` so public
signup affordances update through normal route freshness.

`/register` enforces the policy server-side before parsing or writing. In
`invite` mode direct public registration fails with `403`; hiding links is only
UI, not the security boundary.

Invitations live in `invitations` and are managed through
`/admin/registration`. Admin reads require the admin subtree `admin:read`
boundary, and mutation actions call `authorize(req, 'admin:write')`. Invite
creation is rate-limited by inviter and invited email, revokes any previous
active invitation for the normalized email in the same transaction, stores only
`sha256(plainToken)`, emails the plaintext accept link once, and emits
`admin:registration` after the durable write.

`/register/[token]` is the accept flow. The loader returns only the invited
email/name when the token is active. The action validates the token again,
rejects existing user emails without consuming the invitation, hashes the
password, then accepts the invitation in the same transaction that creates the
verified user and assigns the standard `user` role. After commit it creates a
session cookie, emits user/session/admin topics plus `admin:registration`, and
redirects to `/dashboard`. Accepted, revoked, expired, missing, or reused
invites fail closed.

### Error Responses and Logging

`Failure` carries an HTTP status and public message. The JSON body parser is
wrapped so parser bugs or oversized bodies cannot call the route continuation
twice. `normalize()` preserves safe 400-599 statuses from middleware errors such
as JSON parser failures, so malformed JSON returns `422` and over-limit JSON
returns `413` instead of a server error. In production, 500+ messages serialize as
`Internal Server Error`. 4xx validation/auth/body messages stay public.
Development keeps detailed messages and stack where available.

Server `onError` logs non-`Failure` failures only after normalization and only
for 500+ responses. Production `APP_URL` misconfiguration logs server-side
before throwing a masked 500. SSE credential revalidation closures are logged
with reason, path, and auth mode.

## Database and Persistence

The app uses SQLite through `better-sqlite3` and Kysely.

The first supported production topology is a single `kit start` Node process
with one SQLite database file on persistent local disk. The following state is
process-local:

- topic versions in `freshness.ts`
- active SSE connections and pending fanout queues in `server.tsx`
- `ajo-auth` rate-limit buckets
- password confirmation stamps
- configured mail transport

This means multi-process or multi-instance deployments are not coherent by
default. A load-balanced deployment needs a shared topic bus, shared rate-limit
store, and explicit deployment semantics before it can be supported. Reverse
proxies and process managers are fine when they keep a single app process.

Runtime pragmas are set on connection:

- WAL journal mode
- foreign keys enabled
- busy timeout: 5000 ms
- `synchronous = NORMAL`

`kit migrate` combines app migrations from `db/migrations` with plugin
migrations discovered from installed `ajo-*` packages. Migration names are
global because Kysely orders and records migrations by name. Duplicate names
fail while collecting migrations, before any migration executes.

Use Kysely with explicit selected columns. Avoid `selectAll()` unless the full
row is needed.

Admin list pages are bounded through `src/data/pagination.ts`:

- page and size parsed from query params
- size bounded by a maximum
- queries request `limit + 1`
- `rows()` trims the extra row
- `info()` exposes prev/next links without total counts

Indexes currently cover confirmed hot paths:

- `sessions(user, created)`
- `sessions(created)`
- `sessions(user, last)`
- `members(user)`
- `members(role)`
- `users(created)`
- `invitations(email)`
- `invitations(created)`
- `invitations(expiry)`

Avoid more indexes or denormalized state until realistic data measurements show
a need.

Multi-step logical writes use transactions. Emit topics only after the
transaction commits.

## Topics

Topic names are explicit stable domains:

- `user:<id>`: app shell and user-owned state
- `dashboard:<id>`: dashboard summaries
- `profile:<id>`: account profile data
- `sessions:<id>`: account sessions page
- `tokens:<id>`: account tokens page
- `registration:policy`: public login/register policy reads
- `admin:users`: admin users list
- `admin:sessions`: admin sessions list
- `admin:tokens`: admin tokens list
- `admin:stats`: admin overview counters
- `admin:registration`: admin registration mode and invitation list

Emit every topic whose readers observe a mutation. Prefer a few precise topics
over one broad catch-all.

Common mutation topics:

| Mutation | Topics |
|---|---|
| Profile update | `profile:<id>`, `dashboard:<id>`, `user:<id>`, `admin:users` |
| Session create/revoke | `sessions:<id>`, `dashboard:<id>`, `user:<id>`, `admin:sessions`, `admin:stats` |
| Token create/revoke | `tokens:<id>`, `dashboard:<id>`, `user:<id>`, `admin:tokens`, `admin:stats` |
| Signup mode change | `admin:registration`, `registration:policy` |
| Invitation create/revoke | `admin:registration` |
| Invitation accept | `sessions:<id>`, `dashboard:<id>`, `user:<id>`, `admin:sessions`, `admin:users`, `admin:stats`, `admin:registration` |

## Head Management

`head.tsx` owns server rendering and client application of document head state.

`merge(...heads)` deduplicates keyed `meta` and `link` entries, with later heads
winning. `render(head)` produces SSR tags. `apply(head)` diffs before mutating
`document.head` and `document.title`.

The head payload is compact: use `title`, `meta[]`, and `link[]`.

## Mail and Outbound URLs

Email flows such as reset, register, verify, and invitations build links from
`origin(req)`. Production non-local deployments must configure `APP_URL`;
local loopback `kit start` runs can use the request host.

Do not construct email links directly from arbitrary `Host` or forwarded headers.

## Validation

`@kit/validate` re-exports common Valibot helpers and provides `parse(schema,
data)`. Validation failures throw `Invalid`, which serializes field errors
and is surfaced by `action()` as `form.error`.

Validate input before writes. Keep schemas route-local unless repeated shapes
make a shared helper clearly simpler.

## Measurement

Set `AJO_TIMING=1` to enable route timing:

- `Server-Timing`
- `X-Ajo-Bytes`
- `X-Ajo-Cache`
- route timing logs

The timing module is an internal framework helper; apps use the flag and route
headers/logs rather than importing timing internals.

## Component Data Rules

- Components render durable data from `args.data`.
- Keep only UI-local state in components: input state, modal state, scroll
  anchors, temporary optimistic windows.
- Do not mirror server arrays into long-lived client stores unless a feature
  explicitly needs a bounded local window.
- Stateful Ajo components use generator components and `this.next()` for local
  updates.
- Use `this.signal` for cleanup-aware async/listener work.
- Do not import React or use React event/prop casing.

## Dev, Test, and Seed Reliability

E2E startup uses strict port binding. Test server HMR host/protocol are
deterministic. E2E owns `.tmp/e2e.sqlite`; unit DB tests own temp DB paths and
restore `DATABASE_PATH`.

The sample seed fetches remote DummyJSON data before deleting local tables so a
network failure does not destroy existing local data.

Dev route reload watches handler, wares, page, and layout add/change/unlink
events. Page/layout changes trigger full reload.

Production smoke uses `playwright.production.config.ts`. It runs the built
runtime through `tests/production-server.ts` with a migrated temporary SQLite
database, then probes SSR, static asset headers, route JSON, and malformed JSON
action error mapping.

## Verification

For framework, security, data-flow, or runtime changes run:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm test:prod
```

Use focused e2e coverage for browser-visible flows and full e2e before closing
cross-stack changes.

Manual checks that exercise the system:

- SSR logged-out page load.
- SSR logged-in page load.
- Login, logout, register, verify, forgot, reset.
- Create/revoke API token from UI.
- Limited bearer token against forbidden API mutation.
- Password change/reset invalidating old sessions and tokens.
- Two sessions open, revoke one, verify live closure/update.
- `/admin/users -> /admin/sessions -> /admin/users` route freshness.
- Topic emit/revalidation on a route that tracks changed data.
- Production-like run with `APP_URL`, secure cookies, generic 500 responses.
- Local `kit start` on Windows without `APP_URL` using `localhost`.

## Non-Goals

- No normalized client store.
- No implicit table tracking, `tracker.ts`, `deps`, `events`, sums, or seals.
- No `devalue` for route JSON, actions, SSE, or public API responses.
- No GraphQL-style cache.
- No broad route data abstraction before repeated concrete use proves need.
- No arbitrary rich non-JSON route/action/API payloads outside SSR boot.
- No distributed rate limiting while the app is single-process/local.
- No domain-specific denormalized state before realistic measurement.
- No complex public route caching policy until a measured need exists.
- No large security framework abstraction while route-local checks stay clearer.
