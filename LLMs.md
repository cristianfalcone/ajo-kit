# Ajo-kit LLM Instructions

Ajo-kit is a full-stack metaframework for building web applications with Ajo. It provides file-based routing, SSR, API routes, layouts, and data loading.

**For Ajo UI library syntax (components, JSX, `this.next()`, context, etc.):** See `node_modules/ajo/LLMs.md`

## Project Structure

```
src/
├── app.tsx              # Router (DO NOT MODIFY)
├── server.tsx           # SSR + API setup (DO NOT MODIFY)
├── client.tsx           # Client hydration (DO NOT MODIFY)
├── layout.tsx           # Root layout (defer: true for global loading UI)
├── page.tsx             # Home page (/)
├── constants.ts         # Global types, contexts, utilities
├── handler.ts           # Root API handlers + page() data loader
├── wares.ts             # Root API middlewares
├── ui/                  # Global reusable components
├── (marketing)/         # Route group (no URL impact)
│   ├── layout.tsx       # Section layout
│   ├── constants.ts     # Section-specific types, contexts
│   ├── ui/              # Section-specific components
│   ├── blog/
│   │   ├── page.tsx     # /blog (component + handler() + optional defer)
│   │   ├── handler.ts   # Server-only data + form actions
│   │   └── [id]/
│   │       └── page.tsx # /blog/:id
│   └── about/
│       └── page.tsx     # /about
└── (shop)/
    └── products/
        └── [id]/page.tsx # /products/:id
```

## File-Based Routing

| File Pattern | URL |
|--------------|-----|
| `src/page.tsx` | `/` |
| `src/blog/page.tsx` | `/blog` |
| `src/blog/[id]/page.tsx` | `/blog/:id` |
| `src/blog/[...]/page.tsx` | `/blog/*` (catch-all) |
| `src/(group)/about/page.tsx` | `/about` (group ignored) |

## Page Component

Pages receive `PageArgs<T>` with loading/error state:

```typescript
type PageArgs<T> = {
  params: Params                  // URL params (e.g., { id: '123' })
  data: T | undefined             // Loaded data (undefined while loading)
  loading: boolean                // True only if component exports defer = true
  error: RouteError | undefined   // Error from loader
}
```

**Note:** `loading` is only `true` for components that export `defer = true`. Without `defer`, an ancestor layout with `defer: true` (typically root layout) handles the loading UI and the component receives `loading: false`.

