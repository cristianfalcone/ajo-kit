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
- [docs/data.md](docs/data.md) — Data loading, cache, events & SSE
- [docs/api-endpoints.md](docs/api-endpoints.md) — API endpoints & form actions
- `node_modules/ajo/LLMs.md` — Ajo UI syntax

## Architecture

Full-stack metaframework for Ajo (JSX + generators). Monorepo with workspace packages.

### Packages

| Package | Alias | Role |
|---------|-------|------|
| `packages/ajo-kit` | `@kit`, `@kit/*` | Core framework |
| `packages/ajo-auth` | `@kit/auth`, `@kit/auth/*` | Authentication, authorization, session/CSRF middleware |
| `packages/ajo-backup` | — | Google Drive backup (CLI plugin) |

### Core (ajo-kit)

| File | Role |
|------|------|
| [constants.ts](packages/ajo-kit/src/constants.ts) | Types, errors, utilities (`pack`, `sum`, `links`, `navigate`) |
| [app.tsx](packages/ajo-kit/src/app.tsx) | Router, `resolve()` generator, cache, SSE `stream()` |
| [server.tsx](packages/ajo-kit/src/server.tsx) | SSR, data pipeline, form actions, SSE, auto-emit |
| [client.tsx](packages/ajo-kit/src/client.tsx) | Hydration, `action()`, `subscribe()`, `invalidate()` |
| [database.ts](packages/ajo-kit/src/database.ts) | `connect`, `db`, `raw`, `close` + Kysely/better-sqlite3 re-exports |
| [tracker.ts](packages/ajo-kit/src/tracker.ts) | `TrackerPlugin`, `version()`, `bump()`, `snapshot()`, `tap()` |
| [validate.ts](packages/ajo-kit/src/validate.ts) | `parse()` + Valibot re-exports |
| [vite.ts](packages/ajo-kit/src/vite.ts) | Vite plugin suite: aliases, virtual modules, serverOnly, HMR |
| [discover.ts](packages/ajo-kit/src/discover.ts) | Plugin discovery: scans `node_modules/ajo-*` for `"kit"` field |
| [migrate.ts](packages/ajo-kit/src/migrate.ts) | `migrator()` — aggregates migrations from packages + app |
| [node.ts](packages/ajo-kit/src/node.ts) | `dev`, `build`, `start`, `listen` functions |

### Auth (ajo-auth)

| File | Role |
|------|------|
| [types.ts](packages/ajo-auth/src/types.ts) | `AuthDatabase` schema + derived types (`User`, `Role`, etc.) |
| [store.ts](packages/ajo-auth/src/store.ts) | `configure(fn)` + `db()` typed with `Kysely<AuthDatabase>` |
| [wares.ts](packages/ajo-auth/src/wares.ts) | `session(lookup?)` middleware factory + `csrf` middleware |
| [guard.ts](packages/ajo-auth/src/guard.ts) | `protect()`, `guest()`, `auth()`, `role()`, `confirmed()`, `verified()`, `ability()`, `when()`, `redirect()` |
| [password.ts](packages/ajo-auth/src/password.ts) | Argon2id hash/verify |
| [session.ts](packages/ajo-auth/src/session.ts) | Create/validate sessions (30d, 365d with remember) |
| [cookie.ts](packages/ajo-auth/src/cookie.ts) | HttpOnly session cookie |
| [csrf.ts](packages/ajo-auth/src/csrf.ts) | Double-submit + same-origin check |
| [token.ts](packages/ajo-auth/src/token.ts) | Bearer tokens with abilities |
| [limit.ts](packages/ajo-auth/src/limit.ts) | In-memory rate limiting |
| [confirm.ts](packages/ajo-auth/src/confirm.ts) | Password confirmation stamps (3min) |
| [reset.ts](packages/ajo-auth/src/reset.ts) | Password reset tokens (1hr, hashed in DB) |
| [verify.ts](packages/ajo-auth/src/verify.ts) | Email verification (signed URLs, 24hr, no DB) |

