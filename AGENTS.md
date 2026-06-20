# AGENTS.md

Root agent guide for `ajo-kit`. Keep this file practical, current, and aligned
with `ai/*.md`, `readme.md`, and the implementation in `packages/`, `src/`,
`db/`, and `tests/`.

`CLAUDE.md` imports this file with `@AGENTS.md`; do not duplicate guidance there.

## Commands

```bash
pnpm dev                 # Dev server
pnpm build               # Production build
pnpm start               # Run built server
pnpm exec tsc --noEmit   # Typecheck
pnpm test:unit           # Vitest unit suite
pnpm test:e2e            # Playwright E2E suite
pnpm test:prod           # Build + production smoke
pnpm test:all            # Unit + E2E
```

## Operating Principles

- Keep code micro, simple, cohesive, robust, and readable.
- Prefer direct concrete solutions over speculative architecture.
- Remove unnecessary abstractions, compatibility fallbacks, and dead code.
- Make changes in small honest slices; leave code looking intentional, not iterative.
- Read current implementation, tests, docs, migrations, and package boundaries before non-trivial edits.
- Preserve user work: do not revert, overwrite, or stage unrelated uncommitted changes.
- Optimize after measuring; add indexes or data structures only for measured or obvious hot paths.
- Test behavior, contracts, security boundaries, and regressions; do not test implementation trivia.
- Add short TSDoc descriptions to public APIs so IDE imports explain themselves.

## Naming

- Ajo-kit identifiers use one complete, meaningful word when file/module context is enough.
- Use multi-word identifiers only when one word is ambiguous in imports or public use, such as `clearSession`.
- Do not rename Node or external-library imports just to satisfy local naming style.
- Prefer existing local names, helpers, and package boundaries over new abstractions.

## Documentation Map

- `readme.md`: human guide and public API for building apps with Ajo and `ajo-kit`.
- `packages/*/README.md`: package-local public docs.
- `ai/architecture.md`: canonical implementation architecture and runtime contracts.
- `ai/production.md`: production-readiness refactor plan and phase checklist.
- `ai/LLMs.md`: app-building guide for AI agents using Ajo and `ajo-kit`.
- `ai/chat.md`: chat demo app behavior, data, scrolling, unread, and QA notes.
- `ai/comparison.md`: framework/auth/routing comparison context.
- `../ajo/LLMs.md`: Ajo UI syntax reference; load before writing TSX.

When documentation and code disagree, inspect the code and tests, update the docs
that are supposed to describe the current behavior, and keep stale history out of
architecture docs.

## Architecture Snapshot

`ajo-kit` is a full-stack metaframework for Ajo:

- Ajo TSX UI, not React.
- JSX uses the automatic Ajo runtime with `jsxImportSource: 'ajo'`.
- Filesystem routes come from `src/**/{layout,page}.{j,t}s{,x}` and `src/**/handler.{j,t}s{,x}`.
- Server loaders/actions are colocated with route UI.
- SSR, JSON navigation, route cache, ETag, topic versions, early `304`, and SSE live route payloads are built in.
- SQLite + Kysely own persistence.

Packages:

| Package | Alias | Role |
|---|---|---|
| `packages/ajo-kit` | `@kit`, `@kit/*` | Framework core, SSR, routing, data flow, database, validation |
| `packages/ajo-auth` | `@kit/auth` | Sessions, tokens, password, CSRF, guards, auth migrations |
| `packages/ajo-backup` | none | Google Drive backup tooling |

Core files:

| File | Role |
|---|---|
| `packages/ajo-kit/src/server.tsx` | SSR, wares/loaders/actions/API dispatch, freshness, SSE, `emit()` |
| `packages/ajo-kit/src/app.tsx` | Client router, route cache, JSON navigation, SSE live updates |
| `packages/ajo-kit/src/client.tsx` | Hydration and `action()` helper |
| `packages/ajo-kit/src/constants.ts` | Public types, errors, request helpers, formatting |
| `packages/ajo-kit/src/database.ts` | Kysely + SQLite connection |
| `packages/ajo-kit/src/vite.ts` | Vite plugin, aliases, virtual modules, server-only guard |
| `packages/ajo-auth/src/wares.ts` | Cookie session, bearer token, CSRF middleware |
| `packages/ajo-auth/src/guard.ts` | `protect`, `guest`, `auth`, `role`, `ability`, `confirmed`, `verified` |

