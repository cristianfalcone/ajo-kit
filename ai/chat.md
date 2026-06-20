# Chat System

Last updated: 2026-06-20

This document covers the chat implementation in:

- `src/(app)/account/chats/[id]/handler.ts`
- `src/(app)/account/chats/[id]/page.tsx`
- `src/(app)/account/chats/handler.ts`
- `src/data/index.ts`

For the shared route cache, SSE, and topic-version model, read `ai/architecture.md`.

## Product Goals

- Fast room UX with smooth scrolling.
- Bidirectional history loading.
- Bounded memory/DOM usage with a sliding local window.
- Strong unread UX: jump to first unread, pill, highlight, delayed mark-as-seen.
- UTC storage with local browser rendering.
- Simple code over generic chat infrastructure.

## Layers

1. Room UI state machine in `[id]/page.tsx`.
2. Room backend in `[id]/handler.ts`.
3. Chat list backend in `/account/chats/handler.ts`.
4. Shared unread helper in `src/data/index.ts`.

The room UI owns scroll anchors, unread highlighting, and the bounded message
window. Server data remains the source of truth.

## Framework Boundary

Chat is app-demo domain code. The framework-level contracts it uses are route
loaders/actions, route wares, explicit topics, `emit()`, route cache freshness,
and SSE revalidation. Those contracts are documented in `ai/architecture.md`.
This file owns chat-specific routes, data shape, unread behavior, scrolling, and
manual QA.

## Route and Auth Boundary

`src/(app)/account/chats/[id]/wares.ts` validates room membership for the chat
room subtree. The same boundary applies to GET loaders and POST actions for the
room, so private room data is protected before data loading and before
mutations.

## Data Invariants

- `messages.id` is monotonic and is the pagination cursor.
- `messages.created` and `participants.seen` are UTC timestamps.
- `participants.seen` means all messages up to that instant are seen by that user.
- Unread messages are incoming messages with `created > seen`.

Persistence indexes for the hot chat paths:

- `participants(user, chat)`
- `messages(chat, id)`
- `messages(chat, created)`

Chat detail unread metadata uses direct ISO timestamp comparison and one
aggregate query so SQLite can use `(chat, created)` for unread ranges. Do not add
more indexes or denormalized unread state without realistic measurements.

## Initial Room Load

The room loader tracks:

- `chat:<chatId>`
- `user:<userId>`

Chat list and shell routes also use:

- `chats:<userId>`
- `user:<userId>`

It returns:

- chat info
- participants
- last page of messages
- `hasMore`
- `me`
- `unreadCount`
- `oldestUnreadId`

`activeChatId` exists because the component can be reused across param-only
route changes. It gates one-time initialization for each room.

## Sending Messages

The `send` action:

1. Validates membership.
2. Inserts the message.
3. Reads participant ids.
4. Commits the transaction.
5. Emits `chat:<id>`, `chats:<participantId>`, and `user:<participantId>`.

The handler uses a SQLite UTC `strftime` expression for the inserted timestamp.
Topic emission happens after commit so live readers only observe committed data.

Client behavior:

- Clears input.
- Sticks to bottom when the sender was already in sender flow.
- Reconciles with the newest server window after the SSE live update.

## Pagination

Action shape:

- `load('older', cursor)` loads `id < cursor`.
- `load('newer', cursor)` loads `id > cursor`.

Client behavior:

- Auto-load older messages near the top threshold.
- Auto-load newer messages near the bottom threshold.
- Force-load when jumping to an unread target outside the current window.

## Sliding Window

The UI keeps a bounded message window:

- `trimWindow()` limits retained messages.
- `growPageSize()` adapts the base chunk size when larger chunks arrive.

This is intentionally local UI state. It avoids unbounded DOM growth without
introducing a global client data store.

## Scroll Anchoring

When older messages are prepended, the UI snapshots:

- anchor message id
- anchor top offset
- previous scroll top and scroll height

After DOM update it restores the viewport around the same anchor. If the anchor
node is unavailable, it falls back to scroll-height delta.

## Unread System

Backend source of truth:

- `unreadCount`
- `oldestUnreadId`

Client behavior:

- Jumps to first unread, not last unread.
- Shows a pill when the unread area is not visible.
- Delays mark-as-seen until unread is actually seen or bottom conditions are met.
- Dedupes mark-as-seen with `chatId:newestId:unreadCount`.

Mark-as-seen is guarded by:

- active route check
- document visibility check
- dedupe key

## Time Rendering

Backend:

- Stores UTC timestamps.
- Normalizes returned message timestamps to explicit UTC when needed.

Frontend:

- Uses `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat`.
- Treats offset-less timestamps as UTC before `Date` construction.
- Shows day separators and relative labels for recent messages.

## Chat List and Global Unread

`/account/chats` tracks:

- `chats:<userId>`
- `users:list`

It shows chat preview, last message, and unread count.

`src/data/index.ts` computes global unread count for the app shell, with an
optional active-chat exclusion.

## Manual QA

After chat changes:

1. Enter a chat with unread: jump to first unread and highlight rows.
2. Scroll up and load older: viewport should stay anchored.
3. Scroll down from old pages: newer pages should load.
4. Send while at bottom: stay pinned to latest.
5. Send while far from bottom: do not force scroll; show pill as needed.
6. Check timezone sanity: fresh messages should not appear in the future.

## Known Limits

- No edits, reactions, threads, attachments, or per-message read receipts.
- Unread/scroll state could be extracted into pure tests if this area changes.
- Pagination/anchor telemetry should stay opt-in unless a real bug needs it.
