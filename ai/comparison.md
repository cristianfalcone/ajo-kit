# Ajo Comparisons

Last consolidated: 2026-06-21
External references last checked: 2026-06-21

This document keeps comparative context for `ajo-kit`, `ajo-auth`, routing,
server data, and adjacent framework choices. It is not the implementation
contract; current architecture lives in `ai/architecture.md`.

The external notes below are based on primary project documentation and, where
useful, official repository/source references listed in [Sources](#sources).

## Ajo Baseline

Current `ajo-kit` provides:

- Ajo TSX full-stack route handlers.
- Vite-based dev/build/start pipeline.
- Filesystem route discovery from `src/**/{layout,page}.{j,t}s{,x}` and
  `src/**/handler.{j,t}s{,x}`.
- Group directories such as `(app)` and `(public)`.
- Dynamic params such as `[id]` and splats such as `[...]`.
- Route wares, layout/page/head loaders, route actions, and `/api/*` handlers.
- `parent()` for merged ancestor loader data.
- SSR, hydration, JSON navigation, and head updates from one route state.
- Explicit live topics through `req.track(topic)` and `emit(topic)`.
- SSE revalidation that sends full route payloads, not patches.
- Route hashes, topic versions, bounded client route cache, `X-Have`,
  `X-Ajo-Versions`, `ETag`, and early `304` for fresh JSON routes.
- Non-redirect action reconciliation when SSE is unavailable.
- Kysely + SQLite integration, migrations, seeding, and one-process Node
  production topology.
- Defensive dynamic/static headers.
- Vitest and Playwright coverage for framework behavior, security, freshness,
  auth, API token abilities, chat live updates, and production smoke.

Current `ajo-auth` provides:

- Argon2id password hashing.
- Cookie sessions for browser auth.
- Bearer API tokens for `/api/*` routes.
- API token abilities with exact grants, resource wildcards, and full `*`.
- CSRF protection for unsafe cookie-auth writes.
- Role, ability, auth, guest, confirmed, and verified guards.
- Password confirmation gate.
- Email verification links plus authenticated resend flow.
- Password reset links stored as SHA-256 hashes.
- API token ids stored as SHA-256 hashes; plaintext shown only once.
- Session rows storing hashed ids plus expiry, IP, user agent, and last activity.
- Password reset/change revocation of old sessions and API tokens.
- Password change rotation of the current session.
- Credential-scoped, rate-limited password confirmation.
- In-memory rate limits for reset/token/verify flows in app handlers.
- Account session/token management and admin auth views.

Current app/demo surface built on the framework:

- Dashboard, profile, sessions, tokens, delete-account, admin, verify, reset,
  and confirm flows.
- Chat section with shared layout/list/detail UI, direct/group creation,
  live route updates, global unread counts, oldest-unread targeting, bounded
  message window, bidirectional pagination, scroll anchoring, and seen-state
  clearing after visible reads.

Known missing breadth:

- Two-factor authentication.
- Passkeys, social login, and SSO.
- Teams or organizations.
- Distributed rate limiting.
- Password rehash migration policy.
- Rich device management UX beyond the current session/token pages.
- Auth event and audit hooks.
- Named routes and URL generation.
- Route model binding.
- Regex or typed route constraints.
- Domain/subdomain routing.
- Static route listing equivalent to Laravel `route:list`.
- Nested error boundary conventions beyond the current app error pipeline.
- Deployment adapters beyond the current Node + SQLite topology.

## Routing and Data

Laravel routing is a broad imperative routing layer with verb routes, redirect
and view routes, route files, parameters, regex constraints, named routes, URL
generation, groups, middleware, subdomain routing, route model binding,
fallbacks, rate limiting, method spoofing, route caching, and `route:list`.

Laravel Folio maps Blade templates under configured page directories to routes.
It supports nested/index routes, route parameters, middleware, named routes,
render closures, and Laravel route model binding behavior. It also exposes
`folio:list`.

Inertia keeps classic server-side framework routing/controllers while replacing
the server-rendered view layer with React, Vue, or Svelte page components.
Laravel's React/Svelte/Vue starter kits use Inertia 3 and can opt into Inertia
SSR. Inertia's protocol uses `X-Inertia` JSON page responses after the initial
HTML boot, asset version checks, and partial reload headers for same-component
prop subsets.

| Area | Ajo-kit | Laravel Routing | Laravel Folio | Inertia + Laravel |
|---|---|---|---|---|
| Route definition | Filesystem `page/layout/handler/wares` files | Explicit PHP route files and route registration | Blade page files | Laravel routes/controllers plus JS page components |
| SSR | Built into `ajo-kit` | Blade/controller dependent | Blade page rendering | Optional Node SSR server for JS pages |
| Data loaders | `layout/page/head` loaders with `parent()` | Controller methods, requests, services | Page render closures / view data | Controller props |
| Mutations | Route `actions` and `/api/*` handlers | Controllers, form requests, actions | Standard Laravel forms/controllers | Controllers/API endpoints through Inertia forms/visits |
| Client navigation | JSON route payloads, cache, head updates | Full page unless SPA added | Full page unless SPA added | XHR Inertia page object protocol |
| Freshness | Topic versions + route hash + `ETag` + early `304` | HTTP/framework/app-specific caching | HTTP/framework/app-specific caching | Asset version checks plus partial reloads; app-specific data freshness |
| Live updates | Built-in SSE revalidation + full route payloads | Echo/Broadcasting/Reverb ecosystem | Echo/Broadcasting/Reverb ecosystem | Echo/Broadcasting plus app patterns |
| TypeScript locality | Route data, actions, API, UI in TS/TSX | PHP backend, optional JS frontend | PHP/Blade | PHP backend + JS pages |
| Named URL generation | Missing | Strong built-in feature | Supported via route naming | Uses Laravel route layer |
| Model binding | Missing | Strong built-in feature | Supported by Folio/Laravel | Uses Laravel route layer |
| Ecosystem depth | Small/local | Very mature | Laravel-specific page router | Mature Laravel + JS bridge |

Ajo's routing strength is one TS/TSX mental model for route data, actions, API
handlers, SSR, and live updates. Explicit topic invalidation with early `304`
avoids unchanged navigation loader work, and built-in SSE avoids a separate
realtime stack for current app needs.

Laravel's routing strength is breadth: names, groups, constraints, domain
routing, model binding, mature middleware, validation, authorization, queues,
broadcasting, cache, observability, and maintained starter kits across multiple
frontend stacks.

Do not clone Laravel's routing surface speculatively. Add named route helpers,
route listing, typed param validation, or domain routing only when a concrete app
workflow needs them and the implementation can stay small.

## Auth

Laravel's current starter kits for React, Svelte, Vue, and Livewire include
routes/controllers/views for registration and auth and use Laravel Fortify
internally. Fortify is frontend-agnostic backend/authentication infrastructure
for registration, login, password reset, email verification, password
confirmation, 2FA, and passkeys. Sanctum is separate: it handles API tokens and
SPA/mobile session-cookie authentication, not registration/password reset.

| Area | Ajo-auth | Laravel current stack |
|---|---|---|
| Primary model | Small TypeScript package integrated with `ajo-kit` routes | Laravel starter kits + Fortify, with Sanctum for API tokens/SPAs |
| Frontend coupling | Ajo components/routes in this app | Starter kits provide React/Svelte/Vue/Livewire; Fortify itself is frontend-agnostic |
| Password hashing | Argon2id via `argon2` package | Laravel hashing/config ecosystem |
| Sessions | Database-backed cookie sessions | Mature framework session stack with broad driver support |
| API tokens | SHA-256 token ids, exact/resource/full-wildcard abilities, expiry, last-used | Sanctum personal access tokens with abilities/scopes and expiration support |
| CSRF | Double-submit cookie plus same-origin Origin/Referer fallback | Mature CSRF/session middleware stack |
| Email verification | Signed route token plus authenticated resend | Built-in verified user flow in starter kits/Fortify |
| Password reset | Hashed reset token, one-hour expiry, consume-on-use | Built-in reset broker/notifications in Laravel ecosystem |
| 2FA | Missing | Fortify/starter-kit support |
| Passkeys | Missing | Fortify support |
| Social/SSO | Missing | WorkOS AuthKit starter-kit variants cover social, passkeys, magic auth, SSO |
| Teams | Missing | Starter-kit team support |
| Rate limiting | In-memory helpers in handlers | Framework rate limiter and middleware ecosystem |
| Ecosystem maturity | Small, inspectable, local | Large, battle-tested, extensive docs/packages |

Ajo-auth should keep these security boundaries:

- Plain API/reset tokens are never stored directly.
- `emit()` runs after commit so auth UI reflects committed state.
- CSRF bypass applies only to `/api/*` bearer-token requests.
- Login flows use dummy password verification for missing users.
- API routes enforce narrow ability checks where token-specific permissions are
  required.
- Password reset/change are credential lifecycle boundaries.

Higher-assurance or multi-instance apps likely need external or larger-surface
features: 2FA/passkeys or an IdP, distributed rate limiting, audit events for
auth operations, hash rehash-on-login policy, and app-specific cookie review for
the deployment topology.

## Next.js

Next.js App Router is the mainstream React framework comparison for filesystem
routing, server-rendered UI, server-side data access, route handlers, and server
actions. It has much broader ecosystem and deployment support than Ajo, but its
model is React Server Components plus explicit cache/revalidation primitives,
not route-topic freshness and SSE route payloads.

| Area | Ajo-kit | Next.js App Router |
|---|---|---|
| UI runtime | Ajo TSX/generator components | React Server Components plus Client Components |
| Route files | `layout.tsx`, `page.tsx`, `handler.ts`, `wares.ts` | `layout`, `page`, dynamic segments, route groups, and `route.ts` handlers |
| Data loading | Server loaders with `parent()` and durable route data | Server Components can fetch data or query databases directly |
| Mutations | Named route `actions` and `/api/*` handlers | Server Functions/Server Actions, forms, handlers, and cache revalidation |
| Client navigation | JSON route payloads, route cache, head updates | Client transitions over React Server Component payloads |
| Freshness | Topic versions, route hashes, `ETag`, early `304`, SSE payloads | `refresh`, `revalidatePath`, `revalidateTag`, fetch/cache directives |
| Live updates | Built-in SSE route revalidation | App-specific polling/SSE/WebSocket or platform patterns |
| Auth | Local `ajo-auth` package | App/library choice, documented DAL/auth patterns |
| Deployment | Current supported target is one Node process + SQLite file | Vercel-first ecosystem plus standalone/static/self-hosting modes |

Where Next.js is ahead:

- Production maturity and ecosystem size.
- React Server Component architecture, code splitting, streaming, and platform
  integrations.
- Deployment and hosting documentation, including standalone and static export
  modes.
- Established data security guidance for server-only data access, DTOs, and
  authorization in Server Functions.

Where Ajo is sharper for this repo:

- Ajo avoids React/RSC complexity and keeps the app in one TSX route model.
- Freshness is explicit through route topics instead of broad path/tag
  invalidation.
- Active routes can receive full server route payloads through built-in SSE.
- The current stack is smaller and easier to inspect end to end.

Next.js is useful as a maturity reference, especially around deployment docs,
server-only safety guidance, and mutation authorization discipline. Its cache
model should not be copied directly unless Ajo needs broader static/ISR-like
rendering modes.

## React Router and Remix

React Router v8 is the current stable React framework line. The official docs
list latest/current as `8.0.1` at the time of this review. It is a
multi-strategy router that can be used as a React framework, data router, or
declarative router. Framework mode exposes route modules, rendering strategies,
data loading, actions, navigation, pending UI, testing, deployment docs, file
route conventions, middleware, resource routes, type safety, sessions/cookies,
and related utilities.

The Remix v2 production lineage was merged into React Router v7 framework mode,
so React Router v8 is the stable production path for apps in that lineage.
Remix 3 remains an evolving direction under the `remix` umbrella; its public
direction emphasizes Web APIs, runtime-first execution, small composable
packages, forms, sessions, auth, routing, data/database, SSR, tests, and
unbundled runtime behavior.

| Area | Ajo-kit | React Router v8 | Remix 3 direction |
|---|---|---|---|
| Status | Local small framework with one-process production topology | Stable production React framework line | Beta/pre-release direction |
| UI runtime | Ajo TSX components | React | New Remix model/components direction |
| Build model | Vite 8 + Ajo compiler/runtime | Vite and React Router dev/runtime packages | Runtime-first/unbundled direction |
| Routing | Filesystem Ajo route files plus `handler.ts` | Route modules, file route conventions, route config | New routing primitives |
| Data loading | `layout/page/head` loaders with `parent()` | Loaders in route modules | Web API/data primitives direction |
| Mutations | Route actions and `/api/*` handlers | Actions, fetchers, forms | Forms/controllers/actions direction |
| Live data | Built-in topic SSE revalidation and payloads | App-specific, ecosystem-driven | Data primitives still evolving |
| Cache freshness | Topic versions + route hash + early `304` | HTTP/framework/app-specific revalidation and cache patterns | Runtime/data direction still evolving |
| Auth | Local `ajo-auth` package | App/ecosystem choice; sessions/cookies APIs exist | Auth is listed as a core package/domain direction |
| Ecosystem | Small/local | Large React ecosystem | New and changing |

Ajo is ahead for this repo where the local system has already proven a smaller
path: built-in route-topic freshness, built-in server revalidation and payloads
over SSE, direct SQLite/Kysely integration, and a single app-specific mental
model.

React Router is ahead in production maturity, React ecosystem compatibility,
stable documentation, deployment examples, type-safe route module tooling, and
community knowledge.

Remix 3 remains worth watching because its stated principles overlap with Ajo's
direction: Web APIs, runtime-first behavior, composition over framework magic,
small cohesive packages, forms, sessions, auth, data, SSR, and tests as
first-class concerns. Do not chase Remix 3 APIs until they stabilize; track the
concepts and compare again when it is production-ready.

## SvelteKit

SvelteKit is the closest mainstream JavaScript comparison to Ajo's desired
"small full-stack app framework" feel: filesystem routes, colocated layouts and
pages, server loads, form actions, endpoint files, SSR by default, hydration,
client navigation, adapters, and explicit data invalidation.

SvelteKit route files are directory based under `src/routes`: `+layout.svelte`,
`+layout.server.js`, `+page.svelte`, `+page.server.js`, `+server.js`, and
`+error.svelte`. Server `load` is for private server work such as database or
filesystem access. `+page.server.js` can export form actions for POST writes.
By default SvelteKit renders components on the server, hydrates them in the
browser, and initializes a router for subsequent navigations. Deployment output
is produced by adapters, including a Node adapter for standalone Node servers.

| Area | Ajo-kit | SvelteKit |
|---|---|---|
| UI runtime | Ajo TSX/generator components | Svelte components |
| Route files | `layout.tsx`, `page.tsx`, `handler.ts`, `wares.ts` | `+layout.svelte`, `+page.svelte`, `+layout.server`, `+page.server`, `+server`, `+error` |
| Data loading | Server-only `layout/page/head` loaders with `parent()` | Universal and server `load`; server `load` output is serialized with `devalue` |
| Mutations | Named route `actions` via `action()` plus `/api/*` handlers | Page form actions in `+page.server.js`; `+server.js` endpoints |
| Progressive forms | Ajo `action()` fetch helper; JS-first current app behavior | Native form actions with `use:enhance` progressive enhancement |
| SSR/hydration | Built-in SSR boot data + hydration | SSR by default, hydration, then client router |
| Freshness | Explicit topics, versions, cache headers, early `304`, SSE payloads | `invalidate`, `invalidateAll`, `depends`, load reruns; no built-in topic SSE payload layer |
| Live updates | Built-in SSE route revalidation | App-specific SSE/WebSocket/polling patterns |
| Auth | `ajo-auth` package with app routes | Integration points through hooks, cookies, `locals`; Better Auth is an optional CLI/library path |
| Deployment | Current supported target is one Node process + SQLite file | Adapter-based deployment for multiple targets |
| Public breadth | Small/local | Mature public framework ecosystem |

Where SvelteKit is ahead:

- Mature public docs and ecosystem.
- More deployment targets through adapters.
- Progressive enhancement for forms is a first-class documented path.
- `+error.svelte`, route options (`prerender`, `ssr`, `csr`), and endpoint
  conventions are established.
- Svelte compiler/runtime maturity and community knowledge.

Where Ajo is sharper for this repo:

- Route actions, loaders, API handlers, middleware, and UI stay in one TS/TSX
  app style without switching between Svelte file conventions.
- Topic freshness is explicit and framework-owned.
- Active routes can update through built-in SSE route payloads.
- Early `304` can skip unchanged route loader work.
- Auth, SQLite, migrations, and app demo flows are designed as one inspectable
  local stack.

SvelteKit is the most useful JavaScript framework to keep comparing against.
Adopt ideas only when they preserve Ajo's small surface: route error UI,
progressive form behavior, adapters, and route options are the most plausible
future comparison points.

## Practical Direction

Keep Ajo focused on needs proven locally:

- Fast SSR.
- Small route handlers.
- Explicit topic freshness.
- Cheap re-navigation.
- Live SSE payloads.
- Measured SQLite performance.
- Small, inspectable auth and routing internals.
- Focused app-level UX such as the current token, profile, session, verify, and
  chat flows.

Avoid copying Laravel, Inertia, Next.js, React Router, Remix, or SvelteKit
abstractions unless a concrete app workflow needs the feature and the local
implementation can stay small.

## Sources

Local `ajo-kit` implementation:

- `readme.md`
- `packages/ajo-kit/README.md`
- `packages/ajo-auth/README.md`
- `ai/architecture.md`
- `ai/chat.md`
- `packages/ajo-kit/src/server.tsx`
- `packages/ajo-kit/src/app.tsx`
- `packages/ajo-kit/src/client.tsx`
- `packages/ajo-kit/src/vite.ts`
- `packages/ajo-auth/src/wares.ts`
- `packages/ajo-auth/src/guard.ts`
- `packages/ajo-auth/src/token.ts`
- `src/(app)/account/chats/handler.ts`
- `src/(app)/account/chats/[id]/handler.ts`
- `src/(app)/account/chats/[id]/page.tsx`
- `src/verification.ts`
- `tests/e2e/data-flow.spec.ts`
- `tests/e2e/api.spec.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/chat.spec.ts`

External primary references:

- https://laravel.com/docs/13.x/routing
- https://github.com/laravel/framework/blob/13.x/src/Illuminate/Routing/RouteCollection.php
- https://laravel.com/docs/13.x/folio
- https://github.com/laravel/folio
- https://laravel.com/docs/13.x/starter-kits
- https://laravel.com/docs/13.x/fortify
- https://github.com/laravel/fortify
- https://laravel.com/docs/13.x/sanctum
- https://github.com/laravel/sanctum
- https://inertiajs.com/docs/v3/core-concepts/how-it-works
- https://inertiajs.com/docs/v3/core-concepts/the-protocol
- https://inertiajs.com/docs/v3/data-props/partial-reloads
- https://inertiajs.com/docs/v3/advanced/server-side-rendering
- https://github.com/inertiajs/inertia
- https://nextjs.org/docs/app/getting-started/layouts-and-pages
- https://nextjs.org/docs/app/getting-started/route-handlers
- https://nextjs.org/docs/app/getting-started/fetching-data
- https://nextjs.org/docs/app/getting-started/mutating-data
- https://nextjs.org/docs/app/getting-started/linking-and-navigating
- https://nextjs.org/docs/app/api-reference/functions/use-router
- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/guides/data-security
- https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- https://nextjs.org/docs/app/guides/static-exports
- https://reactrouter.com/home
- https://reactrouter.com/changelog
- https://reactrouter.com/upgrading/future
- https://github.com/remix-run/react-router
- https://remix.run/blog/merging-remix-and-react-router
- https://remix.run/blog/remix-3-beta-preview
- https://api.remix.run/
- https://svelte.dev/docs/kit/routing
- https://svelte.dev/docs/kit/load
- https://svelte.dev/docs/kit/form-actions
- https://svelte.dev/docs/kit/page-options
- https://svelte.dev/docs/kit/hooks
- https://svelte.dev/docs/kit/auth
- https://svelte.dev/docs/kit/adapters
- https://svelte.dev/docs/kit/adapter-node
- https://github.com/sveltejs/kit
- https://github.com/sveltejs/kit/blob/main/documentation/docs/20-core-concepts/10-routing.md
