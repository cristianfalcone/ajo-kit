# Refactor Log: Stateless Live Loaders

This document tracks the refactor that replaced the legacy data/cache/event architecture.

## Status

Completed.

## Goal

Move from implicit table/version tracking to explicit live updates:

- Before: tracker + deps/events + cache hash handshake
- Now: topic Pub/Sub (`req.track`, `emit`) + server diff + SSE patches

## What changed

### Removed

- `packages/ajo-kit/src/tracker.ts`
- handler exports `deps` and `events`
- client `subscribe()` and `invalidate()` helpers
- hash-based request cache protocol (`X-Have`, sums, seals)
- custom pack/unpack transport for runtime payloads

### Added / Consolidated

- `req.track(topic | topic[])` on request
- `emit(topic | topic[])` in `@kit/server`
- `liveConnections` registry with topic filtering
- `diff(a, b)` + JSON patch messages over SSE
- Stateless component model based on `args.data`

## Current architectural rules

1. If a loader must update live, it must call `req.track`.
2. If an action/API mutates tracked data, it must call `emit` for all impacted topics.
3. Components should render server data from `args.data`, not maintain a duplicated server-state cache.
4. Live updates are patch-based server revalidations, not client-side event payload merging.

## Migration checklist (for future modules)

- Remove `deps/events` exports if present.
- Replace event subscriptions in components with plain `args.data` rendering.
- Add `req.track` in each live loader.
- Add `emit` in each mutation path (including public/auth flows that affect admin or account pages).
- Verify with two concurrent sessions that pages refresh live.

## Known patterns implemented

- Chat room: `chat:<id>` topic + URL-based pagination + `markAsSeen` action.
- Account shell unread badge: `user:<id>` with active chat exclusion.
- Admin/account dashboards: per-domain topics (`admin:*`, `dashboard:<id>`, `sessions:<id>`, `tokens:<id>`).

## Regression checks

Run after architecture changes:

```bash
pnpm -s exec tsc --noEmit
pnpm build
```

Then validate manually with at least two sessions:

- session create/revoke
- token create/revoke
- profile updates
- chat send/seen/unread behavior
