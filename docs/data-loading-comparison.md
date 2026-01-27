# Data Loading: Framework Comparison

Comparative analysis of data loading patterns across modern full-stack frameworks (2026).

---

## Framework Overview

| Framework | Load Location | Caching | Invalidation | Deps Tracking | Performance |
|-----------|--------------|---------|--------------|---------------|-------------|
| **ajo-kit** | `handler.ts` (server) + `page.tsx` (both) | Sum-based (table versions) | Auto on DB write | `deps` export | ⚡ Skip handlers entirely |
| **SvelteKit** | `+page.server.ts` + `+page.ts` | URL deps + fetch cache | `invalidate(url)` / `invalidateAll()` | `depends(url)` | ⚡ Minimal JS |
| **Next.js 15** | Server Components / Route Handlers | Multi-layer (4 caches) | `revalidatePath()` / `revalidateTag()` | Tags | 🐢 Complex model |
| **Remix** | `loader` (server) / `clientLoader` | Headers-based | Form actions auto-invalidate | Nested routes | ⚡ Progressive enhancement |
| **Nuxt 4** | `useFetch` / `useAsyncData` | Payload + key + shallowRef | `refresh()` / `clear()` | Key parameter | ⚡ Shallow refs (2026) |
| **SolidStart** | `createAsync` + server functions | `cache()` wrapper | Preload invalidation | Route-based | ⚡ Fine-grained reactivity |
| **TanStack Start** | `loader` / `beforeLoad` | SWR built-in | `loaderDeps` | Deep equality | ⚡ Type inference |

---

## SvelteKit

**Approach:** Dual load functions with automatic dependency tracking.

```ts
// +page.server.ts (server-only)
export async function load({ params, depends }) {
  depends('app:posts')  // custom dependency
  return { post: await db.getPost(params.id) }
}

// +page.ts (universal - runs on both)
export async function load({ data, fetch }) {
  const extra = await fetch('/api/extra')
  return { ...data, extra }  // server data passed via `data`
}
```

