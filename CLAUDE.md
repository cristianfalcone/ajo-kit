# CLAUDE.md

## Commands

```bash
pnpm dev                 # Dev server (HMR)
pnpm build               # Production build (client + SSR)
pnpm start               # Run built server
pnpm -s exec tsc --noEmit
```

## Principles

- No backward-compat constraints for the framework internals.
- Keep architecture explicit with topic-based live data flow.
- Prefer simple, predictable data flow over clever optimizations.

## Documentation Index

- [docs/LLMs.md](docs/LLMs.md) — Contributor + LLM implementation guide
- [docs/data.md](docs/data.md) — Data pipeline, live updates, topic design
- [docs/api-endpoints.md](docs/api-endpoints.md) — Actions vs `/api/*` endpoints
- `node_modules/ajo/LLMs.md` — Ajo UI syntax reference

## Current Architecture

`ajo-kit` is a full-stack metaframework for Ajo (JSX + generator components).

### Monorepo Packages

| Package | Alias | Role |
|---|---|---|
| `packages/ajo-kit` | `@kit`, `@kit/*` | Framework core |
| `packages/ajo-auth` | `@kit/auth`, `@kit/auth/*` | Auth, guards, session/token middleware |
| `packages/ajo-backup` | — | Google Drive backup tooling |

### Core Files (ajo-kit)

| File | Role |
|---|---|
| `packages/ajo-kit/src/constants.ts` | Shared types, errors, request helpers, `links()` |
| `packages/ajo-kit/src/server.tsx` | SSR, loader pipeline, actions, live SSE patching, `emit()` |
| `packages/ajo-kit/src/app.tsx` | Router, `resolve()`, SSE client patch application |
| `packages/ajo-kit/src/client.tsx` | Hydration + `action()` helper |
| `packages/ajo-kit/src/database.ts` | Kysely + SQLite connection helpers |
| `packages/ajo-kit/src/head.tsx` | Head merge/render/apply |
| `packages/ajo-kit/src/validate.ts` | Valibot parse/re-exports |

## Data Model

### Server-side loading

Data always comes from server handlers (`handler.ts`):

- `layout(req, parent?)`
- `page(req, parent?)`
- `head(req, parent?)`
- `actions = { ... }`

### Live updates

Live revalidation is explicit and topic-based:

1. Loaders subscribe via `req.track?.('topic')`.
2. Mutations notify via `emit('topic')`.
3. Server re-runs affected loaders, computes JSON patches (`diff()`), sends SSE patches.
4. Client applies patches over `state.rawServerData` and re-renders from `args.data`.

### Client model

- Stateless UI: render from `args.data`.
- Use `action()` for form and mutation requests.
- Keep server truth in `args.data`.

## Auth + Middleware

Configure auth in root wares and reuse guards in route wares.

```ts
import { configure } from '@kit/auth'
import { session, csrf } from '@kit/auth/wares'
import { db } from '/src/data'

configure(() => db())

export default [session(), csrf]
```

Available guards include `protect`, `guest`, `auth`, `role`, `ability`, `confirmed`, `verified`.

## Route Conventions

- `page.tsx` / `layout.tsx`: UI components.
- `handler.ts`: server logic (loaders, actions, API handlers).
- `wares.ts`: middleware per route subtree.

Route examples:

- `src/(app)/dashboard/page.tsx` -> `/dashboard`
- `src/blog/[id]/page.tsx` -> `/blog/:id`
- `src/docs/[...]/page.tsx` -> `/docs/*`

## Actions and API Endpoints

A single `handler.ts` can define both:

- Form actions: `export const actions = { ... }` (invoked by `?/name`)
- API routes: `export default { get, post, put, delete }` (mounted at `/api/<route>`)

Use actions for SPA mutations; use API endpoints for external/mobile clients.

## Database Rules

- SQLite + Kysely (`better-sqlite3`).
- Keep queries explicit (`select([...])`), avoid `selectAll()` unless justified.
- App DB type is composed in `src/data/types.ts`.

## Anti-patterns

- Storing mutable local mirrors of server data when `args.data` already contains truth.
- Forgetting to emit all affected topics after mutations.
- Forgetting to track topics in loaders that must stay live.
- Reading secrets in client-side files.