### App Code

| File | Role |
|------|------|
| [wares.ts](src/wares.ts) | Root middleware: `timing`, `session()`, `csrf`, root redirect |
| [data/index.ts](src/data/index.ts) | Typed `db()`, app queries, validation fields |
| [data/types.ts](src/data/types.ts) | App tables (chats, participants, messages) + `DB = AuthDatabase & {...}` |

**Server-only:** Vite plugin blocks `handler.ts`, `wares.ts`, `src/data/*`, and auto-discovered `serverOnly` plugins from client.

### Imports

```typescript
// App code uses aliases (resolved by Vite + tsconfig paths)
import type { Request, Middleware } from '@kit'
import { AppError, NotFoundError } from '@kit'
import { db } from '/src/data'
import { parse, object, string } from '@kit/validate'
import { configure } from '@kit/auth'
import { session, csrf } from '@kit/auth/wares'
import { protect, role } from '@kit/auth/guard'
import { action } from '@kit/client'
import { subscribe } from '@kit/client'
import { emit } from '@kit/server'

// Migrations/seeds run outside Vite — use package names directly
import { connect, db, close } from 'ajo-kit/database'
```

### Plugin Convention

Packages declare `"kit"` field in `package.json`:

```json
{ "kit": { "alias": "auth", "serverOnly": true, "migrations": "./migrations/" } }
{ "kit": { "commands": "./src/commands.ts" } }
```

`discover()` scans `node_modules/ajo-*`, used by CLI and Vite plugin.

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
| `handler.ts` | `actions = {}` | Server | Shared Form actions |
| `handler.ts` | `events = {}` | Server | Real-time SSE events |

**Merge order:** `{ ...serverData, ...clientData }` — client wins.

**Parent chain:** `await parent()` returns merged ancestor data. See `links()` in [app.tsx](packages/ajo-kit/src/app.tsx).

**Defer:** Export `defer: true` to handle loading state locally. Innermost wins.

## Authentication

`ajo-auth` provides ready-to-use middleware + guards. App just imports and configures:

```typescript
// src/wares.ts
import { configure } from '@kit/auth'
import { session, csrf } from '@kit/auth/wares'
import { db } from '/src/data'

configure(() => db())

export default [timing, session(), csrf, ...] satisfies Middleware[]
```

**`session(lookup?)`** — Factory that returns middleware handling both cookie sessions and Bearer tokens. Default `resolve` loads user + roles from auth tables. Pass custom `lookup` to load extra fields.

**`csrf`** — Skips safe methods, API endpoints, and Bearer tokens. Throws `ForbiddenError`.

**Guards** (use in route-level `wares.ts`):

```typescript
import { protect, guest, role, auth, ability, confirmed, verified } from '@kit/auth/guard'
```

**Email:** [src/mail/index.ts](packages/ajo-kit/src/mail/index.ts) — `send()` + `configure()`. Console.log by default.

**Requires:** `APP_SECRET` env var for signed URLs.

## Database

SQLite + Kysely + better-sqlite3.

**Auth tables** (defined by `ajo-auth`): `users`, `sessions`, `roles`, `members`, `tokens`, `resets`.

**App tables** (defined in [types.ts](src/data/types.ts)): `chats`, `participants`, `messages`.

**Composition:** `type DB = AuthDatabase & { chats, participants, messages }` — intersection, never `extends`.

**Rule:** Always `select(['fields'])`, never `selectAll()`.

**Table versions:** Auto-tracked via `TrackerPlugin` in [tracker.ts](packages/ajo-kit/src/tracker.ts). Use `version()`, `bump()`, `snapshot()`.

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

**Manual invalidation:** `invalidate(key?)` from `@kit/client`. No key = clear all.

## Validation

Valibot schemas. Reusable fields in [fields.ts](src/data/fields.ts).

`parse(schema, data)` throws `InvalidError` with `{ fields: { name: ['errors'] } }`.

