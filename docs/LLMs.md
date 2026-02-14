# Ajo-kit LLM Guide

This document is the working reference for coding agents and contributors.
Core model:

- Explicit topic Pub/Sub (`req.track`, `emit`)
- Server-side revalidation + JSON Patch over SSE
- Stateless client components (render from `args.data`)

## 1. Project Shape

```text
packages/
  ajo-kit/
    src/
      server.tsx      # data pipeline, actions, SSE patching, emit(topic)
      app.tsx         # router + resolve + client patch application
      client.tsx      # action() helper + SSR hydration
      constants.ts    # framework types + Request extensions
      database.ts     # Kysely + SQLite
  ajo-auth/
    src/
      wares.ts        # session(), csrf
      guard.ts        # protect(), guest(), role(), ability(), ...

src/
  (public)/**/handler.ts
  (app)/**/handler.ts
  data/index.ts       # typed db() + app query helpers
```

## 2. Server Contract

Route `handler.ts` can export:

- `layout(req, parent?)`
- `page(req, parent?)`
- `head(req, parent?)`
- `actions = { name: async (req, res?) => ... }`
- `default { get, post, put, patch, delete }` for API routes

## 3. Live Data Contract

### Track in loaders

Any loader whose data should update live must subscribe to topics:

```ts
export async function page(req: Request) {
  req.track?.('admin:tokens')
  const tokens = await db().selectFrom('tokens').select(['id']).execute()
  return { tokens }
}
```

### Emit in mutations

Any mutation must emit all affected topics:

```ts
export const actions = {
  revoke: async (req: Request) => {
    await db().deleteFrom('tokens').where('id', '=', req.body.id).execute()
    emit(['admin:tokens', 'admin:stats', `tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])
    return { revoked: true }
  }
}
```

## 4. Client Contract

Use `action()` for form/mutation calls.

```ts
const form = action<{ ok: true }>('send')
```

State model:

- Read server truth from `args.data`
- Avoid long-lived local mirrors unless strictly UI-local (input text, toggles)

## 5. Chat Pattern

For live chat pages:

- Track per-chat topic in loader: `req.track?.(`chat:${chatId}`)`
- Emit `chat:${chatId}` + dependent user/list topics on send
- Keep message rendering from `args.data.messages`
- If invoking side effects like `markAsSeen` from component, guard by active route to avoid cross-route action calls during navigation

## 6. Actions vs API

- Actions (`actions`) are route-scoped mutations used by SPA forms.
- API handlers (`default export`) are mounted under `/api/<route>`.
- API is appropriate for mobile/external clients.

## 7. Common Pitfalls

- Missing `req.track` in a loader => page never receives live patches
- Missing `emit` in a mutation => stale data in other tabs/users
- Emitting only self topics (forgetting admin/global topics)
- Calling actions during route teardown without checking active pathname

## 8. Topic Naming Convention

Use stable, explicit names:

- Per-user: `user:<id>`
- Dashboard summary: `dashboard:<id>`
- Sessions list: `sessions:<id>`
- Tokens list: `tokens:<id>`
- Chat list: `chats:<id>`
- Chat room: `chat:<chatId>`
- Admin lists: `admin:users`, `admin:sessions`, `admin:tokens`, `admin:stats`

Prefer emitting multiple precise topics over one broad catch-all topic.

## 9. Quick Checklist for New Feature

1. Add/extend loader in `handler.ts`.
2. Add `req.track?.(...)` topics.
3. Add mutation action.
4. Add `emit(...)` with all affected readers.
5. Render from `args.data` in `page.tsx`.
6. Run `pnpm -s exec tsc --noEmit`.
