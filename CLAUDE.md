# CLAUDE.md

This is the local agent guide for `ajo-kit`. Keep it aligned with `ai/*.md` and
the current implementation in `packages/`, `src/`, `db/`, and `tests/`.

## Commands

```bash
pnpm dev                 # Dev server
pnpm build               # Production build
pnpm start               # Run built server
pnpm exec tsc --noEmit   # Typecheck
pnpm test:unit           # Vitest unit suite
pnpm test:e2e            # Playwright E2E suite
pnpm test:all            # Unit + E2E
```

## Operating Principles (ajo-way)

- Keep code micro, simple, elegant and readable.
- Prefer direct, concrete solutions over speculative architecture.
- Remove unnecessary abstractions and dead code.
- Use one complete, meaningful word for identifiers when file/module context is enough.
- Use multi-word identifiers when one word is ambiguous in imports or public use, such as `clearSession`.
- Do not rename Node or external-library imports just to match local naming style.
- Add short TSDoc descriptions to public APIs so IDE imports explain themselves.
- Apply TDD principles pragmatically: write tests for new features and bugs, but do not write tests for the sake of writing tests.
- Apply DRY, YAGNI, KISS, POLA and SOLID pragmatically when they help produce simpler, clearer, more maintainable code.
- Optimize after measuring, not before.
- Boy Scout rule: leave the code cleaner than you found it.
- Leave code in a state that looks intentional, not iterative.

## Documentation Index

- `readme.md`: human guide and public API for building apps with Ajo and `ajo-kit`.
- `packages/*/README.md`: package-local public docs.
- `ai/architecture.md`: canonical implementation architecture, data flow, SSR, APIs, auth, security, persistence, build, and tests.
- `ai/LLMs.md`: short operational guide for agents.
- `ai/chat.md`: chat-specific state, unread, pagination, scroll behavior.
- `ai/comparison.md`: external framework comparisons.
- `../ajo/LLMs.md`: Ajo UI syntax reference. Load this before writing TSX.

## Architecture

`ajo-kit` is a full-stack metaframework for Ajo:

- Ajo TSX UI, not React.
- JSX uses the automatic Ajo runtime: `jsx: 'automatic'` and `jsxImportSource: 'ajo'`.
- Filesystem route discovery from `src/**/handler.ts`.
- Server loaders and actions colocated with pages.
- SSR plus JSON navigation.
- Route cache with ETag, `X-Have`, topic versions, and early `304`.
- Explicit live data with `req.track(topic)` and `emit(topic)`.
- SSE revalidation sends route payloads to active routes.
- SQLite + Kysely for persistence.

### Packages

| Package | Alias | Role |
|---|---|---|
| `packages/ajo-kit` | `@kit`, `@kit/*` | Framework core, SSR, routing, data flow, database, validation |
| `packages/ajo-auth` | `@kit/auth` | Sessions, tokens, password, CSRF, guards, auth migrations |
| `packages/ajo-backup` | none | Google Drive backup tooling |

### Core Files

| File | Role |
|---|---|
| `packages/ajo-kit/src/server.tsx` | SSR, wares/loaders/actions/API dispatch, route freshness, SSE, `emit()` |
| `packages/ajo-kit/src/app.tsx` | Client router, route cache, JSON navigation, SSE live updates |
| `packages/ajo-kit/src/client.tsx` | Hydration and `action()` helper |
| `packages/ajo-kit/src/freshness.ts` | Route hash and topic-version helpers |
| `packages/ajo-kit/src/database.ts` | Kysely + SQLite connection with runtime pragmas |
| `packages/ajo-kit/src/timing.ts` | Opt-in measurement helpers |
| `packages/ajo-auth/src/wares.ts` | Cookie session, bearer token, CSRF middleware |
| `packages/ajo-auth/src/guard.ts` | `protect`, `guest`, `auth`, `role`, `ability`, `confirmed`, `verified` |
| `src/data/index.ts` | App query helpers and typed `db()` |
| `src/data/pagination.ts` | Bounded pagination helper for admin lists |

## Route Conventions

Route files:

- `page.tsx`: UI component.
- `layout.tsx`: nested UI layout.
- `handler.ts`: server loaders, actions, and API handlers.
- `wares.ts`: middleware for a route subtree.

Handler exports:

- `layout(req, parent?)`
- `page(req, parent?)`
- `head(req, parent?)`
- `actions = { name: async (req, res?) => ... }`
- `default { get, post, put, patch, delete, options, head }` for `/api/*`

Route examples:

- `src/(app)/dashboard/page.tsx` -> `/dashboard`
- `src/(app)/account/chats/[id]/page.tsx` -> `/account/chats/:id`
- `src/(public)/reset/[token]/page.tsx` -> `/reset/:token`

