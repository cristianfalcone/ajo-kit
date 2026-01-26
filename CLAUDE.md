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

| Location | Export | Runs On | Use For |
|----------|--------|---------|---------|
| `page.tsx` | `handler()` | Both | External APIs, public data |
| `handler.ts` | `page()` | Server | Database, secrets |
| `handler.ts` | `layout()` | Server | Shared layout data |
| `handler.ts` | `head()` | Server | Dynamic SEO |
| `handler.ts` | Named exports | Server | Form actions |

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

## Validation

Valibot schemas. Reusable fields in [fields.ts](src/data/fields.ts).

`parse(schema, data)` throws `InvalidError` with `{ fields: { name: ['errors'] } }`.

## Form Actions

Client: `const form = action<Result>('name')` → `form.loading`, `form.data`, `form.error?`, `form.handle`, `form.reset`.

`error` es `ActionError`: `{ status, message, fields? }`. Ver [constants.ts](src/constants.ts).

Server: Named export in `handler.ts` → `?/actionName` endpoint.

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

## Serialization

[serial.ts](src/serial.ts): `embed()` for SSR, `pack()`/`unpack()` for JSON.

## Errors

[constants.ts](src/constants.ts): `AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `InvalidError`.

## Anti-patterns

- Secrets in `page.tsx handler()` (leaks to client)
- `args.loading` without `defer` export (always false)
- Missing `NotFoundError` for 404s
- Context outside generator loop
- React patterns (`useState`, `className`, `onClick`)
- Missing `await parent()` in dependent handlers
