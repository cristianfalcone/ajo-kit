# Ajo-kit LLM Instructions

Full-stack metaframework for Ajo (JSX + generators).

**For Ajo UI library syntax:** See `node_modules/ajo/LLMs.md`

## Project Structure

```
src/
├── app.tsx          # Router (DO NOT MODIFY)
├── server.tsx       # SSR + API (DO NOT MODIFY)
├── client.tsx       # Hydration (DO NOT MODIFY)
├── constants.ts     # Types, contexts, utilities
├── layout.tsx       # Root layout (defer: true for global loading)
├── page.tsx         # Home page (/)
├── handler.ts       # Root handlers + actions
├── wares.ts         # Root middleware
└── ui/              # Reusable components
```

## Routing

| Pattern | URL |
|---------|-----|
| `src/page.tsx` | `/` |
| `src/blog/page.tsx` | `/blog` |
| `src/blog/[id]/page.tsx` | `/blog/:id` |
| `src/blog/[...]/page.tsx` | `/blog/*` (catch-all) |
| `src/(group)/page.tsx` | `/` (group ignored) |

## Component Types

```typescript
// src/constants.ts
type PageArgs<T> = {
  params: Params
  data?: T
  loading: boolean      // true only if component exports defer = true
  error?: AppError
}

type LayoutArgs<T> = PageArgs<T> & { children: Children }
```

## Data Loading

### Client-side (page.tsx / layout.tsx)

Runs on **both** server and client. For external APIs only:

```typescript
// In page.tsx or layout.tsx
import type { Context, Parent } from '/src/constants'

export async function handler({ url, params }: Context, parent: Parent) {
  const data = await parent()  // ancestor data
  return { posts: await fetch('...').then(r => r.json()) }
}
```

### Server-side (handler.ts)

Runs on **server only**. For database, secrets, heavy computation:

```typescript
import type { Request } from 'polka'
import type { Parent } from '/src/constants'

export async function page(req: Request, parent: Parent) {
  const data = await parent()
  return { secret: process.env.KEY }
}

export async function layout(req: Request, parent: Parent) {
  return { user: req.user }
}
```

**Merge order:** `{ ...handler.ts, ...page.tsx/layout.tsx }` — client wins.

## Form Actions

### Server (handler.ts)

Export `actions` object in handler.ts → `?/actionName` endpoints:

```typescript
export const actions = {
  subscribe: async (req: Request, res: Response) => {
    const { email } = req.body
    await db().insertInto('subscribers').values({ email }).execute()
    return { success: true }  // or { redirect: '/thanks' }
  }
}
```

### Client (page.tsx)

```typescript
import { action } from '/src/app'

const form = action<{ success: boolean }>('subscribe')

// form.loading   - boolean
// form.data      - success response
// form.error     - { status, message, fields? }
// form.handle    - submit handler
// form.reset     - clear state
```

```tsx
<form set:onsubmit={form.handle}>
  <input name="email" disabled={form.loading} />
  <button disabled={form.loading}>Subscribe</button>
  {form.data && <p>Subscribed!</p>}
  {form.error && <p class="error">{form.error.message}</p>}
  {form.error?.fields?.email && <p>{form.error.fields.email[0]}</p>}
</form>
```

## Defer & Loading

Only ONE component shows loading, determined by `defer` export:

```typescript
export const defer = true  // This component handles loading UI
```

- **With defer:** Component receives `loading: true` during fetch
- **Without defer:** Root layout handles loading, component gets `loading: false`

Root layout should have `defer: true` for global loading UI.

## Middleware (wares.ts)

```typescript
import type { Middleware } from 'polka'

export default [
  timing,
  session,
] satisfies Middleware[]
```

Execution: root → leaf (ancestors before handlers).

## Errors

```typescript
import { NotFoundError, AppError } from '/src/constants'

// In loaders
if (!post) throw new NotFoundError()
throw new AppError(400, 'Bad request')
```

## Head (SEO)

```typescript
// page.tsx or layout.tsx - runs on both
export async function head({ url, params }: Context, parent: Parent) {
  const data = await parent()
  return { title: 'Page Title', meta: [{ name: 'description', content: '...' }] }
}

// handler.ts - runs on server only
export async function head(req: Request, parent: Parent) {
  const data = await parent()
  return { title: `${data.name}'s Profile` }
}
```

## Caching (deps)

Export `deps` in handler.ts to enable skip-on-fresh:

```typescript
// handler.ts — handler-level deps (all-or-nothing skip)
export const deps = ['users', ':user']

