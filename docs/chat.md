# Chat System

Last updated: 2026-02-16

This document explains the current chat system implemented in:

- `src/(app)/account/chats/[id]/page.tsx`
- `src/(app)/account/chats/[id]/handler.ts`
- `src/(app)/account/chats/handler.ts`
- `src/data/index.ts`

It covers architecture, features, patterns, inspiration, and practical notes.

## Product goals

- Fast chat room UX with smooth scrolling.
- Infinite history in both directions (older and newer).
- Bounded memory/DOM usage with a sliding window.
- Strong unread UX: jump to first unread, pill, highlight, delayed mark-as-seen.
- Reliable time handling across timezones (UTC in DB, local rendering in browser).
- Keep implementation simple and maintainable (DRY, YAGNI, KISS).

## High-level architecture

The chat system has 4 layers:

1. Room UI state machine (`page.tsx`)
- Stateful generator component.
- Owns local chat timeline window and scroll/unread behavior.
- Calls actions: `send`, `load`, `markAsSeen`.

2. Room backend (`[id]/handler.ts`)
- Reads room data, paginates messages by cursor.
- Computes unread metadata (`unreadCount`, `oldestUnreadId`).
- Persists `send` and `markAsSeen`.
- Emits realtime invalidation events.

3. Chat list backend (`/account/chats/handler.ts`)
- Builds chat list preview (last message, unread count).
- Uses same unread criteria as room backend.

4. Shared data helper (`src/data/index.ts`)
- Computes global unread count used by account-level context/UI.

## Data model assumptions

The behavior relies on these invariants:

- `messages.id` is monotonic and canonical for ordering/pagination.
- `messages.created` and `participants.seen` are UTC timestamps.
- `participants.seen` means "all messages up to this instant are seen for this user".
- Unread messages are incoming messages with timestamp > seen timestamp.

## Core room features

### 1) Initial load

- Room page fetch returns:
  - chat info
  - participants
  - last `LIMIT` messages
  - `hasMore`
  - `me`
  - `unreadCount`
  - `oldestUnreadId`

- On room activation, UI initializes local window state and decides:
  - jump to first unread, or
  - stay at bottom.

Why `activeChatId` exists:

- The page component can be reused for param-only route changes in this stack.
- `activeChatId` gates one-time per-chat initialization inside the same component instance.

### 2) Sending messages

- `send` action inserts message in UTC (`nowUtc`).
- Emits channels:
  - `chat:<id>`
  - `chats:<participantId>`
  - `user:<participantId>`

UI behavior:

- Clears input.
- Marks intent to stick to bottom if user was already at bottom / sender flow.
- Reconciles with newest server window when needed.

### 3) Bidirectional pagination

Action:

- `load(direction, cursor)` where:
  - `direction = 'older'` uses `id < cursor`
  - `direction = 'newer'` uses `id > cursor`

Client behavior:

- Auto-load `older` near top threshold.
- Auto-load `newer` near bottom threshold.
- Supports force-load during unread jump if target is outside current window.

### 4) Sliding window (bounded timeline)

- UI never keeps unbounded history in memory.
- `trimWindow()` keeps a max window based on `WINDOW_PAGES * pageSize`.
- `growPageSize()` updates base chunk size dynamically as larger chunks arrive.

This avoids accumulation and keeps scroll/render costs predictable.

### 5) Scroll anchor restoration (no visual jump)

When older messages are prepended:

- UI snapshots:
  - anchor message id
  - anchor top offset
  - previous scroll top + scroll height
- After DOM update, it restores scroll so the viewport stays anchored.

Fallback is based on scroll-height delta if anchor node is not available.

### 6) Unread system

Unread metadata source of truth is backend:

- `unreadCount`
- `oldestUnreadId`

Client behavior:

- Derives unread anchor with safe fallback when needed.
- Shows unread pill when user is away from unread area.
- Pill click jumps to first unread (not last unread).
- Mark-as-seen is delayed until unread is actually seen or bottom conditions are met.

Mark-as-seen is guarded by:

- active route check
- document visibility check
- dedupe key (`chatId:newestId:unreadCount`)

### 7) Unread highlight

- Incoming unread rows get a row-level highlight.
- Highlight has hold + fade timing.
- Each message is highlighted once per room session (`unreadHighlightedOnceIds`).

### 8) Time and date UX

- Day separators in timeline.
- Today messages use relative time (seconds/minutes/hours).
- Older days use locale time format.
- Uses native `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat`.

### 9) Timezone correctness

Backend:

- Writes UTC ISO with `Z` via `nowUtc()`.
- Returns message `created` normalized as UTC ISO with `Z`.

Frontend:

- Parses timestamps safely.
- If a timestamp lacks explicit offset, parser appends `Z` before `Date` construction.

This prevents "future in 3 hours" bugs when browser local timezone differs from server/DB timezone.

## Chat list + global unread features

### Chat list (`/account/chats`)

- Shows each chat with:
  - title / other participant names
  - last message preview
  - unread count

- Uses id-based last-message lookup and `julianday` unread filtering.

### Global unread helper

- `src/data/index.ts` computes unread count across all chats.
- Optional `excludeChatId` for contextual usage.

## Patterns used

### DRY

- Shared unread semantics (`julianday(created) > julianday(seen)`).
- Shared UTC timestamp helper in room handler (`nowUtc()`).
- Shared helper functions in page for bottom offset, unread-id derivation, room reset.

### KISS

- Cursor pagination by `messages.id` only.
- No heavy virtualization lib; manual windowing is enough for current scope.
- Clear thresholds and straightforward state flags.

### YAGNI

- No message edits/reactions/threading yet.
- No attachment pipeline yet.
- No per-message read receipts; only participant-level `seen`.

## Inspiration and UX references

Interaction inspiration:

- WhatsApp:
  - day separators
  - relative "today" feel
  - history loading as user scrolls
- Mattermost:
  - "new messages" pill
  - jump to first unread
- Signal:
  - smooth continuity when traversing message history

Technical references:

- MDN `Intl.DateTimeFormat`:
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- MDN `Intl.RelativeTimeFormat`:
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
- CSS Scroll Anchoring concepts:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor

## Operational checklist (manual QA)

Use this checklist after chat changes:

1. Enter a chat with unread:
- Should jump to first unread.
- Pill should not block once unread is visible.
- Highlight should appear for unread rows.

2. Scroll far up and load older:
- No jump/loss of viewport.
- Current visible message should stay visually anchored.

3. Scroll down from old pages:
- Newer pages should load.
- Window should stay bounded (no unbounded accumulation).

4. Send while at bottom:
- Should remain pinned to latest message.

5. Send while far from bottom:
- Should not force scroll.
- Pill should appear with correct unread count.

6. Timezone sanity:
- No "in X hours" for fresh messages due to UTC/local mismatch.

## Known limits and future work

- Add unit/integration tests for unread anchor and scroll restore paths.
- Add explicit telemetry hooks for pagination/anchor recoveries.
- Consider extracting unread/scroll state machine into pure module for simpler testing.

