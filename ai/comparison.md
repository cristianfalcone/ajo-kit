# Ajo Comparisons

Last consolidated: 2026-06-20
External references last checked: 2026-06-19

This document keeps comparative context for `ajo-kit`, `ajo-auth`, routing,
server data, and adjacent framework choices. It is not the implementation
contract; current architecture lives in `ai/architecture.md`.

## Ajo Baseline

Current `ajo-kit` provides:

- Ajo TSX full-stack route handlers.
- Vite-based dev/build pipeline.
- Filesystem route discovery from `src/**/handler.ts` and route UI files.
- Group directories such as `(app)` and `(public)`.
- Dynamic params such as `[id]`.
- Route wares, layout/page/head loaders, route actions, and `/api/*` handlers.
- SSR, JSON navigation, and hydration from one route state.
- Explicit live topics, SSE revalidation, route hashes, topic versions, and
  early `304` for fresh JSON routes.
- Kysely + SQLite integration.
- Auth package with sessions, roles, API tokens, CSRF, verification, reset, and
  confirmation gates.
- Vitest and Playwright coverage for framework, security, freshness, and data
  flow behavior.

Current `ajo-auth` provides:

- Argon2id password hashing.
- Cookie sessions for web auth.
- Bearer API tokens with abilities.
- CSRF protection for cookie-auth writes.
- Role and ability guards.
- Password confirmation gate.
- Email verification links.
- Password reset links stored as SHA-256 hashes.
- API token ids stored as SHA-256 hashes; plaintext shown once.
- Session rows storing hashed ids plus expiry, IP, user agent, and last activity.
- Password reset/change revocation of old sessions and API tokens.
- Password change rotation of the current session.
- Credential-scoped, rate-limited password confirmation.
- In-memory rate limits for reset/token/verify flows in app handlers.
- Account session/token management and admin auth views.

Known missing breadth:

- Two-factor authentication.
- Passkeys, social login, and SSO.
- Teams or organizations.
- Distributed rate limiting.
- Password rehash migration policy.
- Rich device management UX.
- Auth event and audit hooks.
- Named routes and URL generation.
- Route model binding.
- Regex or typed route constraints.
- Domain/subdomain routing.
- Static route listing equivalent to Laravel `route:list`.
- Nested error boundary conventions beyond the current app error pipeline.

## Routing and Data

Laravel routing is a broad imperative routing layer with verb routes, redirect
and view routes, required and optional parameters, regex constraints, named
routes, URL generation, route groups, middleware, route model binding, and route
listing.

Laravel Folio maps Blade templates under configured page directories to routes,
with support for params, middleware, named routes, render closures, and route
model binding behavior.

Inertia keeps classic server-side routing/controllers while rendering client
pages in React, Vue, or Svelte. Laravel's React/Svelte/Vue starter kits use
Inertia and can opt into Inertia SSR.

| Area | Ajo-kit | Laravel Routing | Laravel Folio | Inertia + Laravel |
|---|---|---|---|---|
| Route definition | `handler.ts` filesystem routes | Explicit PHP route definitions | Blade page files | Laravel routes/controllers |
| SSR | Built into `ajo-kit` | Blade/controller dependent | Blade page rendering | Optional Inertia SSR server |
| Data loaders | `layout/page/head` loaders | Controller methods | Page render closures / view data | Controller props |
| Mutations | Route `actions` and `/api/*` handlers | Controllers/form requests/actions | Standard Laravel forms/controllers | Controllers/API endpoints |
| Client navigation | JSON route payloads | Full page unless SPA added | Full page unless SPA added | SPA protocol |
| Freshness | ETag + route hash + topic versions + early `304` | HTTP caching must be designed per app | HTTP caching must be designed per app | Protocol supports partial reload concepts; app-specific cache strategy |
| Live updates | Built-in SSE revalidation + route payloads | Echo/Broadcasting ecosystem | Echo/Broadcasting ecosystem | Echo/Broadcasting plus app patterns |
| TypeScript locality | Route data and UI colocated in TS/TSX | PHP backend, optional JS frontend | PHP/Blade | PHP backend + JS pages |
| Named URL generation | Missing | Strong built-in feature | Supported via route naming | Uses Laravel route layer |
| Model binding | Missing | Strong built-in feature | Supported by Folio/Laravel | Uses Laravel route layer |
| Ecosystem depth | Small/local | Very mature | Laravel-specific page router | Mature Laravel + JS bridge |

Ajo's routing strength is one TS/TSX mental model for route data, actions, API
handlers, SSR, and live updates. Explicit topic invalidation with early `304`
avoids unchanged navigation loader work, and built-in SSE avoids a separate
realtime stack for the current app needs.

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
internally. Fortify is backend/authentication infrastructure for registration,
login, password reset, email verification, profile/password updates, and
optional 2FA. Sanctum is separate: it handles API tokens and SPA/mobile
session-cookie authentication, not registration/password reset. Jetstream still
exists, but its Packagist README marks it as a starter kit for Laravel 11 and
prior, so it is legacy/full-featured context rather than the default current
Laravel starting point.

