# Data System

This document describes the current data architecture used by `ajo-kit`.

## Overview

The framework uses a server-driven model:

1. Loaders run on server (`layout/page/head` in `handler.ts`).
2. Loaders declare live interest through explicit topics (`req.track`).
3. Mutations publish topic updates (`emit`).
4. Server revalidates affected connections, computes JSON patches, and streams patches over SSE.
5. Client applies patches and re-renders from server state.

## Core Files

| File | Responsibility |
|---|---|
| `packages/ajo-kit/src/server.tsx` | Data middleware, topic tracking, live connection registry, diff/emit/SSE |
| `packages/ajo-kit/src/app.tsx` | Route resolve flow, SSE stream handling, JSON patch apply on client state |
| `packages/ajo-kit/src/client.tsx` | `action()` helper and SSR bootstrap |
| `packages/ajo-kit/src/constants.ts` | Shared types + Request extensions (`topics`, `track`) |

## Request Pipeline

### GET page request

For route `/foo`:

1. Route wares execute.
2. Data middleware initializes:
   - `req.topics = new Set()`
   - `req.track(topic)`
3. All relevant `layout/page/head` handlers run on server.
4. Middleware stores:
   - `req.head`
   - `req.entries`
   - `req.revalidate` (closure to re-run same loader pipeline)
5. SSR returns HTML + serialized state.

### AJAX page load

`Accept: application/json` returns:

```json
{ "head": { ... }, "data": [ ...entries ] }
```

## Live Update Pipeline

### 1) Track

Loaders opt-in:

```ts
export async function layout(req: Request) {
  req.track?.(`user:${req.user!.id}`)
  return { ... }
}
```

### 2) Emit

Mutations publish topics:

```ts
emit([`user:${id}`, `dashboard:${id}`, 'admin:users'])
```

### 3) Revalidate affected connections

Server keeps `liveConnections`:

```ts
type LiveConnection = {
  req: Request
  topics: Set<string>
  lastData: any[]
  revalidate: () => Promise<any[]>
  send: (patches: any[]) => void
}
```

When `emit()` is called:

- Topics are debounced (10ms window)
- Each connection is checked for topic intersection
- Matching connections run `revalidate()`
- Server computes `patches = diff(lastData, newData)`
- Non-empty patches are sent via SSE

### 4) Client applies patches

Client updates `state.rawServerData` and derives:

- `state.head`
- `state.data`

Then recomposes current route tree.

## Patch Format

Server emits standard JSON Patch-like ops:

- `replace`
- `add`
- `remove`

The diff algorithm includes array heuristics for append/prepend/shift patterns to avoid full-array replacement when possible.

## Topic Design Guidelines

### Prefer explicit domains

- `user:<id>` for global app-shell user/unread state
- `dashboard:<id>` for dashboard cards/metrics
- `tokens:<id>` and `sessions:<id>` for account pages
- `admin:*` for admin aggregate pages
- `chat:<chatId>` and `chats:<id>` for chat room and chat list

### Emit all affected readers

If one action changes data seen by multiple pages, emit all related topics.

Example: creating a token from API login should emit:

- personal tokens page topic
- dashboard topic
- user shell topic
- admin tokens/stats topics

## Stateless UI Guidance

In `page.tsx` / `layout.tsx`:

- Render from `args.data`
- Keep only UI-local state locally (input drafts, modal open flags)
- Avoid storing duplicated server arrays unless there is a strong reason

## Error Handling

- Loader failures produce `AppError` paths rendered by error pipeline.
- Live revalidation failures are logged server-side and do not crash active connections.

## Performance Notes

- Topic filtering keeps revalidation scoped to interested clients.
- Debounced emits coalesce mutation bursts.
- Diff-based patches reduce payload size vs full re-send in many list-update cases.