## Route and Data Rules

Route files:

- `page.tsx`: Ajo UI component.
- `layout.tsx`: nested UI layout.
- `handler.ts`: `layout`, `page`, `head`, `actions`, and `/api/*` method handlers.
- `wares.ts`: middleware for a route subtree.

Data contracts:

- Loaders are server truth; components render durable data from `args.data`.
- `parent()` returns merged ancestor loader data; use it to remove real duplicate reads or payload fields.
- Live loaders call `req.track?.(topic)` for every topic they read.
- Mutations call `emit(topic | topic[])` after durable writes commit.
- Do not reintroduce implicit table tracking, `tracker.ts`, `deps`, `events`, sums, seals, or normalized client stores.
- Route JSON uses `hash`, `topics`, `versions`, `X-Have`, `X-Ajo-Versions`, and topic-version freshness.
- SSE revalidates affected routes and sends full route payloads, not patches.

Common topics:

- `user:<id>`, `dashboard:<id>`, `profile:<id>`, `sessions:<id>`, `tokens:<id>`
- `chats:<id>`, `chat:<chatId>`
- `admin:users`, `admin:sessions`, `admin:tokens`, `admin:stats`

## Ajo UI Rules

Load `../ajo/LLMs.md` before writing TSX. Key rules:

- Do not import React.
- Use `class`, not `className`.
- Use `set:onclick`, `set:oninput`, etc.; never React event casing.
- `style` is a string; `set:prop` assigns DOM properties.
- Use stable `key` for list elements.
- Use generator components for stateful UI, `this.next(fn?)` for re-rendering, and `this.signal` for cleanup.
- Use `for (const { prop } of this)` when render needs fresh args each cycle.
- Use `while (true)` when render does not need fresh args.
- Keep stateless components pure and direct; everything goes through `args`.

## Auth and Security

Root wares configure auth:

```ts
import { configure, wares } from '@kit/auth'
import { db } from '/src/data'

configure(() => db())

export default [wares.session(), wares.csrf]
```

Rules:

- Cookie sessions and bearer tokens both populate `req.user`.
- Bearer tokens authenticate only `/api/*`; explicit Bearer wins over cookies on API requests.
- CSRF protects unsafe cookie-auth writes; bearer-token requests bypass CSRF.
- `ability(...)` and `authorize(...)` restrict bearer-token abilities when `req.token` exists.
- Never return secrets from public endpoints.
- Session/API/reset tokens are stored hashed; plaintext is shown only once.
- Password reset/change/logout/revocation clear old credentials and confirmation state.
- Use dummy password verification where missing users could leak timing.
- Production 500+ errors serialize as `Internal Server Error`.

## Database Rules

- Use Kysely and explicit `select([...])`.
- Avoid `selectAll()` unless the full row is intentionally needed.
- Keep admin list reads bounded with `src/data/pagination.ts`.
- Runtime SQLite pragmas are intentional: WAL, foreign keys, busy timeout, `synchronous = NORMAL`.
- Multi-step logical writes use transactions; emit topics only after commit.

## Verification

For framework, security, data-flow, runtime, or cross-package changes run:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
```

For docs-only changes, run consistency searches and `git diff --check`.

Before committing:

- Review `git diff`.
- Stage only files belonging to the slice.
- Leave unrelated local changes unstaged.
- Use a clear commit message.

## Anti-Patterns

- React syntax or React hooks in TSX.
- Mutable local mirrors of server data when `args.data` is enough.
- Missing `req.track` in live loaders or missing `emit` after mutations.
- Emitting before transaction commit.
- Clearing the whole route cache manually instead of using topics.
- Adding abstractions before repeated concrete use proves they simplify code.
- Adding tests that only assert implementation details.