| Area | Ajo-auth | Laravel current stack |
|---|---|---|
| Primary model | Small TypeScript package integrated with `ajo-kit` routes | Laravel starter kits + Fortify, with Sanctum for API tokens/SPAs |
| Frontend coupling | Ajo components/routes in this app | Starter kits provide React/Svelte/Vue/Livewire; Fortify itself is frontend-agnostic |
| Password hashing | Argon2id via `argon2` package | Laravel hashing supports modern algorithms and framework-managed config |
| Sessions | Database-backed cookie sessions | Mature framework session stack with broad driver support |
| API tokens | SHA-256 token ids, abilities, expiry, last-used | Sanctum personal access tokens with abilities/scopes and expiry support |
| CSRF | Double-submit cookie plus same-origin Origin/Referer fallback | Mature CSRF/session middleware stack |
| Email verification | Signed route token | Built-in verified user flow in starter kits/Fortify |
| Password reset | Hashed reset token, one-hour expiry, consume-on-use | Built-in reset broker/notifications in Laravel ecosystem |
| 2FA | Missing | Available through Fortify/starter-kit features |
| Social/passkeys/SSO | Missing | WorkOS AuthKit starter-kit variants cover social, passkeys, magic auth, SSO |
| Teams | Missing | Available in Jetstream legacy/full-featured context |
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

Production hardening beyond the current local app likely needs external or
larger-surface features: 2FA/passkeys or an IdP, distributed rate limiting,
audit events for auth operations, hash rehash-on-login policy, and final cookie
flag review for the deployment topology.

## React Router and Remix

React Router v8 is the current stable React framework line. It is described as a
non-breaking upgrade from v7, requires modern baselines, and keeps the React
framework model. Remix v2 was merged into React Router v7 framework mode, so
React Router v8 is the stable production path for apps in that lineage.

Remix 3 is a beta/pre-release direction under the `remix` umbrella. It is not
production-ready yet. Its public direction emphasizes Web APIs,
runtime-first execution, small composable packages, zero/minimal dependencies,
model-first UI, forms, sessions, auth, routing, data/database, SSR, tests, and
unbundled runtime behavior.

| Area | Ajo-kit | React Router v8 | Remix 3 beta |
|---|---|---|---|
| Status | Local experimental app/framework | Stable production React framework line | Beta/pre-release, not production-ready |
| UI runtime | Ajo TSX components | React | Remix 3 model/components |
| Build model | Vite 8 + local Ajo compiler/runtime | Vite, ESM-only, modern Node/React baselines | Runtime-first/unbundled direction |
| Routing | `handler.ts` filesystem routes | Route modules/framework mode | New `remix` routing primitives |
| Data loading | `layout/page/head` loaders | Loaders/actions in route modules | Web API routes/controllers/data primitives |
| Mutations | Route actions and `/api/*` handlers | Actions/fetchers/forms | Forms/controllers/actions direction |
| Live data | Built-in topic SSE revalidation and payloads | App-specific, ecosystem-driven | Data primitives direction is still evolving |
| Cache freshness | ETag + route hash + topic versions + early `304` | HTTP/framework/app-specific caching | Runtime/data direction still evolving |
| Auth | Local `ajo-auth` package | App/ecosystem choice | Auth is listed as a core package/domain direction |
| Ecosystem | Small/local | Large React ecosystem | New and changing |

Ajo is ahead for this repo where the local system has already proven a smaller
path: built-in route-topic freshness, built-in server revalidation and payloads
over SSE, direct SQLite/Kysely integration, and a single app-specific mental
model.

React Router is ahead in production maturity, React ecosystem compatibility,
stable documentation, deployment examples, and community knowledge.

Remix 3 is interesting because its stated principles overlap with Ajo's
direction: Web APIs, runtime-first behavior, composition over framework magic,
small cohesive packages, forms, sessions, auth, data, SSR, and tests as
first-class concerns. Do not chase Remix 3 APIs until they stabilize; track the
concepts and compare again when it is production-ready.

## Practical Direction

Keep Ajo focused on needs proven locally:

- Fast SSR.
- Small route handlers.
- Explicit topic freshness.
- Cheap re-navigation.
- Live SSE payloads.
- Measured SQLite performance.
- Small, inspectable auth and routing internals.

Avoid copying Laravel, React Router, or Remix abstractions unless a concrete app
workflow needs the feature and the local implementation can stay small.

## Sources

- https://laravel.com/docs/13.x/routing
- https://laravel.com/docs/13.x/folio
- https://laravel.com/docs/13.x/starter-kits
- https://laravel.com/docs/13.x/fortify
- https://laravel.com/docs/13.x/sanctum
- https://packagist.org/packages/laravel/jetstream
- https://jetstream.laravel.com/
- https://reactrouter.com/
- https://reactrouter.com/changelog
- https://remix.run/blog/react-router-v8
- https://remix.run/blog/remix-3-beta-preview
- https://api.remix.run/
- https://remix.run/blog/wake-up-remix
- https://remix.run/blog/merging-remix-and-react-router