**Strengths:**
- Clear separation: `.server.ts` for secrets, `.ts` for universal
- Automatic dep tracking via `fetch` URLs and `depends()`
- `invalidate(url)` for fine-grained, `invalidateAll()` for nuclear
- Parallel execution of all load functions
- [Smallest JS footprint](https://betterstack.com/community/guides/scaling-nodejs/sveltekit-vs-nextjs/)

**Weaknesses:**
- Manual `depends()` calls required for non-fetch deps
- Destructuring breaks reactivity (must use `$: item = data.item`)
- No built-in table-level invalidation
- Limited partial invalidation ([Issue #11500](https://github.com/sveltejs/kit/issues/11500))

**Sources:** [SvelteKit Docs](https://svelte.dev/docs/kit/load), [Invalidation Tutorial](https://svelte.dev/tutorial/kit/invalidation), [Advanced Loading](https://www.tutorialspoint.com/svelte/sveltekit-advanced-loading.htm)

---

## Next.js 15 (App Router)

**Approach:** React Server Components as default, with layered caching.

**⚠️ BREAKING CHANGE (2024):** fetch requests, GET Route Handlers, and client navigations are **NO LONGER CACHED BY DEFAULT** in Next.js 15.

```tsx
// app/posts/[id]/page.tsx (Server Component by default)
async function Page({ params }) {
  // NOT cached by default in Next.js 15
  const post = await db.getPost(params.id)
  return <Article post={post} />
}

// Opt-in to caching
async function getPost(id: string) {
  const res = await fetch(`/api/posts/${id}`, {
    cache: 'force-cache',  // Explicit opt-in
    next: { tags: ['posts', `post-${id}`] }
  })
  return res.json()
}

// New: use cache directive (Next.js 15)
'use cache'
async function getCachedData() {
  return await expensiveComputation()
}
```

**Caching Layers:**
1. **Request Memoization** - dedupes identical `fetch()` in same render
2. **Data Cache** - persists fetch responses by time/tags (opt-in in v15)
3. **Full Route Cache** - HTML/RSC payload for static routes
4. **Router Cache** - client-side component state (less aggressive in v15)

**Strengths:**
- Zero client JS by default (Server Components)
- `revalidateTag()` for surgical cache invalidation
- Streaming with `loading.tsx` and Suspense
- New `use cache` directive for flexible caching
- [Strong enterprise ecosystem](https://medium.com/@surajphirke3/next-js-vs-remix-vs-sveltekit-in-2025-which-full-stack-framework-should-you-choose-c8e91447fc18)

**Weaknesses:**
- Complex mental model (4 cache layers)
- "use client" boundary confusion
- Bundle size overhead
- Caching defaults changed multiple times (opt-out → opt-in)
- Router Cache behavior adjusted in v15

**Sources:** [Next.js Data Fetching](https://nextjs.org/docs/app/getting-started/fetching-data), [Next.js 15 Release](https://nextjs.org/blog/next-15), [use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache), [Caching Journey](https://nextjs.org/blog/our-journey-with-caching)

---

## Remix

**Approach:** Web standards first. Loaders for reads, actions for writes.

```ts
// routes/posts.$id.tsx
export async function loader({ params }: LoaderFunctionArgs) {
  return json(await db.getPost(params.id))
}

// New in v2.4.0: clientLoader
export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  const cached = localStorage.getItem('post')
  if (cached) return JSON.parse(cached)
  return serverLoader()
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData()
  await db.updatePost(form)
  return redirect('/posts')  // auto-invalidates loaders
}

export default function Post() {
  const post = useLoaderData<typeof loader>()
  return <article>{post.title}</article>
}
```

**Strengths:**
- Simple mental model: loader (read) + action (write)
- Actions auto-invalidate related loaders
- Nested routes = parallel loader execution
- `defer()` for streaming non-critical data
- Progressive enhancement (works without JS)
- **New:** `clientLoader` for client-side caching (v2.4.0)

**Weaknesses:**
- No built-in fine-grained cache invalidation
- `clientLoader` is newer, less mature
- Loader data exposed to client (security consideration)
- Headers-based caching requires manual setup

**Sources:** [Remix Data Loading](https://remix.run/docs/en/main/guides/data-loading), [Client Data (v2.4.0)](https://remix.run/docs/en/main/guides/client-data), [CarGurus Patterns](https://www.cargurus.dev/remix-data-loading-patterns/), [Defer Streaming](https://www.jacobparis.com/content/remix-defer-streaming-progress)

---

## Nuxt 4

**Approach:** Composables with payload transfer for SSR hydration.

**🚀 MAJOR PERFORMANCE BOOST (2026):** Data is now returned as `shallowRef` instead of deep reactive refs.

```ts
// Using useFetch (combines useAsyncData + $fetch)
const { data, refresh, status } = await useFetch('/api/posts', {
  key: 'posts',
  lazy: true,  // don't block navigation
  deep: false, // NEW: shallowRef by default (Nuxt 4)
  transform: (posts) => posts.map(p => ({ ...p, formatted: true }))
})

// Using useAsyncData for more control
const { data } = await useAsyncData('user', () => {
  return $fetch(`/api/users/${route.params.id}`)
}, {
  watch: [() => route.params.id],  // re-fetch on param change
  deep: false  // Opt-out of deep reactivity (default in Nuxt 4)
})
```

**New in Nuxt 4 (2026):**
1. **Shallow Refs by Default:** Avoids high overhead on nested data structures. Vue doesn't watch every property in deeply nested objects - only tracks top-level reference. 🚀 [Dramatic performance boost](https://masteringnuxt.com/blog/nuxt-4-performance-optimization-complete-guide-to-faster-apps-in-2026)
2. **Shared Data with Same Key:** All calls to `useAsyncData` or `useFetch` with same key share the same data, error, and status refs. Deduplicates data in payload.
3. **Automatic Data Cleanup:** When last component using `useAsyncData` unmounts, Nuxt auto-cleans the cache.
4. **Consistent Options Requirement:** When using same key, options must be consistent across all calls.

**Strengths:**
- `useFetch` = simple, `useAsyncData` = flexible
- Automatic payload transfer (no double fetch)
- `key` parameter prevents duplicate requests
- `watch` option for reactive refetching
- **NEW:** `shallowRef` by default = massive performance gain

**Weaknesses:**
- Three APIs (`$fetch`, `useFetch`, `useAsyncData`) can confuse
- `$fetch` in setup = double fetch problem
- No automatic invalidation on mutations

**Sources:** [Nuxt 4 Data Fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching), [Nuxt 4 Performance](https://masteringnuxt.com/blog/nuxt-4-performance-optimization-complete-guide-to-faster-apps-in-2026), [useAsyncData Efficient Guide](https://www.debugbear.com/blog/nuxt-useasyncdata), [Nuxt 4 New Features](https://www.blueshoe.io/blog/nuxt4-new-features/)

---

## SolidStart

**Approach:** Fine-grained reactivity with server functions.

```ts
// Using cache wrapper for server functions
const getPost = cache(async (id: string) => {
  "use server"
  return db.getPost(id)
}, 'post')

// Route with preload
export const route = {
  preload: ({ params }) => getPost(params.id)
}

export default function Post() {
  const params = useParams()
  const post = createAsync(() => getPost(params.id))

  return (
    <Suspense fallback={<Loading />}>
      <Show when={post()}>{p => <Article post={p} />}</Show>
    </Suspense>
  )
}
```

**Strengths:**
- `createAsync` tracks reactive dependencies automatically
- `"use server"` for inline server functions
- Single-flight mutations (no waterfalls)
- Preload on hover/focus
- Smallest runtime (Solid's fine-grained reactivity)
- Actions revalidate all active queries automatically

**Weaknesses:**
- Smaller ecosystem
- `cache()` API deprecated (use `query` instead as of v0.15.0)
- Less documentation than React frameworks

**Sources:** [SolidStart Official](https://start.solidjs.com/), [cache API](https://docs.solidjs.com/solid-router/reference/data-apis/cache), [SolidStart Data Guide](https://github.com/OrJDev/solidstart-data)

---

## TanStack Start

**Approach:** Type-safe loaders with built-in SWR caching.

```ts
// routes/posts.$id.tsx
export const Route = createFileRoute('/posts/$id')({
  loader: async ({ params }) => {
    return queryClient.ensureQueryData(postQuery(params.id))
  },
  loaderDeps: ({ search }) => ({ filter: search.filter }),
  staleTime: 5000,  // Data stays fresh for 5s
  gcTime: 1800000,  // Cache garbage collected after 30min
  component: PostComponent
})

function PostComponent() {
  const post = Route.useLoaderData()
  return <article>{post.title}</article>
}
```

**Strengths:**
- Deep TypeScript inference (no type annotations needed)
- Built-in SWR with stale-while-revalidate
- `loaderDeps` for fine-grained invalidation (explicit dependencies)
- React Query integration
- Preloading on link hover by default
- `staleTime` (default 0) and `gcTime` (default 30min) configurability

**Weaknesses:**
- Newer framework, less battle-tested
- `beforeLoad` blocks sequential (can hurt performance)
- Learning curve for route tree configuration

**Sources:** [TanStack Router Data Loading](https://tanstack.com/router/v1/docs/framework/react/guide/data-loading), [Frontend Masters Guide](https://frontendmasters.com/blog/tanstack-router-data-loading-1/), [External Data Loading](https://tanstack.com/router/v1/docs/framework/react/guide/external-data-loading)

---

## ajo-kit Deep Dive

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                        │
│                     X-Have: head=abc,page=def               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                     SERVER (server.tsx)                      │
│                                                              │
│  1. Parse X-Have header → client cache sums                 │
│  2. Load handler.ts exports (deps, page, layout, head)      │
│  3. Calculate current sums from deps                         │
│  4. Compare: clientSum === currentSum?                       │
│     ✅ YES → Skip handler, return null                      │
│     ❌ NO  → Execute handler, return data                   │
│  5. Dual execution: handler.ts + page.tsx in parallel       │
│  6. Merge: { ...serverData, ...clientData }                 │
│  7. Return: { data: [...], sums: [...] }                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (app.tsx)                          │
│                                                              │
│  1. Receive data + sums                                      │
│  2. Update cache: cache.set(key, { value, sum })            │
│  3. For null items → use cached value                        │
│  4. Next navigation → send X-Have with cached sums          │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
handler.ts (server)          page.tsx (both)          layout.tsx (both)
├── page(req, parent)        ├── handler(ctx, parent) ├── handler(ctx, parent)
├── layout(req, parent)      ├── head(ctx, parent)    ├── head(ctx, parent)
├── head(req, parent)        └── default component    ├── defer?: boolean
├── deps = ['users', ':user']                         └── default component
└── named exports (actions)
```

### Unique Features

| Feature | ajo-kit Implementation | Closest Alternative |
|---------|----------------------|---------------------|
| **Table version tracking** | `TrackerPlugin` auto-bumps on INSERT/UPDATE/DELETE | None (manual tags in Next.js) |
| **Deps-based sums** | `sum = hash(tableVersions + userId + ttlBucket)` | SvelteKit (URL-based deps) |
| **Skip optimization** | Server compares client sum vs current sum → skip handler | None |
| **`:user` dep** | Include user ID in sum (different user = cache miss) | None |
| **`:ttl:N` dep** | Include time bucket in sum (time-based expiry) | TanStack (staleTime) |
| **Dual execution** | Server + client handlers execute in parallel, merge | SvelteKit (+page.server + +page) |
| **Parent chain** | Deferred promises enable parallel execution with deps | Remix (nested routes) |
| **Single response** | All layout + page data in one request | SvelteKit (separate per load fn) |
| **Generator components** | Stateful with `yield` | None (all use hooks/signals) |

### Implementation Details

#### 1. Table Version Tracking (db.ts)

```typescript
// Auto-bump table versions on any write operation
class TrackerPlugin implements KyselyPlugin {
  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    const { node } = args

    if (node.kind === 'InsertQueryNode' ||
        node.kind === 'UpdateQueryNode' ||
        node.kind === 'DeleteQueryNode') {
      const table = this.extract(node)
      if (table) bump(table)  // Increment version counter
    }

    return node
  }
}

const versions = new Map<string, number>()
export const version = (table: string) => versions.get(table) ?? 0
export const bump = (table: string) => versions.set(table, version(table) + 1)
export const snapshot = (tables: string[]) =>
  Object.fromEntries(tables.map(t => [t, version(t)]))
```

**How it works:**
- Every `INSERT`, `UPDATE`, `DELETE` query automatically increments table version
- No manual invalidation needed
- Versions are in-memory (reset on server restart, but cache cleared too)

---

#### 2. Deps-based Sum Calculation (server.tsx)

```typescript
// Parse deps: ['users', 'posts', ':user', ':ttl:60000']
const parseDeps = (deps?: string[]) => {
  if (!deps) return { tables: [], user: false, ttl: null }

  return {
    tables: deps.filter(d => !d.startsWith(':')),       // ['users', 'posts']
    user: deps.includes(':user'),                       // true
    ttl: Number(deps.find(d => d.startsWith(':ttl:'))?.slice(5)) || null  // 60000
  }
}

// Generate sum from deps
const depSum = (deps: string[] | undefined, userId?: number) => {
  if (!deps) return null

  const { tables, user, ttl } = parseDeps(deps)
  if (tables.length === 0) return null

  return sum({
    v: snapshot(tables),              // { users: 42, posts: 15 }
    u: user ? userId : undefined,     // 123
    t: ttl ? Math.floor(Date.now() / ttl) : undefined  // Time bucket
  })
}
```

**Example:**
```typescript
// handler.ts
export const deps = ['users', ':user']

// User 1 requests → sum = hash({ v: { users: 42 }, u: 1 }) = "abc123"
// User 2 requests → sum = hash({ v: { users: 42 }, u: 2 }) = "def456"
// users table updated → version bumps to 43
// User 1 requests → sum = hash({ v: { users: 43 }, u: 1 }) = "xyz789" ≠ "abc123"
```

---

#### 3. Skip Optimization (server.tsx)

```typescript
// Check if handler can be skipped
const canSkip = (handler: PageHandler | undefined, key: string) =>
  handler?.deps &&
  isAjax &&
  clientHave[key] === depSum(handler.deps, req.user?.id)

// In layout/page loading:
if (canSkip(handler, keys[depth + 1])) {
  const cached = clientHave[keys[depth + 1]]
  deferred.resolve({})
  return {
    server: {},
    merged: {},
    module: undefined,
    handler: undefined,
    skipped: cached  // Return cached sum
  }
}
```

**Flow:**
1. Client sends `X-Have: head=abc,page:dashboard=def`
2. Server calculates current sum from deps
3. If `clientHave['page:dashboard'] === depSum(...)` → skip handler
4. Return `null` for that data slot → client uses cached value
5. Otherwise, execute handler and return fresh data

**Performance impact:**
- Zero database queries for unchanged data
- Handler functions not even called
- Massive speedup for navigation between cached routes

---

#### 4. Dual Execution (server.tsx)

```typescript
async function dual<T extends object>(
  serverFn: () => Promise<T> | undefined,
  clientFn: () => Promise<T> | undefined,
  isAjax: boolean
): Promise<{ server: T; merged: T }> {

  // For AJAX requests (client navigation), only run server handler
  if (isAjax) {
    const server = await serverFn() ?? ({} as T)
    return { server, merged: server }
  }

  // For SSR, run both in parallel
  const [server, client] = await Promise.all([
    serverFn() ?? ({} as T),
    clientFn() ?? ({} as T)
  ])

  // Client data wins in merge
  return { server, merged: { ...server, ...client } as T }
}

// Usage:
const entry = await dual(
  () => handler?.page?.(req, parent),      // handler.ts page()
  () => module?.handler?.({ url, params }, parent),  // page.tsx handler()
  isAjax
)
```

**Why dual?**
- **SSR:** Need both server (secrets) and client (API calls) data
- **Client nav:** Only need server data (client already bundled)
- **Merge order:** Server first, client wins (like SvelteKit)

---

#### 5. Parent Chain (constants.ts)

```typescript
export function links(count: number): Link[] {
  const chain: Link[] = []

  for (let depth = 0; depth < count; depth++) {
    const current = deferred<Entry>()

    // parent() waits for ALL ancestors and accumulates their data
    const parent = depth === 0
      ? async () => ({})
      : async () => {
          const ancestors = await Promise.all(
            chain.slice(0, depth).map(link => link.deferred.promise)
          )
          return ancestors.reduce((result, entry) => ({ ...result, ...entry }), {})
        }

    chain.push({ parent, deferred: current })
  }

  return chain
}
```

**How it works:**
```
Depth 0 (root layout):   parent() → {}
Depth 1 (app layout):    parent() → { ...depth0 }
Depth 2 (page):          parent() → { ...depth0, ...depth1 }
```

**Parallel execution with dependencies:**
```typescript
// All handlers execute in parallel
const [layoutResults, pageResult] = await Promise.all([
  Promise.all(layoutTasks),  // Layouts load in parallel
  pageTask                   // Page loads in parallel
])

// But parent() awaits only ancestors, not descendants
// So each handler can call await parent() without blocking others
```

---

#### 6. Cache Management (app.tsx)

```typescript
// Client-side cache: Map<key, { value, sum }>
export const cache = new Map<string, Cached>()

// Invalidate specific key or all
export function invalidate(key?: string) {
  if (key) cache.delete(key)
  else cache.clear()
}

// Build X-Have header from cached sums
const have = keys
  .map(key => [key, cache.get(key)] as const)
  .filter((entry): entry is [string, Cached] => !!entry[1])
  .map(([key, entry]) => `${key}=${entry.sum}`)
  .join(',')

const response = await fetch(url, {
  headers: {
    Accept: 'application/json',
    ...(have && { 'X-Have': have })
  }
})

// Update cache with new data
const { data: raw, sums } = json as { data: (Entry | null)[]; sums: string[] }

raw.forEach((item, i) => {
  if (item !== null) cache.set(keys[i], { value: item, sum: sums[i] })
})

// Merge: null items use cached values
const merged = raw.map((item, i) => item ?? cache.get(keys[i])?.value ?? {})
```

**Cache keys format:**
```
['head', '(app)', 'page:dashboard']
     ↓
X-Have: head=abc123,(app)=def456,page:dashboard=ghi789
```

---

### Advantages Over Other Frameworks

#### 1. Automatic Invalidation

**Problem:** Manual cache invalidation is error-prone.

**Other frameworks:**
- Next.js: Manual `revalidateTag()`, `revalidatePath()`
- SvelteKit: Manual `invalidate('app:posts')`, `invalidateAll()`
- Remix: Action-based (only after form submit)
- Nuxt: Manual `refresh()`, `clear()`

**ajo-kit:**
```typescript
// Any database write auto-bumps table version
await db().insertInto('users').values({ email }).execute()
// → users version: 42 → 43
// → All cached sums involving 'users' are now stale
// → Next request fetches fresh data automatically

// No manual invalidation needed!
```

---

#### 2. Zero Overfetching

**Problem:** Refetching entire route data when only part changed.

**Other frameworks:**
- SvelteKit: `invalidate('app:posts')` refetches ALL loaders that depend on it
- Next.js: `revalidateTag('posts')` refetches ALL fetches with that tag
- Remix: Actions invalidate ALL loaders in route hierarchy

**ajo-kit:**
```typescript
// Layout handler with deps
export const deps = ['users', ':user']
export async function layout(req: Request) {
  return { user: await db.getUser(req.user.id) }
}

// Page handler with deps
export const deps = ['posts']
export async function page(req: Request) {
  return { posts: await db.getPosts() }
}

// If posts table changes → only page handler runs
// Layout handler skipped (users table unchanged, same user)
// → Granular, efficient refetching
```

---

#### 3. User-aware Caching

**Problem:** Shared caches leak data between users.

**Other frameworks:**
- Manual segregation required
- Often use user ID in cache key explicitly

**ajo-kit:**
```typescript
export const deps = ['users', ':user']

// User 1: sum = hash({ users: 42, user: 1 }) = "abc"
// User 2: sum = hash({ users: 42, user: 2 }) = "def"
// → Different sums → different caches → no leakage
```

---

#### 4. Time-based Expiry

**Problem:** Data should expire after certain time, regardless of changes.

**Other frameworks:**
- TanStack: `staleTime` option
- Next.js: `revalidate` time
- SvelteKit: Manual with `depends('app:time')` + intervals

**ajo-kit:**
```typescript
export const deps = ['stats', ':ttl:60000']  // 60 seconds

// Time bucket = Math.floor(Date.now() / 60000)
// 10:00:00 - 10:00:59 → bucket 12345
// 10:01:00 - 10:01:59 → bucket 12346 → sum changes → refetch
```

---

#### 5. Single Request for All Data

**Problem:** Multiple waterfalls for layout + page data.

**SvelteKit:**
```
GET /posts/1 → HTML
  → +layout.server.ts
  → +page.server.ts
GET /api/extra → +layout.ts fetch
GET /api/more → +page.ts fetch
```

**ajo-kit:**
```
GET /posts/1 → HTML + JSON in one response
  {
    data: [head, layout, page],  // All data
    sums: ["abc", "def", "ghi"]   // All sums
  }
```

**Result:**
- 1 request instead of 3+
- No waterfalls
- Faster TTI (Time to Interactive)

---

### Potential Improvements

#### 1. Streaming (like Remix/Next.js defer)

**Current:** All data must resolve before response.

```typescript
// Proposed API:
export const defer = ['nonCritical']

export async function page(req: Request) {
  return {
    critical: await fastQuery(),
    nonCritical: slowQuery()  // Don't await, stream later
  }
}
```

**Benefits:**
- Instant shell render
- Progressive enhancement
- Better perceived performance

---

#### 2. Preloading (like TanStack)

**Current:** No hover preload.

```typescript
// Proposed API:
<Link href="/posts/1" prefetch="hover">
  Post Title
</Link>

// Or automatic:
<Link href="/posts/1">  <!-- Prefetch on hover by default -->
  Post Title
</Link>
```

**Benefits:**
- Instant navigation on click
- Better UX

---

#### 3. Mutation Optimistic Updates

**Current:** Wait for server response.

```typescript
// Proposed API:
const form = action('delete', {
  optimistic: (prev, input) => ({
    posts: prev.posts.filter(p => p.id !== input.id)
  })
})
```

**Benefits:**
- Instant UI feedback
- Revert on error
- Better UX

---

#### 4. Cross-route Invalidation

**Current:** Only route-specific deps.

```typescript
// Proposed API:
export const deps = ['posts']
export const tags = ['content']  // Global tag

// Elsewhere:
invalidate({ tag: 'content' })  // Invalidates all routes with this tag
```

**Benefits:**
- Invalidate related routes
- After mutations that affect multiple pages

---

#### 5. Persistent Cache (localStorage)

**Current:** In-memory only (lost on refresh).

```typescript
// Proposed API:
export const deps = ['posts']
export const persist = true  // Store in localStorage

// Or with expiry:
export const persist = { ttl: 3600000 }  // 1 hour
```

**Benefits:**
- Instant loads on revisit
- Offline-first capability

---

## Summary Table

### Performance Comparison

| Framework | Initial Load | Navigation | Cache Hit | Bundle Size | Reactivity |
|-----------|-------------|------------|-----------|-------------|------------|
| **ajo-kit** | Server SSR | Fetch + skip | ⚡ 0 DB queries | ~50KB | Generator yield |
| **SvelteKit** | Server SSR | Fetch | ⚡ No refetch | ~30KB | Stores |
| **Next.js 15** | Server RSC | Soft nav | 🐢 Complex | ~100KB | React |
| **Remix** | Server SSR | Fetch | Action-based | ~60KB | React |
| **Nuxt 4** | Server SSR | Payload | ⚡ shallowRef | ~80KB | Vue refs |
| **SolidStart** | Server SSR | Cache/query | Auto revalidate | ~40KB | Signals |
| **TanStack** | Server RSC | SWR | staleTime | ~90KB | React Query |

### Feature Comparison

| Feature | ajo-kit | SvelteKit | Next.js 15 | Remix | Nuxt 4 | SolidStart | TanStack |
|---------|---------|-----------|------------|-------|---------|-----------|----------|
| **Auto invalidation** | ✅ DB writes | ❌ Manual | ❌ Manual | ⚠️ Actions | ❌ Manual | ⚠️ Actions | ❌ Manual |
| **Granular caching** | ✅ Table + user | ⚠️ URL-based | ⚠️ Tag-based | ❌ | ⚠️ Key-based | ⚠️ Cache key | ✅ loaderDeps |
| **Skip handlers** | ✅ Sum comparison | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ staleTime |
| **User-aware cache** | ✅ :user dep | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual |
| **Time expiry** | ✅ :ttl dep | ⚠️ Manual | ✅ revalidate | ⚠️ headers | ❌ | ❌ | ✅ staleTime |
| **Single request** | ✅ All data | ❌ Per load fn | ⚠️ RSC | ✅ | ⚠️ Payload | ⚠️ | ⚠️ |
| **Parallel execution** | ✅ Promise.all | ✅ | ✅ | ✅ Nested | ✅ | ✅ | ⚠️ beforeLoad |
| **Parent data** | ✅ await parent() | ✅ data param | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Streaming** | ❌ | ✅ Suspense | ✅ Suspense | ✅ defer | ❌ | ✅ Suspense | ✅ defer |
| **Preloading** | ❌ | ⚠️ Manual | ⚠️ prefetch | ✅ prefetch | ✅ | ✅ hover | ✅ hover |
| **Optimistic UI** | ❌ | ❌ Manual | ⚠️ useOptimistic | ❌ Manual | ❌ Manual | ✅ | ✅ |
| **Type safety** | ✅ TypeScript | ✅ | ✅ | ✅ | ✅ | ✅ | ✅✅ (deep) |

### Best Use Cases

| Framework | Best For | Data Philosophy | Primary Strength |
|-----------|----------|-----------------|------------------|
| **ajo-kit** | DB-centric apps, dashboards, admin panels | Automatic table-level cache | Zero manual invalidation |
| **SvelteKit** | Performance-critical, minimal JS, public sites | URL dependencies | Smallest bundle |
| **Next.js** | Enterprise, SEO, Vercel ecosystem, content sites | Multi-layer cache | RSC + streaming |
| **Remix** | Web standards, forms-heavy, progressive enhancement | Loader/action pairs | Simplicity |
| **Nuxt** | Vue ecosystem, SSR apps, content sites | Composables + payload | Vue DX |
| **SolidStart** | Fine-grained reactivity, performance, SPAs | Signals + server fns | Smallest runtime |
| **TanStack** | Type safety, React Query users, complex state | SWR + deep types | Type inference |

---

## Conclusion

**ajo-kit's approach** is most similar to **SvelteKit** (dual load functions, merge order) but with **automatic database-level cache invalidation** that no other framework provides out of the box.

**Key innovations:**
1. **TrackerPlugin** auto-bumps table versions on writes
2. **Deps-based sums** enable skip optimization
3. **User-aware caching** prevents data leakage
4. **Single-request architecture** eliminates waterfalls
5. **Parent chain** enables parallel execution with dependencies

**Trade-offs:**
- ❌ No streaming (yet)
- ❌ No preloading (yet)
- ❌ No optimistic UI (yet)
- ❌ Requires sticky sessions for distributed systems (in-memory versions)

**Future direction:**
- Implement streaming with defer API
- Add preloading on hover
- Support optimistic mutations
- Consider Redis adapter for distributed table versions
- Add cross-route tags for global invalidation

For **most database-driven applications**, ajo-kit's automatic invalidation and skip optimization provide **significant performance and DX benefits** over manual approaches. For **content sites** with heavy external API usage, SvelteKit or Next.js may be more appropriate.

---

## References

**SvelteKit:**
- [Loading Data](https://svelte.dev/docs/kit/load)
- [Invalidation Tutorial](https://svelte.dev/tutorial/kit/invalidation)
- [Advanced Loading](https://www.tutorialspoint.com/svelte/sveltekit-advanced-loading.htm)
- [Frontend Masters Course](https://frontendmasters.com/courses/sveltekit/advanced-loading/)

**Next.js:**
- [Next.js 15 Release](https://nextjs.org/blog/next-15)
- [Data Fetching Guide](https://nextjs.org/docs/app/getting-started/fetching-data)
- [use cache Directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [Caching Journey](https://nextjs.org/blog/our-journey-with-caching)

**Remix:**
- [Data Loading Guide](https://remix.run/docs/en/main/guides/data-loading)
- [Client Data (v2.4.0)](https://remix.run/docs/en/main/guides/client-data)
- [Defer Streaming Tutorial](https://www.jacobparis.com/content/remix-defer-streaming-progress)

**Nuxt:**
- [Nuxt 4 Data Fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)
- [Performance Optimization 2026](https://masteringnuxt.com/blog/nuxt-4-performance-optimization-complete-guide-to-faster-apps-in-2026)
- [useAsyncData Efficient Guide](https://www.debugbear.com/blog/nuxt-useasyncdata)
- [Nuxt 4 New Features](https://www.blueshoe.io/blog/nuxt4-new-features/)

**SolidStart:**
- [SolidStart Official](https://start.solidjs.com/)
- [cache API Reference](https://docs.solidjs.com/solid-router/reference/data-apis/cache)
- [SolidStart Data Guide](https://github.com/OrJDev/solidstart-data)

**TanStack:**
- [Data Loading Guide](https://tanstack.com/router/v1/docs/framework/react/guide/data-loading)
- [Frontend Masters Tutorial](https://frontendmasters.com/blog/tanstack-router-data-loading-1/)
- [External Data Loading](https://tanstack.com/router/v1/docs/framework/react/guide/external-data-loading)
