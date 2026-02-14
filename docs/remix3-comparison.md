# ajo-kit vs Remix 3 (Updated)

This comparison reflects the current ajo-kit architecture after the live-data refactor.

## Summary

Both frameworks are server-first and route-centric, but they differ in live update strategy.

- **Remix 3**: loaders/actions + manual revalidation patterns (or app-specific realtime layer)
- **ajo-kit**: route handlers + explicit topic tracking (`track/emit`) with built-in SSE patch streaming

## Data Loading Model

| Topic | ajo-kit | Remix 3 |
|---|---|---|
| Route data source | `handler.ts` (`layout/page/head`) | `loader` |
| Mutation source | `actions` in `handler.ts` | `action` |
| Parent data chaining | `parent()` in handlers | nested route loader composition |
| Client state pattern | render from `args.data` | loader data/hooks |

## Live Updates

| Topic | ajo-kit | Remix 3 |
|---|---|---|
| Built-in realtime | Yes (SSE + JSON patch) | Not as first-class default |
| Subscription declaration | `req.track(topic)` in loaders | App-defined |
| Change publication | `emit(topic)` in mutations | App-defined |
| Partial payload updates | Server diff + patches | Depends on custom implementation |

### ajo-kit flow

1. Loader tracks topics with `req.track`.
2. Action/API mutation emits topics with `emit`.
3. Matching SSE connections revalidate loader pipeline.
4. Server computes diff and sends patches.
5. Client applies patch and re-renders from server state.

## API and Form Mutations

| Topic | ajo-kit | Remix 3 |
|---|---|---|
| Form mutation path | `POST /route?/actionName` | action route POST |
| External API endpoints | `default export { get/post/... }` under `/api/*` | resource routes / custom routes |
| Shared file for page + API | Yes (`handler.ts`) | Possible but different conventions |

## Developer Experience Trade-offs

### Where ajo-kit is strong

- Built-in explicit live model without app-level event bus wiring.
- Topic design is straightforward and observable in code.
- Server controls final state and patch computation.

### Where Remix may feel simpler

- Larger ecosystem and established patterns.
- Fewer custom conventions if team already uses Remix idioms.

## Concept Mapping

| Intent | ajo-kit | Remix 3 |
|---|---|---|
| Load route data | `page(req)` / `layout(req)` | `loader()` |
| Mutate route data | `actions` | `action()` |
| Emit realtime change | `emit(topic)` | custom pub/sub |
| Subscribe to realtime | `req.track(topic)` in loader | custom subscription layer |

## What changed in ajo-kit recently

Removed legacy concepts:

- handler `deps` / `events`
- table-tracker auto emit
- hash/X-Have cache protocol
- client `subscribe()` / `invalidate()`

Current design is intentionally explicit: track topics where data is read, emit topics where data is written.

## Practical Guidance

If you need built-in route-level live updates with minimal custom infra, ajo-kit now has a focused model:

- Keep UI stateless (`args.data`)
- Track topics in loaders
- Emit topics in all mutations
- Let framework patch and recompose

If your app does not need live updates, both frameworks work well with classic request/reload mutation flows.