## Form Actions & API Endpoints

**Every `handler.ts` can export multiple handler types:**

```ts
export async function page(req, parent) { }    // Server data loading
export const actions = { name: async (req, res) => {} }  // Form actions (?/name)
export default { get, post, put, delete }       // API endpoints (METHOD /api/route)
```

**Form Actions (SPA):**
- Client: `const form = action<Result>('name')` → `form.loading`, `form.data`, `form.error?`, `form.handle`, `form.reset`
- Server: `export const actions = {}` in `handler.ts` → `POST /route?/actionName`
- CSRF: Required

**API Endpoints (Mobile/External):**
- Server: `default export { method() }` in `handler.ts` → `METHOD /api/route`
- Authentication: Cookie sessions OR Bearer tokens
- CSRF: Skipped (for Bearer tokens)
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

From `@kit`: `AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `InvalidError`.

## Serialization

`pack()` and `unpack()` from `@kit` use devalue for JSON with circular refs and custom types.

Objects with `toJSON()` are automatically serialized.

## Real-time Events (SSE)

Server → Client via SSE. Counterpart to Actions (client → server).

**Auto-emit:** Events fire automatically when their `deps` tables change. No manual `emit()` needed for broadcast events:

```ts
// handler.ts — auto-emit: any write to sessions/tokens triggers 'activity' event
export const deps = ['sessions', 'tokens', ':user']
export const events = {
  activity: async (req: Request) => {
    return { sessions: await db().selectFrom('sessions').where('user', '=', req.user!.id).execute() }
  }
}
```

**How it works:** `TrackerPlugin` intercepts writes → `bump(table)` → `tap()` looks up `deps` → `emit()` fires, debounced per microtask. Multiple table writes in one action = one emit per event.

**Manual emit** — only for param-filtered events (auto-emit can't know route params):

```ts
import { emit } from '@kit/server'

export const actions = {
  send: async (req: Request) => {
    await db().insertInto('messages').values({ ... }).execute()
    emit('messages', { id: String(req.params.id) })  // only clients viewing this chat
    return { ok: true }
  }
}
```

**Client subscription** with `subscribe()`:

```tsx
import { subscribe } from '@kit/client'

const Page: Stateful<PageArgs<Data>> = function* (args) {
  let messages = args.data?.messages ?? []

  subscribe<{ messages: Message[] }>('messages', ({ data, error }) => {
    if (error) return
    messages = data!.messages
  })

  while (true) {
    yield <ul>{messages.map(m => <li key={m.id}>{m.text}</li>)}</ul>
  }
}
```

**Key concepts:**

| Concept | Description |
|---------|-------------|
| `deps` + `events` | Auto-emit: table writes trigger events automatically |
| `emit(name, params?)` | Manual emit: only for param-filtered events |
| `subscribe(name, callback)` | Subscribe in component; auto-calls `component.next()` |
| Layout-level events | Handler with trailing group segment matches all subpaths (`(app)/handler.ts` → `/*`) |
| SSE-on-connect | Initial data sent when SSE connects, resolves navigation race conditions |

**Pitfall:** Don't overwrite event state with `args.data` inside `while(true)` — the SSE callback updates the variable, but re-reading from `args.data` overwrites it with stale data. Initialize before the loop, let `subscribe()` handle updates.

See [docs/data.md](docs/data.md) for full architecture, protections, and flow diagrams.

## Anti-patterns

- Secrets in `layout.tsx/page.tsx handler() and head()` (leaks to client)
- Use of `args.loading` without `defer` export (always false)
- Missing `NotFoundError` for 404s
- Context outside generator loop
- React patterns (`useState`, `className`, `onClick`)
- Missing `await parent()` in dependent handlers
- Missing `deps` export for cacheable handlers (causes unnecessary refetches)
- Manual `emit()` for broadcast events (auto-emit handles it via `deps`)
- Missing `deps` on handler with `events` (auto-emit won't work)