## Data Flow Rules

The canonical source is `ai/architecture.md`.

- Loaders are server truth.
- Components render from `args.data`.
- Live loaders must call `req.track?.(...)`.
- Mutations that affect tracked data must call `emit(...)`.
- Multi-step writes use transactions.
- Emit topics after the transaction commits.
- Avoid client-side mirrors of server arrays unless the feature needs bounded local state, like chat.
- Do not reintroduce `tracker.ts`, `deps`, `events`, sums/seals, or implicit table tracking.

Route freshness:

- Successful SSR/JSON responses carry `hash`, `topics`, and `versions`.
- Client re-navigation sends `X-Have` and `X-Ajo-Versions`.
- Fresh topic versions can return early `304` before loaders.
- Stale topic versions re-run loaders and may still return hash-based `304`.
- SSE live payloads refresh active route cache metadata.

Topic names:

- `user:<id>`
- `dashboard:<id>`
- `profile:<id>`
- `sessions:<id>`
- `tokens:<id>`
- `chats:<id>`
- `chat:<chatId>`
- `admin:users`
- `admin:sessions`
- `admin:tokens`
- `admin:stats`

## Ajo UI Rules

Load `../ajo/LLMs.md` before writing TSX. Key rules:

- Do not import React.
- Do not manually import `h` or `Fragment`; the build tool imports from `ajo/jsx-runtime`.
- Use `class`, never `className`.
- Use `set:onclick`, `set:oninput`, etc.; never React event casing.
- `style` is a string, not an object.
- `set:prop` assigns DOM properties.
- Use `ref={el => ...}`; refs receive `null` on unmount.
- List elements need stable `key`.
- Use `memo` and `skip` intentionally.
- Use `clsx()` or template strings for conditional classes.

Stateful components:

- Use generator components.
- Destructure initial args in the generator signature when useful for init code.
- Use `for (const { prop } of this)` when render needs fresh args each cycle.
- Use `while (true)` when render does not need fresh args.
- Keep state and handlers before the render loop.
- Use `this.next(fn?)` for state changes that re-render.
- Use `this.signal` for cleanup-aware listeners/fetches.
- Use `<>...</>` inside stateful render loops to avoid double wrappers.
- If changing the wrapper tag, set both the generic and `.is`.

Stateless components:

- Everything goes through `args`.
- Special attrs like `memo` must be applied to actual elements inside.
- Keep them pure and direct.

## Auth and Security

Root wares configure auth:

```ts
import { configure } from '@kit/auth'
import { wares } from '@kit/auth'
import { db } from '/src/data'

configure(() => db())

export default [wares.session(), wares.csrf]
```

Rules:

- Cookie sessions and bearer tokens both populate `req.user`.
- CSRF protects cookie-auth writes; bearer-token requests bypass CSRF.
- `ability(...)` restricts bearer-token abilities when `req.token` exists.
- Do not return secrets from public endpoints.
- API/reset tokens are stored hashed; plaintext is shown only once.
- Use dummy password verification on login paths where missing users could leak timing.

## Database Rules

- Use Kysely and explicit `select([...])`.
- Avoid `selectAll()` unless the full row is intentionally needed.
- Keep admin list reads bounded with `src/data/pagination.ts`.
- Add indexes only for measured or obvious hot paths.
- Runtime SQLite pragmas are intentional: WAL, foreign keys, busy timeout, `synchronous = NORMAL`.

## Testing Rules

Test features, contracts, and regressions; do not test just to increase count.

Use unit tests for:

- Pure helpers.
- Validation/parsing logic.
- Route freshness and cache metadata helpers.
- Auth token/session/reset/CSRF/guard behavior with controlled DB or request inputs.
- Package APIs whose edge cases are cheap to isolate.

Use E2E tests for:

- User-visible page flows.
- Auth flows.
- Admin/account pages.
- API endpoints.
- Route freshness and live data behavior.
- Cross-page navigations such as `/admin/users -> /admin/sessions -> /admin/users`.
- Complete interactions where browser behavior matters.

Use integration tests only when:

- Unit tests would mock away the important contract.
- E2E tests would be too slow/flaky or too indirect.
- The target is a server-only boundary such as middleware + handler dispatch, migrations, or DB-backed package behavior.

Before finishing a test slice:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
```

If a slice is docs-only, consistency searches are enough.

## Anti-Patterns

- React syntax or React hooks in TSX.
- Storing mutable local mirrors of server data when `args.data` is enough.
- Forgetting `req.track` in live loaders.
- Forgetting `emit` after mutations.
- Emitting before transaction commit.
- Clearing the whole route cache manually instead of using topics.
- Adding broad abstractions before a second concrete use case exists.
- Adding tests that only assert implementation trivia.
