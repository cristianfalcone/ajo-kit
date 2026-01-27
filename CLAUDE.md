# CLAUDE.md

## Commands

```bash
pnpm dev          # Dev server with HMR
pnpm build        # Production build
pnpm prod         # Run production server
pnpm kysely       # Database migrations (--help)
pnpm backup auth  # OAuth for Google Drive
pnpm backup push  # Push DB to Drive (--watch)
pnpm backup pull  # Pull DB from Drive
```

## Principles

**No users yet.** Refactor freely, no backwards compatibility.

**Naming:** Single meaningful words (`defer`, `guard`, `embed`, `pack`), not abbreviations.

**Style:** DRY, simple, clever, performant, elegant.

**Feature parity:**
- Backend (auth, db, validation) → **Laravel**
- Frontend (routing, data loading, forms) → **SvelteKit**

## Documentation

- [docs/LLMs.md](docs/LLMs.md) — Ajo-kit patterns
- [docs/api-endpoints.md](docs/api-endpoints.md) — API endpoints & form actions
- `node_modules/ajo/LLMs.md` — Ajo UI syntax

## Architecture

Full-stack metaframework for Ajo (JSX + generators).

| File | Role |
|------|------|
| [app.tsx](src/app.tsx) | Router, `action()` helper, HMR |
| [server.tsx](src/server.tsx) | SSR, data pipeline, form actions |
| [client.tsx](src/client.tsx) | Hydration entry |

**Server-only:** Vite plugin blocks `handler.ts`, `wares.ts`, `src/data/*`, `src/auth/*` from client.

## Data Loading

| File Name | Export | Runs On | Use For |
|-----------|--------|---------|---------|
| `page.tsx` | `handler(context, parent)` | Both | Page External APIs, public data |
| `page.tsx` | `head(context, parent)` | Both | Page SEO metadata |
| `layout.tsx` | `handler(context, parent)` | Both | Shared External APIs, public data |
| `layout.tsx` | `head(context, parent)` | Both | Shared SEO metadata |
| `handler.ts` | `page(req, parent)` | Server | Page Database, secrets |
| `handler.ts` | `layout(req, parent)` | Server | Shared Database, secrets |
| `handler.ts` | `head(req, parent)` | Server | Shared Dynamic SEO with secrets |
| `handler.ts` | Named exports | Server | Shared Form actions |

**Merge order:** `{ ...serverData, ...clientData }` — client wins.

**Parent chain:** `await parent()` returns merged ancestor data. See `links()` in [app.tsx](src/app.tsx).

**Defer:** Export `defer: true` to handle loading state locally. Innermost wins.

## Authentication

| Module | Purpose |
|--------|---------|
| [password.ts](src/auth/password.ts) | Argon2id hash/verify |
| [session.ts](src/auth/session.ts) | Create/validate sessions (30d, 365d with remember) |
| [cookie.ts](src/auth/cookie.ts) | HttpOnly session cookie |
| [guard.ts](src/auth/guard.ts) | `protect()`, `guest()`, `auth()`, `role()`, `confirmed()`, `verified()`, `ability()` |
| [csrf.ts](src/auth/csrf.ts) | Double-submit + same-origin check |
| [limit.ts](src/auth/limit.ts) | In-memory rate limiting |
| [confirm.ts](src/auth/confirm.ts) | Password confirmation stamps (3min) |
| [reset.ts](src/auth/reset.ts) | Password reset tokens (1hr, hashed in DB) |
| [verify.ts](src/auth/verify.ts) | Email verification (signed URLs, 24hr, no DB) |

**Email:** [src/mail/index.ts](src/mail/index.ts) — `send()` + `configure()`. Console.log by default.

**Requires:** `APP_SECRET` env var for signed URLs.

## Database

SQLite + Kysely + better-sqlite3. Schema in [types.ts](src/data/types.ts).

Tables: `users`, `sessions`, `roles`, `members`, `tokens`, `resets`.

**Rule:** Always `select(['fields'])`, never `selectAll()`.

**Table versions:** Auto-tracked via `TrackerPlugin`. Use `version()`, `bump()`, `snapshot()` from [db.ts](src/data/db.ts).

## Cache

SvelteKit-style cache for client navigation. Avoids overfetching by comparing sums.

**How it works:**
1. Client sends `X-Have` header with cached sums: `head=abc,(app)=def,dashboard=ghi`
2. Server generates expected sums from `deps` (table versions + user + ttl)
3. If sums match → skip handler, return `null` (client uses cache)

**Deps-based skip:** Export `deps` in `handler.ts` to enable caching:

```ts
export const deps = ['users', ':user']  // Skip if users table unchanged AND same user
export const deps = ['posts', ':ttl:60000']  // Skip if posts unchanged AND <60s passed
```

**Manual invalidation:** `invalidate(key?)` from [app.tsx](src/app.tsx). No key = clear all.

## Validation

Valibot schemas. Reusable fields in [fields.ts](src/data/fields.ts).

`parse(schema, data)` throws `InvalidError` with `{ fields: { name: ['errors'] } }`.

## Form Actions & API Endpoints

**Every `handler.ts` can export multiple handler types:**

```ts
export async function page(req, parent) { }    // Server data loading
export async function action1(req, res) { }    // Form action (?/action1)
export default { get, post, put, delete }       // API endpoints (METHOD /api/route)
```

**Form Actions (SPA):**
- Client: `const form = action<Result>('name')` → `form.loading`, `form.data`, `form.error?`, `form.handle`, `form.reset`
- Server: Named export in `handler.ts` → `POST /route?/actionName`
- CSRF: ✅ Required

**API Endpoints (Mobile/External):**
- Server: `default export { method() }` in `handler.ts` → `METHOD /api/route`
- Authentication: Cookie sessions OR Bearer tokens
- CSRF: ❌ Skipped (for Bearer tokens)
- **Important:** API routes automatically get `/api/` prefix

**Dual authentication:**
- Cookie sessions → SPA/Web (HttpOnly session cookie)
- Bearer tokens → API/Mobile (`Authorization: Bearer <token>`)
- Both populate `req.user` (and `req.token` for Bearer)

See [docs/api-endpoints.md](docs/api-endpoints.md) for complete guide.

## Middleware

Root: [wares.ts](src/wares.ts) runs first.
Route: `(group)/wares.ts` runs in ancestor order.

## Routing

```
(app)/dashboard/page.tsx  → /dashboard
blog/[id]/page.tsx        → /blog/:id
docs/[...]/page.tsx       → /docs/*
```

Groups `(name)` excluded from URLs.

## Errors

[constants.ts](src/constants.ts): `AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `InvalidError`.

## Serialization

`pack()` and `unpack()` in [constants.ts](src/constants.ts) use devalue for JSON with circular refs and custom types.

Objects with `toJSON()` are automatically serialized.

## Anti-patterns

- Secrets in `layout.tsx/page.tsx handler() and head()` (leaks to client)
- Use of `args.loading` without `defer` export (always false)
- Missing `NotFoundError` for 404s
- Context outside generator loop
- React patterns (`useState`, `className`, `onClick`)
- Missing `await parent()` in dependent handlers
- Missing `deps` export for cacheable handlers (causes unnecessary refetches)