> **⚠️ handler() vs page():** Use `handler()` in page.tsx ONLY for external APIs (code runs on both server and client). For database access, secrets, or server-only code, use `page()` in a separate handler.ts file. See [Handler Files](#handler-files-server-only-data--actions).

**Simple page (root layout shows loading):**

Without `defer`, the root layout handles loading UI. Page only sees `loading: false`:

```tsx
// src/blog/page.tsx
import type { Stateless } from 'ajo'
import type { PageArgs, HandlerArgs } from '/src/constants'

interface Post { id: number; title: string; body: string }

export async function handler({ params }: HandlerArgs) {
  const res = await fetch('https://api.example.com/posts')
  if (!res.ok) throw new Error('Failed to load posts')
  const posts: Post[] = await res.json()
  return { posts }
}

type Data = { posts: Post[] }

// Simple stateless - root layout handles loading, page just renders data
const Page: Stateless<PageArgs<Data>> = ({ data, error }) => {
  if (error) return <div class="error">{error.message}</div>
  return (
    <ul>
      {data!.posts.map(p => (
        <li key={p.id}><a href={`/blog/${p.id}`}>{p.title}</a></li>
      ))}
    </ul>
  )
}

export default Page
```

**Page with custom loading UI (`defer`):**

With `defer = true`, the page receives `loading: true` and handles its own loading state:

```tsx
// src/blog/page.tsx
import type { Stateful } from 'ajo'
import type { PageArgs, HandlerArgs } from '/src/constants'

export const defer = true  // Page handles its own loading UI

export async function handler({ params }: HandlerArgs) {
  const res = await fetch('https://api.example.com/posts')
  if (!res.ok) throw new Error('Failed to load posts')
  return { posts: await res.json() }
}

type Data = { posts: Post[] }

const Page: Stateful<PageArgs<Data>> = function* (args) {
  while (true) {
    if (args.loading) yield <PostsSkeleton />
    else if (args.error) yield <ErrorMessage error={args.error} />
    else yield <PostsGrid posts={args.data!.posts} />
  }
}

export default Page
```

**Using ancestor data with `parent()`:**

Access merged data from all ancestor layouts:

```tsx
// src/(dashboard)/reports/page.tsx
export async function handler({ params, parent }: HandlerArgs) {
  const { user } = await parent()  // Data from dashboard layout
  const reports = await fetchUserReports(user.id)
  return { reports }
}
```

**Parallel fetch with parent (avoid waterfall):**

```tsx
export async function handler({ params, parent }: HandlerArgs) {
  const [analytics, ancestors] = await Promise.all([
    fetchAnalytics(),
    parent()
  ])
  return { analytics, userId: ancestors.user.id }
}
```

## Layout Component

Layouts receive `LayoutArgs<T>` which extends `PageArgs<T>` with children:

```typescript
type LayoutArgs<T> = PageArgs<T> & { children: Children }
```

**Stateless layout:**

```tsx
// src/blog/layout.tsx
import type { Stateless } from 'ajo'
import type { LayoutArgs } from '/src/constants'

const Layout: Stateless<LayoutArgs> = ({ children }) => (
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow px-4">
      <a href="/blog" class="text-blue-600">All Posts</a>
    </nav>
    <main class="py-8">{children}</main>
  </div>
)

export default Layout
```

**Stateful layout with context:**

```tsx
// src/(admin)/layout.tsx
import type { Stateful } from 'ajo'
import type { LayoutArgs } from '/src/constants'
import { AdminContext } from './constants'

const AdminLayout: Stateful<LayoutArgs> = function* (args) {
  let sidebarOpen = true
  const toggle = () => this.next(() => sidebarOpen = !sidebarOpen)

  while (true) {
    AdminContext({ sidebarOpen })  // Set context inside loop!

    yield (
      <>
        <aside class={sidebarOpen ? 'w-64' : 'w-16'}>
          <button set:onclick={toggle}>Toggle</button>
        </aside>
        <main class="flex-1">{args.children}</main>
      </>
    )
  }
}

export default AdminLayout
```

**Root layout with `defer` (global loading/error UI):**

The root layout should export `defer = true` to handle loading states for all pages that don't have their own defer. This pattern preserves the previous content while showing a spinner overlay:

```tsx
// src/layout.tsx
import type { Children, Stateful } from 'ajo'
import type { LayoutArgs } from '/src/constants'

export const defer = true  // Root layout handles global loading UI

const Layout: Stateful<LayoutArgs> = function* (args) {
  let previous: Children = args.children

  while (true) {
    if (args.loading) {
      // Show spinner overlay, keep previous content visible
      yield (
        <>
          <Spinner />
          <Shell>{previous}</Shell>
        </>
      )
    } else if (args.error) {
      // Global error UI
      yield <Shell><ErrorPage error={args.error} /></Shell>
    } else {
      // Update previous and show new content
      previous = args.children
      yield <Shell>{args.children}</Shell>
    }
  }
}

export default Layout
```

**Layout with data loader:**

Without `defer`, root layout handles loading. This layout just handles error/data:

```tsx
// src/(dashboard)/layout.tsx
import type { Stateful } from 'ajo'
import type { LayoutArgs, HandlerArgs } from '/src/constants'

export async function handler({ params }: HandlerArgs) {
  const user = await fetchCurrentUser()
  return { user }
}

type Data = { user: { id: string; name: string } }

const Layout: Stateful<LayoutArgs<Data>> = function* (args) {
  while (true) {
    if (args.error) yield <ErrorPage error={args.error} />
    else yield (
      <div class="flex">
        <Sidebar user={args.data!.user} />
        <main class="flex-1">{args.children}</main>
      </div>
    )
  }
}

export default Layout
```

## Handler Files (Server-Only Data & Actions)

Create `handler.ts` alongside `page.tsx` or `layout.tsx` for server-only code (database, secrets, heavy computation). This code never reaches the client bundle.

**Handler exports:**
- `page()` - Server-only data loader for pages
- `layout()` - Server-only data loader for layouts
- Named exports - Form actions (any other exported function)

**Server-only data loader:**

```typescript
// src/blog/handler.ts
import type { HandlerArgs } from '/src/constants'
import { db } from '/src/lib/db'

// Server-only data (merged with page.tsx handler() data)
export async function page({ params }: HandlerArgs) {
  return {
    serverTime: new Date().toISOString(),
    secret: process.env.API_KEY,  // Safe! Never in client
    analytics: await db.analytics.getPageViews('/blog')
  }
}
```

**Form actions:**

Any named export (except `page`, `layout`, `default`) becomes a form action:

```typescript
// src/blog/handler.ts
import type { Action } from '/src/constants'
import { db } from '/src/lib/db'

// Form action - called via POST to ?/subscribe
export async function subscribe({ body }: Action) {
  const email = body.email as string

  if (!email?.includes('@')) {
    throw new Error('Invalid email address')
  }

  await db.subscribers.create({ email })
  return { success: true, email }
}

// Another action - called via POST to ?/delete
export async function remove({ params, body }: Action) {
  const id = body.id as string
  await db.posts.delete({ where: { id } })
  return { redirect: '/blog' }  // Redirect after action
}
```

**Using actions in page.tsx:**

Import the `action()` helper to create form state:

```typescript
// src/blog/page.tsx
import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action } from '/src/app'

type SubscribeResult = { success: boolean; email: string }

const Page: Stateful<PageArgs<Data>> = function* (args) {
  // Create action state - generic type is the success response
  const subscribe = action<SubscribeResult>(this, 'subscribe')

  while (true) yield (
    <form set:onsubmit={subscribe.handle}>
      <input
        type="email"
        name="email"
        placeholder="Enter your email"
        disabled={subscribe.loading}
      />
      <button type="submit" disabled={subscribe.loading}>
        {subscribe.loading ? 'Subscribing...' : 'Subscribe'}
      </button>

      {/* Show success message */}
      {subscribe.data && (
        <p class="text-green-600">Subscribed: {subscribe.data.email}</p>
      )}

      {/* Show error message */}
      {subscribe.error && (
        <p class="text-red-600">{subscribe.error}</p>
      )}
    </form>
  )
}

export default Page
```

**ActionState<T> interface:**

```typescript
type ActionState<T> = {
  loading: boolean              // True while request in flight
  data: T | undefined           // Success response data
  error: string | undefined     // Error message
  handle: (event: SubmitEvent) => void  // Form submit handler
  reset: () => void             // Clear data and error
}
```

**Data merge order:**

When both `handler.ts` and `page.tsx` have data loaders, they're merged:

```
Final data = { ...handler.page(), ...page.handler() }
```

Local data (from page.tsx) takes priority over server data.

## API Routes (handler.ts)

```ts
// src/users/[id]/handler.ts
import type { Request } from 'polka'

export default {
  get: (req: Request) => {
    const { id } = req.params
    return { id, name: 'John' }  // auto-serialized to JSON
  },

  post: async (req: Request) => {
    const body = req.body
    // create user...
    return { success: true }
  },

  delete: (req: Request) => {
    return { deleted: true }
  },
}
```

## Middleware (wares.ts)

```ts
// src/wares.ts (root middleware - applies to all /api/**)
import type { Request, Response, NextHandler } from 'polka'

export default (req: Request, res: Response, next: NextHandler) => {
  if (!req.headers.authorization) {
    res.statusCode = 401
    return { error: 'Unauthorized' }
  }
  next()
}

// Or array: export default [logger, auth]
```

Middlewares run root → leaf (ancestors before handlers).

## Constants Organization

Place `constants.ts` at appropriate scope levels:

```tsx
// src/constants.ts - Global types and contexts
import { context } from 'ajo/context'
import type { Params } from 'navaid'
import type { Children } from 'ajo'

// Re-export for convenience
export type { Params }

// ─── Error Classes ───────────────────────────────────────────────

export class RouteError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.message = message  // Enumerable for JSON serialization
  }
}

export class NotFoundError extends RouteError {
  constructor(message = 'Page not found') { super(404, message) }
}

export class ForbiddenError extends RouteError {
  constructor(message = 'Access denied') { super(403, message) }
}

export class UnauthorizedError extends RouteError {
  constructor(message = 'Authentication required') { super(401, message) }
}

// ─── Data Loading Types ──────────────────────────────────────────

export type HandlerArgs = {
  params: Params
  url: string
  parent: () => Promise<Record<string, unknown>>  // Ancestor data
}

export type Action = {
  params: Params
  body: Record<string, unknown>
}

export type ActionState<T> = {
  loading: boolean
  data: T | undefined
  error: string | undefined
  handle: (event: SubmitEvent) => void
  reset: () => void
}

// ─── Component Props Types ───────────────────────────────────────

export type PageArgs<T = Record<string, unknown>> = {
  params: Params
  data: T | undefined
  loading: boolean
  error: RouteError | undefined
}

export type LayoutArgs<T = Record<string, unknown>> = PageArgs<T> & {
  children: Children
}

// ─── Contexts ────────────────────────────────────────────────────

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Theme {
  mode: ThemeMode
  set: (next: ThemeMode) => void
  cycle: () => void
}

export const ThemeContext = context<Theme>({
  mode: 'system',
  set: () => {},
  cycle: () => {},
})

// ─── Navigation Helper ───────────────────────────────────────────

export const navigate = (to: string) => {
  globalThis.history?.pushState({}, '', to)
}

// src/(admin)/constants.ts - Section-specific
import { context } from 'ajo/context'

export const AdminContext = context<{ sidebarOpen: boolean }>({ sidebarOpen: true })
```

## Rules

| Topic | Rule |
|-------|------|
| **Pages** | Export `default` component + optional `handler()` + optional `defer` |
| **Layouts** | Export `default` component, receives `LayoutArgs<T>` with `children` |
| **Loaders** | `handler()` in page.tsx for external APIs (runs on server and client). `page()` in handler.ts for database, secrets, server-only code (never bundled to client) |
| **handler.ts** | Server-only: `page()`, `layout()` for private data, named exports for form actions. API routes: `default` with `{ get, post, put, delete }` |
| **Actions** | Named exports in handler.ts, use `action(this, 'name')` helper in page |
| **defer** | `export const defer = true` = component handles its own loading UI |
| **parent()** | Access merged ancestor layout data in loaders |
| **404** | Throw `NotFoundError` in loader |
| **Errors** | Use `RouteError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError` |
| **API routes** | handler.ts with `default` export: `{ get, post, put, delete, patch }` |
| **Middleware** | Export default function or array from `wares.ts` |
| **Route groups** | `(name)/` folders organize code, excluded from URL |
| **Dynamic segments** | `[param]` for single, `[...]` for catch-all |
| **Static files** | Place in `public/` directory |
| **Core files** | Never modify `app.tsx`, `server.tsx`, `client.tsx` |
| **Constants** | Global in `src/constants.ts`, section-specific in `src/(section)/constants.ts` |
| **Components** | Global in `src/ui/`, section-specific in `src/(section)/ui/` |

## SSR Data Flow

**First load (SSR):**
1. Server runs `handler.ts` functions (`page()`/`layout()`) for server-only data
2. Server runs `page.tsx`/`layout.tsx` `handler()` functions
3. Data merged: `{ ...serverData, ...localData }`
4. Data injected into HTML as `globalThis.__SSR__`
5. Client hydrates with cached data (no re-fetch)

**Client navigation:**
1. Client fetches server data via JSON endpoint
2. Client runs local `handler()` functions
3. Data merged and page renders
4. Components with `defer: true` show `loading: true` during fetch

**Form actions:**
1. Form submitted via POST to `?/actionName`
2. Server finds handler.ts, executes named action function
3. Returns JSON response or redirect

## Styling (UnoCSS)

```tsx
// Tailwind-compatible classes
<div class="flex items-center gap-4 p-4">

// Icons (Lucide)
<span class="i-lucide-home" />
<span class="i-lucide-search w-6 h-6" />

// Custom shortcuts (uno.config.ts)
<div class="site-container">
<div class="panel">
```

## Development

```bash
pnpm dev    # Start dev server with hot reload
pnpm build  # Build for production
pnpm prod   # Run production server
```

## Implementation Checklist

**Before implementing:**
- Route location and grouping strategy
- Context scope (global vs section `constants.ts`)
- Check existing `ui/` folders for reusable components

**After implementing:**
- Routes resolve correctly
- APIs reachable at `/api/**`
- Wares compose root → leaf correctly
- No React patterns present
- Contexts set inside `while` loops in stateful layouts

## Anti-patterns

```tsx
// ❌ Modifying core files
// app.tsx, server.tsx, client.tsx are generated - don't edit

// ❌ Loader without NotFoundError handling
export const handler = async ({ params }) => {
  return await fetch(`/api/${params.id}`)  // might return null
}

// ✅ Handle missing data
export const handler = async ({ params }) => {
  const data = await fetch(`/api/${params.id}`)
  if (!data) throw new NotFoundError()
  return data
}

// ❌ Secrets in page.tsx handler() (code may reach client bundle)
// page.tsx
export const handler = async () => {
  return { secret: process.env.API_KEY }  // DANGER!
}

// ✅ Secrets in handler.ts (server-only, never bundled to client)
// handler.ts
export async function page() {
  return { secret: process.env.API_KEY }  // Safe!
}

// ❌ Missing defer in root layout (no global loading UI)
// src/layout.tsx
const Layout = function* (args) { ... }  // No defer = pages never see loading

// ✅ Root layout must have defer for global loading UI
// src/layout.tsx
export const defer = true
const Layout = function* (args) {
  if (args.loading) yield <Spinner />
  // ...
}

// ❌ Checking args.loading without defer (always false, dead code)
// page.tsx - NO defer export!
const Page = function* (args) {
  if (args.loading) yield <Skeleton />  // Dead code! loading is always false
}

// ✅ Without defer, don't check loading (root layout handles it)
// page.tsx
const Page = ({ data, error }) => {
  if (error) return <Error error={error} />
  return <Content data={data} />
}

// ✅ With defer, page handles its own loading state
// page.tsx
export const defer = true
const Page = function* (args) {
  if (args.loading) yield <Skeleton />  // Works! loading is true during load
  else yield <Content data={args.data} />
}

// ❌ Forgetting to await parent()
export const handler = async ({ parent }) => {
  const data = parent()  // Missing await! Returns Promise, not data
}

// ✅ Always await parent()
export const handler = async ({ parent }) => {
  const { user } = await parent()  // Correct
}

// ❌ Context outside loop in stateful layout
function* Layout({ children }) {
  ThemeContext('dark')  // only set once!
  while (true) yield ...
}

// ✅ Context inside loop
function* Layout({ children }) {
  while (true) {
    ThemeContext(theme)  // updated each render
    yield ...
  }
}

// ❌ Using React Router or other routing libraries
import { BrowserRouter } from 'react-router-dom'

// ✅ Use file-based routing + navigate()
navigate('/path')
```