export async function page(req: Request, parent: Parent) {
  return { user: await db.getUser(req.user.id) }
}
```

```typescript
// handler.ts — per-key deps (each return key cached independently)
export const deps = {
  user: ['users', 'members', ':user'],
  stats: ['sessions', 'tokens', 'participants', 'messages', ':user'],
  recentSessions: ['sessions', ':user'],
}

export async function page(req: Request) {
  return { user: ..., stats: ..., recentSessions: ... }  // keys match deps keys
}
```

**How it works:**
1. Client sends `X-Have` header with cached sums
2. Server generates sum from `deps` (table versions + user + ttl)
3. If sums match → skip handler, return `null` (client uses cache)

**Per-key deps:** When `deps` is an object, each key maps to a return key. Only stale keys are re-fetched; fresh keys return `null` and the client merges cached values. This avoids re-running expensive queries when only one table changed.

**Special deps:**
- `':user'` — include user ID in sum (skip if same user)
- `':ttl:60000'` — include time bucket (skip if <60s passed)

**Manual invalidation:** `invalidate(key?)` from `/src/app`. No key = clear all.

## Real-time Events (SSE)

Server → client events via SSE. Counterpart of form actions (client → server).

### Auto-emit (default)

Events fire automatically when their `deps` tables change. No manual `emit()` needed:

```typescript
// handler.ts — this is all you need for automatic real-time updates
export const deps = ['sessions', 'tokens', ':user']

export const events = {
  activity: async (req: Request) => {
    return { sessions: await db().selectFrom('sessions').where('user', '=', req.user!.id).execute() }
  }
}
```

**How it works:** `TrackerPlugin` intercepts every INSERT/UPDATE/DELETE → calls `bump(table)` → `tap()` callback looks up which events depend on that table via `deps` → `emit()` fires automatically, debounced per microtask.

**Requirements for auto-emit:**
1. Handler exports `deps` with table names (e.g. `['sessions', 'tokens']`)
2. Handler exports `events` with event handlers
3. That's it — any action writing to those tables triggers the events

### Manual emit (param-filtered events only)

Use `emit(name, params)` manually **only** when events need route param filtering:

```typescript
import { emit } from '/src/server'

export const events = {
  messages: async (req: Request) => {
    return { messages: await db().selectFrom('messages').where('chat', '=', Number(req.params.id)).execute() }
  }
}

export const actions = {
  send: async (req: Request) => {
    await db().insertInto('messages').values({ ... }).execute()
    emit('messages', { id: String(req.params.id) })  // only clients viewing this chat
    return { ok: true }
  }
}
```

Auto-emit cannot know route params, so `emit(name, { param })` stays manual. Broadcast events (no params) are always automatic.

### Client (page.tsx)

```typescript
import { subscribe } from '/src/client'

