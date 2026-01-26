# Data Loading: Framework Comparison

Comparative analysis of data loading patterns across modern full-stack frameworks.

## Framework Overview

| Framework | Load Location | Caching | Invalidation | Deps Tracking |
|-----------|--------------|---------|--------------|---------------|
| **ajo-kit** | `handler.ts` (server) + `page.tsx` (both) | Sum-based (versions in sum) | Auto on DB write | `deps` export |
| **SvelteKit** | `+page.server.ts` + `+page.ts` | SWR + URL deps | `invalidate(url)` / `invalidateAll()` | `depends(url)` |
| **Next.js** | Server Components / Route Handlers | Multi-layer (Request, Data, Route, Router) | `revalidatePath()` / `revalidateTag()` | Tags |
| **Remix** | `loader` (server) / `clientLoader` | Headers-based | Form actions auto-invalidate | Nested routes |
| **Nuxt** | `useFetch` / `useAsyncData` | Payload + key-based | `refresh()` / `clear()` | Key parameter |
| **SolidStart** | `createAsync` + server functions | `cache()` wrapper | Preload invalidation | Route-based |
| **TanStack Start** | `loader` / `beforeLoad` | SWR built-in | `loaderDeps` | Deep equality |

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

**Sources:** [SvelteKit Docs](https://svelte.dev/docs/kit/load), [Invalidation Tutorial](https://svelte.dev/tutorial/kit/invalidation)

---

## Next.js (App Router)

**Approach:** React Server Components as default, with layered caching.

```tsx
// app/posts/[id]/page.tsx (Server Component by default)
async function Page({ params }) {
  const post = await db.getPost(params.id)  // runs on server
  return <Article post={post} />
}

// With caching tags
async function getPost(id: string) {
  const res = await fetch(`/api/posts/${id}`, {
    next: { tags: ['posts', `post-${id}`] }
  })
  return res.json()
}
```

**Caching Layers:**
1. Request Memoization - dedupes identical `fetch()` in same render
2. Data Cache - persists fetch responses by time/tags
3. Full Route Cache - HTML/RSC payload for static routes
4. Router Cache - client-side component state

**Strengths:**
- Zero client JS by default (Server Components)
- `revalidateTag()` for surgical cache invalidation
- Streaming with `loading.tsx` and Suspense
- [Strong enterprise ecosystem](https://medium.com/@surajphirke3/next-js-vs-remix-vs-sveltekit-in-2025-which-full-stack-framework-should-you-choose-c8e91447fc18)

**Weaknesses:**
- Complex mental model (4 cache layers)
- "use client" boundary confusion
- Bundle size overhead
- Fetch caching defaults changed multiple times

**Sources:** [Next.js Data Fetching](https://nextjs.org/docs/app/getting-started/fetching-data), [Caching Docs](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns)

---

## Remix

**Approach:** Web standards first. Loaders for reads, actions for writes.

```ts
// routes/posts.$id.tsx
export async function loader({ params }: LoaderFunctionArgs) {
  return json(await db.getPost(params.id))
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

**Weaknesses:**
- No built-in fine-grained cache invalidation
- `clientLoader` is newer, less mature
- Loader data exposed to client (security consideration)
- Headers-based caching requires manual setup

**Sources:** [Remix Data Loading](https://remix.run/docs/en/main/guides/data-loading), [CarGurus Patterns](https://www.cargurus.dev/remix-data-loading-patterns/)

---

## Nuxt 3

**Approach:** Composables with payload transfer for SSR hydration.

```ts
// Using useFetch (combines useAsyncData + $fetch)
const { data, refresh, status } = await useFetch('/api/posts', {
  key: 'posts',
  lazy: true,  // don't block navigation
  transform: (posts) => posts.map(p => ({ ...p, formatted: true }))
})

// Using useAsyncData for more control
const { data } = await useAsyncData('user', () => {
  return $fetch(`/api/users/${route.params.id}`)
}, {
  watch: [() => route.params.id]  // re-fetch on param change
})
```

**Strengths:**
- `useFetch` = simple, `useAsyncData` = flexible
- Automatic payload transfer (no double fetch)
- `key` parameter prevents duplicate requests
- `watch` option for reactive refetching
- `shallowRef` in Nuxt 4 for performance

**Weaknesses:**
- Three APIs (`$fetch`, `useFetch`, `useAsyncData`) can confuse
- `$fetch` in setup = double fetch problem
- No automatic invalidation on mutations

**Sources:** [Nuxt Data Fetching](https://nuxt.com/docs/3.x/getting-started/data-fetching), [Mastering Nuxt Guide](https://masteringnuxt.com/blog/when-to-use-fetch-usefetch-or-useasyncdata-in-nuxt-a-comprehensive-guide)

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

**Weaknesses:**
- Smaller ecosystem
- `cache()` wrapper API still evolving
- Less documentation than React frameworks

**Sources:** [SolidStart Data Loading](https://start.solidjs.com/core-concepts/data-loading), [createAsync Docs](https://docs.solidjs.com/solid-router/reference/data-apis/create-async)

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
- `loaderDeps` for fine-grained invalidation
- React Query integration
- Preloading on link hover by default

**Weaknesses:**
- Newer framework, less battle-tested
- `beforeLoad` blocks sequential (can hurt performance)
- Learning curve for route tree configuration

**Sources:** [TanStack Router Data Loading](https://tanstack.com/router/v1/docs/framework/react/guide/data-loading), [Frontend Masters Guide](https://frontendmasters.com/blog/tanstack-router-data-loading-1/)

---

## ajo-kit Comparison

### Architecture

```
handler.ts (server)          page.tsx (both)
├── page(req, parent)        ├── handler(ctx, parent)
├── layout(req, parent)      ├── head(ctx, parent)
├── head(req, parent)        └── default component
├── deps = ['users', ':user']
└── named exports (actions)
```

### Unique Features

| Feature | ajo-kit | Closest Alternative |
|---------|---------|---------------------|
| **Deps-based sums** | Sum = hash(table versions + user + ttl) | SvelteKit (URL-based deps) |
| **Auto version tracking** | `TrackerPlugin` bumps on INSERT/UPDATE/DELETE | None (manual tags in Next.js) |
| **`:user` dep** | Include user ID in sum | None |
| **`:ttl:N` dep** | Include time bucket in sum | TanStack (staleTime) |
| **Dual execution** | Server + client handlers merge | SvelteKit (+page.server + +page) |
| **Generator components** | Stateful with `yield` | None (all use hooks/signals) |

### Advantages Over Others

1. **Automatic invalidation** - Database writes auto-bump table versions. Sum changes → cache miss → fresh data. No manual tags/keys.

2. **Sum-based deduplication** - Server compares client sum vs expected sum (from current table versions). Match → skip handler entirely.

3. **User-aware caching** - `:user` dep includes user ID in sum. Different user → different sum → cache miss.

4. **Single response** - All layout + page data in one fetch with unified sums. vs SvelteKit's separate requests per load function.

5. **No double fetch** - Like Nuxt's payload transfer, but with sum comparison for subsequent navigations.

### Potential Improvements

1. **Streaming** - Remix/Next.js `defer`/Suspense for non-critical data. Currently ajo-kit waits for all data.

2. **Preloading** - TanStack's hover preload. Could add `<Link prefetch>` support.

3. **Tag-based invalidation** - Next.js `revalidateTag()` for cross-route invalidation. Currently only route-level.

4. **Optimistic updates** - Remix/TanStack patterns for instant UI feedback.

---

## Summary

| Framework | Best For | Data Philosophy |
|-----------|----------|-----------------|
| **ajo-kit** | Full control, DB-centric apps | Hash + table versions |
| **SvelteKit** | Performance-critical, minimal JS | URL dependencies |
| **Next.js** | Enterprise, SEO, Vercel ecosystem | Multi-layer cache |
| **Remix** | Web standards, forms-heavy | Loader/action pairs |
| **Nuxt** | Vue ecosystem, SSR apps | Composables + payload |
| **SolidStart** | Fine-grained reactivity | Signals + server functions |
| **TanStack** | Type safety, React Query users | SWR + deep types |

ajo-kit's approach is most similar to **SvelteKit** (dual load functions, merge order) but with **automatic database-level cache invalidation** that no other framework provides out of the box.
