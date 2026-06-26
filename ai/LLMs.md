# Ajo App LLM Guide

Last updated: 2026-06-26

This is the short app-building guide for AI agents using Ajo and `ajo-kit`.
It is not the repo maintenance guide; use `AGENTS.md` for working on this
repository itself. Use `readme.md` for the human public API guide,
`ai/architecture.md` for implementation internals, and `ai/chat.md` for the
chat demo app.

## Project Shape

Package setup is currently workspace/local: `ajo` is published on npm, but
`ajo-kit`, `ajo-auth`, and `ajo-backup` should be installed from workspace,
`file:`, or packed tarball dependencies until they are published.

```text
packages/
  ajo-kit/
    src/
      index.ts        # curated universal @kit root API
      server.tsx      # SSR runtime, send(), emit(), SSE fanout
      app.tsx         # client router, route cache, JSON navigation, SSE live updates
      client.tsx      # action() helper and SSR hydration
      ssr.ts          # devalue-backed SSR boot payload helpers
      cache.ts        # bounded route cache helpers
      freshness.ts    # route hash and topic-version freshness helpers
      timing.ts       # opt-in measurement helpers
      database.ts     # Kysely + SQLite pragmas
  ajo-auth/
    src/
      wares.ts        # session(), csrf
      guard.ts        # protect(), guest(), ability(), confirmed(), verified()

src/
  (public)/**/handler.ts
  (app)/**/handler.ts
  abilities.ts
  data/index.ts
  data/pagination.ts
  ui/pager.tsx
```

## Handler Contract

Route `handler.ts` files can export:

- `layout(req, parent?)`
- `page(req, parent?)`
- `head(req, parent?)`
- `actions = { name: async (req, res?) => ... }`
- `default { get, post, put, patch, delete, options, head }` for `/api/*`

## Auth And Abilities

- Root wares populate `req.user` through `@kit/auth`; bearer auth applies only
  to `/api/*`, and an explicit Bearer token wins over cookies there.
- Use `ability(...)` in route `wares.ts` and `authorize(req, ...)` inside
  handlers/actions. Do not check role names for access.
- Roles are assignment/display bundles. `req.user.abilities` is the account
  authorization surface.
- Cookie requests require account abilities. Bearer API requests require both
  account abilities and token abilities.
- Token creation must bound requested abilities by the authenticated account and
  by the current token when the caller is using bearer auth.
- Keep object ownership and field checks close to data reads/writes; constrain
  queries by owner where possible and use explicit `select([...])`.
- Admin reads use `admin:read`; admin mutations use `admin:write`.

## Live Data Contract

Loaders must track topics they read:

```ts
import type { Request } from '@kit'

export async function page(req: Request) {
  req.track?.('admin:tokens')
  return { tokens: await listTokens() }
}
```

Mutations must emit topics they changed:

```ts
import type { Request } from '@kit'
import { emit } from '@kit/server'

export const actions = {
  revoke: async (req: Request) => {
    await revokeToken(req.body.id)
    emit(['admin:tokens', 'admin:stats', `tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])
    return { revoked: true }
  }
}
```

For multi-step writes, use a transaction and call `emit()` after commit.

## Route Freshness

The client caches successful route states by URL. Returning to a visited route
sends `X-Have` and `X-Ajo-Versions`.

Server behavior:

- Fresh topic versions can return early `304` before loaders.
- Stale topic versions run loaders and may still return hash-based `304`.
- SSE live payloads update the active route cache hash/topics/versions.
- Relevant non-redirect actions reconcile the active route even when SSE is unavailable.
- The route cache is topic-invalidated and bounded by LRU/TTL helpers.

Do not reintroduce implicit table dependency tracking. The contract is explicit
topics.

## SSR and Protocol Boundaries

- `ai/architecture.md` is the source of truth for data flow, SSR, freshness, and protocol boundaries.
- Use `devalue` only for the SSR boot payload.
- Keep route JSON, actions, SSE messages, and public API responses as plain JSON.
- Do not make handlers return non-JSON values just because the SSR serializer can support them.
- If an action changes topics and does not redirect, the active route should reconcile through SSE first, then JSON fallback if needed.

## Client Rules

- Use `action()` for form/mutation calls.
- Wait for `html[data-ajo-ready="true"]` in browser/e2e automation.
- Render server truth from `args.data`.
- Use `export const pending = true` in the page or innermost layout that should
  receive `loading=true` during client navigation.
- Keep only UI-local state locally.
- Avoid long-lived mirrors of server arrays unless the feature explicitly needs a
  bounded local window.

## Pagination

Admin list routes use `paginate`, `pageRows`, and `pageInfo` from
`src/data/pagination.ts`, then render `Pager` from `src/ui/pager.tsx`.

Keep list reads bounded. Do not add totals unless the UI needs them.

## Timing

Use this only while measuring:

```powershell
$env:AJO_TIMING = "1"
pnpm dev
```

Timing headers/logs:

- `Server-Timing`
- `X-Ajo-Bytes`
- `X-Ajo-Cache`

Use `AJO_TIMING=1` route headers/logs during investigations; do not import
framework timing internals from app code.

## Production Topology

Assume one `kit start` Node process with one SQLite database file. Do not design
new app features that rely on multi-instance coherence unless the app explicitly
adds a shared topic bus and shared rate-limit store.

Process-local framework state:

- route topic versions
- active SSE connections
- pending live fanout
- auth rate limits
- password confirmation stamps

Keep mutations durable in SQLite and emit topics after commit. Treat reverse
proxy TLS/restart/edge limits as deployment concerns around the single app
process.

Production env for apps:

- `APP_URL`: public `http` or `https` origin for non-local deployments.
- `APP_SECRET`: 32+ random characters when using `ajo-auth`.
- `DATABASE_PATH`: persistent SQLite file path if the app connects from env.

## Topic Names

Use the current app topic vocabulary from `ai/architecture.md`. Prefer multiple
precise topics over a broad catch-all. Chat-specific topic names live in
`ai/chat.md`.

## Common Pitfalls

- Missing `req.track` in a live loader.
- Missing `emit` after mutation.
- Emitting only self topics and forgetting admin/global topics.
- Emitting before a transaction commits.
- Clearing the whole route cache manually instead of relying on emitted topics.
- Adding indexes or abstractions before measuring a real hot path.

## Verification

For framework/data changes:

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm test:all
pnpm test:prod
```

For docs-only changes, use consistency searches instead of running the full app.