const Chat: Stateful<PageArgs<Data>> = function* (args) {
  let messages = args.data?.messages ?? []  // SSR initial value

  subscribe<{ messages: Message[] }>('messages', ({ data, error }) => {
    if (error) return
    messages = data!.messages
  })

  while (true) {
    yield <ul>{messages.map(m => <li key={m.id}>{m.text}</li>)}</ul>
  }
}
```

### Key Concepts

| Concept | Detail |
|---------|--------|
| **Auto-emit** | Events with `deps` fire automatically on table writes. No manual `emit()` needed |
| **Manual emit** | Only for param-filtered events: `emit('messages', { id: '5' })` |
| **SSE-on-connect** | All matching event handlers run immediately when SSE connects, sending initial data |
| **Layout-level events** | Events in layout handlers (trailing group segment) match all subpaths. `(app)/handler.ts` → `/*` |
| **Microtask debounce** | Multiple table writes in one action coalesce into a single emit per event name |
| **Wares protect SSE** | Same middleware runs for both page requests and SSE connections |

### Pitfall: Don't overwrite SSE state in the loop

```typescript
// WRONG — args.data overwrites SSE state on re-render
while (true) {
  if (args.data?.items) items = args.data.items  // overwrites SSE update
  yield ...
}

// RIGHT — initialize before loop, let subscribe() handle updates
let items = args.data?.items ?? []
subscribe('items', ({ data }) => { items = data!.items })
while (true) { yield ... }
```

## Rules

| Topic | Rule |
|-------|------|
| **Pages** | Export `default` component + optional `handler()`, `head()`, `defer` |
| **Layouts** | Export `default` component + optional `handler()`, `head()`, `defer`. Receives `LayoutArgs<T>` |
| **page/layout.tsx handler()** | External APIs only (runs on both server and client) |
| **page/layout.tsx head()** | SEO metadata (runs on both server and client) |
| **handler.ts page()** | Database, secrets, server-only (never bundled to client) |
| **handler.ts layout()** | Server-only shared layout data |
| **handler.ts head()** | Server-only dynamic SEO (access to req, secrets) |
| **Form actions** | `export const actions = {}` in handler.ts → `?/actionName`, use `action('name')` client-side |
| **Events export** | `export const events = {}` in handler.ts → SSE event handlers returning data. Auto-emitted via `deps` |
| **defer** | `export const defer = true` = component handles its own loading UI |
| **parent()** | Always `await parent()` in loaders for ancestor data |
| **404** | Throw `NotFoundError` when data not found |
| **Errors** | `AppError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `InvalidError` |
| **Middleware** | Export default function or array from `wares.ts`, runs root → leaf |
| **Route groups** | `(name)/` folders organize code, excluded from URL |
| **Dynamic segments** | `[param]` for single, `[...]` for catch-all |
| **Core files** | Never modify `app.tsx`, `server.tsx`, `client.tsx` |
| **Constants** | Global in `src/constants.ts`, section-specific in `src/(section)/constants.ts` |
| **Components** | Global in `src/ui/`, section-specific in `src/(section)/ui/` |
| **Validation** | Valibot schemas, `parse()` throws `InvalidError` with `{ fields }` |
| **Auth guards** | `protect()`, `guest()`, `auth()`, `role()`, `confirmed()`, `verified()` |
| **Caching** | Export `deps` (array or object) in handler.ts for skip-on-fresh. Object = per-key granularity. `invalidate()` for manual clear |
| **Events** | `export const events = {}` in handler.ts. Handlers receive `Request`, return data |
| **emit()** | `emit(name, params?)` from `/src/server`. Only needed for param-filtered events |
| **subscribe()** | `subscribe(name, callback)` from `/src/client`. Call before `while (true)` loop |
| **SSE state** | Initialize from `args.data` before loop. Never re-assign from `args.data` inside loop |

## Anti-patterns

| ❌ Wrong | ✅ Correct | Why |
|----------|-----------|-----|
| Secrets in `page.tsx handler()` | Secrets in `handler.ts page()` | page.tsx may reach client bundle |
| `args.loading` without `defer` | Export `defer = true` first | loading is always false without defer |
| Context outside generator loop | Context inside `while (true)` | Only updates on each yield |
| `parent()` without await | `await parent()` | Returns Promise, not data |
| Missing `NotFoundError` | `if (!data) throw new NotFoundError()` | Silent null causes runtime errors |
| `className`, `onClick` | `class`, `set:onclick` | React patterns don't work in Ajo |
| `useState`, `useEffect` | Generator state + `this.next()` | Ajo uses generators, not hooks |
| Modifying core files | Create new routes/components | app.tsx, server.tsx, client.tsx are generated |
| `selectAll()` in queries | `select(['field1', 'field2'])` | Overfetching, performance |
| Direct `form.error.fields` access | `form.error?.fields?.email` | error and fields are optional |
| Missing `deps` in handler.ts | `export const deps = ['table']` or `{ key: ['table'] }` | Causes unnecessary refetches |
| Re-assign SSE state from `args.data` in loop | Initialize before loop, `subscribe()` updates | Loop overwrites SSE data with stale args |
| Manual `emit()` for broadcast events | Let auto-emit handle it via `deps` | Broadcast events fire automatically on table writes |
| Missing `deps` on handler with `events` | `export const deps = ['table']` | Auto-emit requires `deps` to know which tables trigger which events |

## Styling (UnoCSS)

```tsx
<div class="flex items-center gap-4 p-4">
<span class="i-lucide-home w-6 h-6" />
```
