# ajo-kit vs Remix 3: Complete Comparison

Comparative analysis of data loading and form action patterns between ajo-kit and Remix 3 (2026).

---

## Executive Summary

| Aspect | ajo-kit | Remix 3 |
|--------|---------|---------|
| **Philosophy** | SvelteKit-style conventions | HTTP-first, web standards |
| **Data loading** | `handler.ts` with `deps` for caching | GET handlers, Frames for streaming |
| **Form actions** | Named exports + `action()` helper | `form()` helper + method handlers |
| **Wire format** | JSON (devalue serialization) | HTML (HTMX-style) |
| **Caching** | Automatic (table versions + user) | HTTP headers / external |
| **Client state** | Built-in reactive helpers | External (Jotai, TanStack, etc.) |
| **Component model** | JSX + generators | Custom (no React, uses `this.update()`) |
| **Streaming** | Not yet | Frames (async boundaries) |
| **Maturity** | Production-ready | Under active development (early 2026) |

---

## Data Loading Comparison

### Philosophy

| Aspect | ajo-kit | Remix 3 |
|--------|---------|---------|
| **Paradigm** | Loaders with automatic caching | HTTP GET handlers |
| **Wire format** | JSON (devalue serialization) | HTML fragments (HTMX-style) |
| **Caching** | Sum-based (table versions + user + TTL) | HTTP headers / bring your own |
| **Invalidation** | Automatic on DB writes | Manual or action-triggered |
| **Streaming** | Not yet | Frames (async boundaries) |
| **Partial updates** | Full page data refresh | Frames patch DOM fragments |

### Architecture Overview

**ajo-kit: Deps-based skip optimization**

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT REQUEST                          │
│                   X-Have: page=abc123                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                         SERVER                               │
│                                                              │
│  1. Parse X-Have header → client cache sums                 │
│  2. Load handler.ts deps: ['users', ':user']                │
│  3. Calculate current sum from table versions + userId      │
│  4. Compare: clientSum === currentSum?                       │
│     ✅ Match → Skip handler, return null (use cache)        │
│     ❌ Mismatch → Execute handler, return fresh data        │
│  5. Return: { data, sum }                                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│                                                              │
│  1. If data !== null → update cache with new sum            │
│  2. If data === null → use cached value                     │
│  3. Render with merged data                                  │
└─────────────────────────────────────────────────────────────┘
```

**Remix 3: Frames + HTML streaming**

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT REQUEST                          │
│                    GET /posts/123                            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                      fetch-router                            │
│                                                              │
│  1. Match route pattern /posts/:id                          │
│  2. Execute GET handler with { params, request }            │
│  3. Handler returns HTML or render() call                   │
│  4. Stream response to client                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│                                                              │
│  1. Receive HTML stream                                      │
│  2. For Frames: patch DOM with fragment                     │
│  3. For full page: replace document                          │
└─────────────────────────────────────────────────────────────┘
```

### Data Loading Definition

**ajo-kit: Dual handlers with deps**

```ts
// handler.ts (server-only)
export const deps = ['posts', ':user']  // Cache dependencies

export async function page(req: Request, parent: () => Promise<ParentData>) {
  const { user } = await parent()  // Get ancestor data

  const posts = await db()
    .selectFrom('posts')
    .select(['id', 'title', 'content'])
    .where('author', '=', user.id)
    .execute()

  return { posts }
}

// page.tsx (runs on both server and client)
export async function handler(ctx: Context, parent: () => Promise<ParentData>) {
  // For external APIs, public data
  const weather = await fetch('https://api.weather.com/today').then(r => r.json())
  return { weather }
}

// Merge order: { ...serverData, ...clientData }
```

**Remix 3: GET handlers return HTML**

```ts
// routes.ts
let routes = route({
  posts: {
    index: '/posts',
    show: '/posts/:id',
  },
})

export const handlers = {
  // GET /posts
  async GET({ request }) {
    const posts = await db.getPosts()

    return render(
      <PostList posts={posts} />,
      { status: 200 }
    )
  },
}

// Or with fetch-router
router.get(routes.posts.show, async ({ params }) => {
  const post = await db.getPost(params.id)

  if (!post) {
    return render(<NotFound />, { status: 404 })
  }

  return render(<PostPage post={post} />)
})
```

### Caching Strategies

**ajo-kit: Automatic table-version tracking**

```ts
// handler.ts
export const deps = ['posts', 'comments', ':user', ':ttl:60000']

// deps breakdown:
// - 'posts'      → Track posts table version
// - 'comments'   → Track comments table version
// - ':user'      → Include user ID in cache key
// - ':ttl:60000' → Expire after 60 seconds

// Sum calculation:
// sum = hash({
//   v: { posts: 42, comments: 15 },  // Table versions
//   u: 123,                           // User ID
//   t: 27654321                       // Time bucket (Date.now() / 60000)
// })

// When ANY of these change → cache miss → refetch
// When ALL match → cache hit → skip handler entirely
```

**Remix 3: HTTP caching or external**

```ts
// Option 1: HTTP Cache headers
router.get(routes.posts.index, async () => {
  const posts = await db.getPosts()

  return new Response(render(<PostList posts={posts} />), {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'ETag': generateETag(posts),
    },
  })
})

// Option 2: External cache (TanStack Query on client)
// Server just returns data, client manages cache
router.get('/api/posts', async () => {
  return Response.json(await db.getPosts())
})

// Client
const { data: posts } = useQuery({
  queryKey: ['posts'],
  queryFn: () => fetch('/api/posts').then(r => r.json()),
  staleTime: 60_000,
})
```

### Frames: Partial Page Updates (Remix 3)

Remix 3 introduces **Frames** — independent page sections that update without full page reload:

```ts
// A Frame is like a smart iframe that:
// 1. Loads independently
// 2. Updates via HTML fragments
// 3. Patches DOM without JavaScript state management

function PostPage({ post }) {
  return html`
    <article>
      <h1>${post.title}</h1>
      <p>${post.content}</p>

      <!-- This Frame loads and updates independently -->
      <Frame src="/posts/${post.id}/comments">
        <p>Loading comments...</p>
      </Frame>
    </article>
  `
}

// When Frame refreshes:
// 1. Server sends HTML fragment
// 2. Remix patches it into the DOM
// 3. No JSON parsing, no hydration
```

**Comparison with ajo-kit:**

| Feature | ajo-kit | Remix 3 Frames |
|---------|---------|----------------|
| **Partial loading** | `defer: true` + loading state | Native Frame component |
| **Wire format** | JSON (devalue) | HTML fragments |
| **Update trigger** | `invalidate()` | Frame refresh or action |
| **State preservation** | Generator yields | DOM patching |
| **Nested loading** | Parent chain | Independent Frames |

### Streaming

**ajo-kit: Not yet implemented**

```ts
// Current: All data must resolve before response
export async function page(req: Request) {
  const [fast, slow] = await Promise.all([
    getFastData(),    // 50ms
    getSlowData(),    // 2000ms  ← Blocks entire response
  ])
  return { fast, slow }
}

// Future (proposed):
export const defer = ['slow']

export async function page(req: Request) {
  return {
    fast: await getFastData(),
    slow: getSlowData(),  // Don't await, stream later
  }
}
```

**Remix 3: Async boundaries with HTML streaming**

```ts
// Frames enable natural streaming
function Dashboard() {
  return html`
    <main>
      <!-- Critical content renders immediately -->
      <h1>Dashboard</h1>
      <UserInfo />

      <!-- Non-critical loads async -->
      <Frame src="/dashboard/stats">
        <StatsPlaceholder />
      </Frame>

      <Frame src="/dashboard/activity">
        <ActivityPlaceholder />
      </Frame>
    </main>
  `
}

// Server streams HTML as each Frame resolves
// No JavaScript hydration needed for Frames
```

### Parent Data Access

**ajo-kit: Deferred promise chain**

```ts
// Layout handler
export async function layout(req: Request) {
  return {
    user: await getUser(req),
    org: await getOrg(req),
  }
}

// Page handler
export async function page(req: Request, parent: () => Promise<LayoutData>) {
  const { user, org } = await parent()  // Wait for layout

  const posts = await db()
    .selectFrom('posts')
    .where('org', '=', org.id)
    .where('author', '=', user.id)
    .execute()

  return { posts }
}

// Execution: Layout and page run in parallel
// parent() awaits only when called
// Result: { user, org, posts }
```

**Remix 3: Context or props**

```ts
// Using component context
function RootLayout(this: Remix.Handle) {
  const user = await getUser()
  this.context.user = user

  return () => html`
    <div>
      <Header user=${user} />
      <slot />  <!-- Child routes render here -->
    </div>
  `
}

function PostsPage(this: Remix.Handle) {
  const user = this.context.user  // Access parent context
  const posts = await getPosts(user.id)

  return () => html`<PostList posts=${posts} />`
}
```

### Error Boundaries

**ajo-kit: Error classes with automatic handling**

```ts
// handler.ts
import { NotFoundError, ForbiddenError } from '/src/constants'

export async function page(req: Request) {
  const post = await db.getPost(req.params.id)

  if (!post) {
    throw new NotFoundError('Post not found')
  }

  if (post.author !== req.user?.id) {
    throw new ForbiddenError('Not your post')
  }

  return { post }
}

// Error pages: src/(app)/404.tsx, src/(app)/error.tsx
```

**Remix 3: Route-level error boundaries**

```ts
// Each route can define its own error boundary
export const handlers = {
  async GET({ params }) {
    const post = await getPost(params.slug)

    if (!post) {
      // Throw Response with error status
      return render(<NotFound />, { status: 404 })
    }

    return render(<PostPage post={post} />)
  },
}

// Error boundary prevents full page crash
// Only the failed section shows error UI
```

### Data Loading Feature Matrix

| Feature | ajo-kit | Remix 3 |
|---------|---------|---------|
| **Auto cache invalidation** | ✅ Table versions | ❌ Manual |
| **User-aware caching** | ✅ `:user` dep | ❌ Manual |
| **Time-based expiry** | ✅ `:ttl:N` dep | ⚠️ HTTP headers |
| **Skip handler on cache hit** | ✅ Zero DB queries | ❌ Always executes |
| **Streaming** | ❌ Planned | ✅ Frames |
| **Partial updates** | ❌ Full refresh | ✅ Frame patching |
| **Parent data chain** | ✅ `await parent()` | ✅ Context |
| **Parallel execution** | ✅ Promise.all | ✅ Independent Frames |
| **Wire format** | JSON (devalue) | HTML |
| **Hydration cost** | Medium (JSON parse) | Low (DOM patch) |
| **Type safety** | ✅ TypeScript | ✅ TypeScript |

### Performance Implications

**ajo-kit advantages:**
- Zero database queries when cache hits (sum comparison only)
- Single request for all route data
- Automatic invalidation = no stale data bugs

**Remix 3 advantages:**
- HTML streaming = faster First Contentful Paint
- Frames = independent loading, no waterfalls
- Lower hydration cost (no JSON→DOM conversion)
- Progressive enhancement by default

### When to Choose

**ajo-kit for:**
- Database-driven apps where data freshness is critical
- Admin panels, dashboards, internal tools
- Apps where automatic cache invalidation saves dev time
- Teams who want batteries-included caching

**Remix 3 for:**
- Content sites where streaming improves perceived performance
- Apps requiring progressive enhancement
- Teams wanting granular control over caching
- Multi-runtime deployment (Node, Deno, Bun, Edge)

---

## Remix Evolution: v2 → v3

### Remix 2 (React-based)

```tsx
// routes/contact.tsx
export async function loader() {
  return json({ fields: await getFields() })
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData()
  await sendMessage(form.get('message'))
  return redirect('/thanks')
}

export default function Contact() {
  const { fields } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <Form method="post">
      <input name="message" />
      <button disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </Form>
  )
}
```

**Characteristics:**
- React-based with hooks (`useLoaderData`, `useActionData`, `useNavigation`)
- Single `action` export per route
- `<Form>` component for progressive enhancement
- Loaders auto-revalidate after actions

### Remix 3 (No React)

Remix 3 is a **complete rewrite** without React. Key changes:

1. **No React** — Custom component model based on generators/async
2. **Modular packages** — Each piece works independently
3. **HTTP-first** — Direct method handlers instead of loader/action abstraction
4. **LLM-optimized** — Less DSL, more generic patterns for AI code generation

```ts
// Using fetch-router
import { route, form, createRouter } from '@remix-run/fetch-router'

let routes = route({
  contact: form('contact'),  // Creates GET + POST pair
})

let router = createRouter()

router.map(routes, {
  contact: {
    index() {  // GET /contact
      return html`
        <form method="POST" action="${routes.contact.action.href()}">
          <input name="message" />
          <button>Send</button>
        </form>
      `
    },
    action({ formData }) {  // POST /contact
      let message = formData.get('message')
      return html`<p>Thanks for: ${message}</p>`
    },
  },
})
```

---

## Architecture Comparison

### Route Definition

**ajo-kit: File-based routing**
```
src/
  (app)/
    contact/
      page.tsx       → Component + client handler
      handler.ts     → Server actions + data loading
```

**Remix 3: Explicit route declaration**
```ts
let routes = route({
  home: '/',
  contact: form('contact'),
  blog: {
    index: '/blog',
    show: '/blog/:slug',
  },
  api: {
    posts: resources('api/posts'),  // RESTful CRUD
  },
})
```

### Form Actions Definition

**ajo-kit: Named exports**
```ts
// handler.ts
export async function subscribe(req: Request, res: Response) {
  const { email } = parse(EmailSchema, await req.formData())
  await addSubscriber(email)
  return { success: true }
}

export async function unsubscribe(req: Request, res: Response) {
  const { email } = parse(EmailSchema, await req.formData())
  await removeSubscriber(email)
  return { success: true, message: 'Unsubscribed' }
}

export async function contact(req: Request, res: Response) {
  const data = parse(ContactSchema, await req.formData())
  await sendEmail(data)
  return { redirect: '/thanks' }
}
```

**Remix 3: Method handlers or discriminated actions**
```ts
// Option 1: Separate routes with form() helper
let routes = route({
  subscribe: form('subscribe'),
  unsubscribe: form('unsubscribe'),
  contact: form('contact'),
})

router.map(routes, {
  subscribe: {
    index: () => html`<form method="POST">...</form>`,
    action: ({ formData }) => { /* ... */ },
  },
  unsubscribe: {
    index: () => html`<form method="POST">...</form>`,
    action: ({ formData }) => { /* ... */ },
  },
})

// Option 2: Single route with intent discrimination
router.post(routes.actions, ({ formData }) => {
  const intent = formData.get('intent')

  switch (intent) {
    case 'subscribe':
      return handleSubscribe(formData)
    case 'unsubscribe':
      return handleUnsubscribe(formData)
    default:
      return new Response('Unknown action', { status: 400 })
  }
})
```

### Client Invocation

**ajo-kit: Built-in action() helper**
```tsx
// page.tsx
import { action } from '/src/app'

function* ContactForm() {
  const form = action<{ success: boolean }>('contact')

  yield (
    <form onsubmit={form.handle}>
      <input name="email" type="email" />
      <button disabled={form.loading}>
        {form.loading ? 'Sending...' : 'Send'}
      </button>
      {form.error && <p class="error">{form.error.message}</p>}
      {form.data?.success && <p class="success">Message sent!</p>}
    </form>
  )
}
```

**Remix 3: External state management**
```ts
// Using @remix-run/interaction + external state (e.g., Jotai)
import { on } from '@remix-run/interaction'
import { atom, useAtom } from 'jotai'

const loadingAtom = atom(false)
const errorAtom = atom<Error | null>(null)
const dataAtom = atom<{ success: boolean } | null>(null)

function ContactForm() {
  const [loading, setLoading] = useAtom(loadingAtom)
  const [error, setError] = useAtom(errorAtom)
  const [data, setData] = useAtom(dataAtom)

  return html`
    <form ${on({
      async submit(event, signal) {
        event.preventDefault()
        setLoading(true)
        setError(null)

        try {
          const res = await fetch('/contact', {
            method: 'POST',
            body: new FormData(event.currentTarget),
            signal,
          })
          setData(await res.json())
        } catch (e) {
          setError(e)
        } finally {
          setLoading(false)
        }
      }
    })}>
      <input name="email" type="email" />
      <button disabled=${loading}>
        ${loading ? 'Sending...' : 'Send'}
      </button>
    </form>
  `
}
```

---

## URL Patterns

| Pattern | ajo-kit | Remix 3 |
|---------|---------|---------|
| **Single action** | `POST /contact?/send` | `POST /contact` |
| **Multiple actions** | `POST /contact?/subscribe` | `POST /subscribe` |
| | `POST /contact?/unsubscribe` | `POST /unsubscribe` |
| **With data loading** | Same URL, different export | Separate GET handler |
| **RESTful** | `default export { get, post }` | `resources('posts')` helper |

### ajo-kit URL Flow

```
Client Form
     │
     │ POST /newsletter?/subscribe
     │ Content-Type: multipart/form-data
     │ X-CSRF-Token: abc123
     │
     ├────────────────────────────>  Server
     │                                  │
     │                             handler.ts
     │                                  │
     │                             export async function subscribe()
     │                                  │
     │  { success: true }
     │<────────────────────────────
```

### Remix 3 URL Flow

```
Client Form
     │
     │ POST /subscribe
     │ Content-Type: multipart/form-data
     │
     ├────────────────────────────>  fetch-router
     │                                  │
     │                             router.map()
     │                                  │
     │                             subscribe.action({ formData })
     │                                  │
     │  Response
     │<────────────────────────────
```

---

## Helpers Comparison

### Route Helpers

**Remix 3: form() helper**
```ts
// Creates paired routes for display + action
let routes = route({
  contact: form('contact'),
})

// Expands to:
// contact.index  → GET /contact  (display form)
// contact.action → POST /contact (handle submission)
```

**Remix 3: resources() helper**
```ts
// Creates RESTful routes
let routes = route({
  posts: resources('posts'),
})

// Expands to:
// posts.index   → GET /posts
// posts.create  → GET /posts/new
// posts.store   → POST /posts
// posts.show    → GET /posts/:id
// posts.edit    → GET /posts/:id/edit
// posts.update  → PUT /posts/:id
// posts.destroy → DELETE /posts/:id

// With options:
resources('posts', {
  only: ['index', 'show', 'store'],
  param: 'postId',
})
```

**ajo-kit: Implicit from file structure**
```
src/(app)/posts/
  page.tsx           → GET /posts (component)
  handler.ts         → Server handlers
    └─ page()        → Data loading
    └─ create()      → POST /posts?/create
    └─ update()      → POST /posts?/update
    └─ delete()      → POST /posts?/delete
    └─ default {}    → API endpoints at /api/posts
```

### State Helpers

**ajo-kit: action() returns reactive object**
```ts
const form = action<Result>('name')

form.loading   // boolean - submission in progress
form.data      // Result | null - success response
form.error     // Error | null - failure response
form.handle    // (event) => void - form onsubmit handler
form.reset     // () => void - clear state
```

**Remix 3: Build your own (or use libraries)**
```ts
// No built-in state management
// Recommended: TanStack Query, Jotai, or custom hooks

// Example with TanStack Query:
const mutation = useMutation({
  mutationFn: (data) => fetch('/contact', {
    method: 'POST',
    body: data,
  }),
})

mutation.isPending  // boolean
mutation.data       // Result | undefined
mutation.error      // Error | null
mutation.mutate     // (data) => void
mutation.reset      // () => void
```

---

## Middleware

**ajo-kit: wares.ts files**
```ts
// src/(app)/admin/wares.ts
import { role } from '/src/auth/guard'

export default [role('admin')]
// → Applied to all routes under /admin/*
```

**Remix 3: Router middleware**
```ts
import { formData } from '@remix-run/form-data-middleware'
import { session } from '@remix-run/session-middleware'

let router = createRouter({
  middleware: [
    formData(),
    session({ secret: process.env.SESSION_SECRET }),
  ],
})

// Per-route middleware
router.post(routes.admin, [requireAdmin], handler)
```

---

## CSRF Protection

**ajo-kit: Automatic for form actions**
```ts
// wares.ts - applied globally
function csrf(req, _, next) {
  if (req.token) return next()  // Skip for Bearer
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  if (!verifyCsrf(req)) {
    throw new ForbiddenError('Invalid CSRF token')
  }
  next()
}
```

**Remix 3: Manual or via middleware**
```ts
// No built-in CSRF
// Use same-origin check + custom token if needed

import { csrf } from './middleware/csrf'

let router = createRouter({
  middleware: [csrf()],
})
```

---

## Progressive Enhancement

**ajo-kit:**
- Actions work with JavaScript
- No-JS fallback requires manual form action URLs

**Remix 3:**
- Native HTML forms work without JS
- `<form method="POST" action="/contact">` submits normally
- JS enhances with `@remix-run/interaction`

```html
<!-- Works without JavaScript -->
<form method="POST" action="/contact">
  <input name="message" />
  <button>Send</button>
</form>

<!-- Enhanced with JS -->
<form ${on({ submit: handleSubmit })}>
  <input name="message" />
  <button>Send</button>
</form>
```

---

## Validation

**ajo-kit: Valibot integration**
```ts
// handler.ts
import { parse } from '/src/data'
import { object, string, email } from 'valibot'

const ContactSchema = object({
  email: email(),
  message: string(),
})

export async function contact(req: Request) {
  const data = parse(ContactSchema, await req.formData())
  // parse() throws InvalidError with field-level errors
  await sendEmail(data)
  return { success: true }
}
```

**Remix 3: Bring your own**
```ts
// Any validation library works
import { z } from 'zod'

const ContactSchema = z.object({
  email: z.string().email(),
  message: z.string(),
})

router.map(routes, {
  contact: {
    action({ formData }) {
      const result = ContactSchema.safeParse(Object.fromEntries(formData))

      if (!result.success) {
        return new Response(JSON.stringify(result.error), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Handle valid data
      return new Response('OK')
    },
  },
})
```

---

## Error Handling

**ajo-kit: Typed error classes**
```ts
import { InvalidError, ForbiddenError } from '/src/constants'

export async function contact(req: Request) {
  // Validation error with field messages
  throw new InvalidError(
    { email: ['Invalid format'], message: ['Required'] },
    'Validation failed'
  )

  // Authorization error
  throw new ForbiddenError('Not allowed')
}

// Response format:
// { error: { status: 400, message: '...', fields: { ... } } }
```

**Remix 3: Standard Response or custom**
```ts
router.map(routes, {
  contact: {
    action({ formData }) {
      // Standard Response
      return new Response('Bad Request', { status: 400 })

      // JSON error
      return new Response(JSON.stringify({
        error: 'Validation failed',
        fields: { email: ['Invalid'] },
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  },
})
```

---

## File Uploads

**ajo-kit:**
```ts
export async function upload(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File

  await saveFile(file)
  return { filename: file.name }
}
```

**Remix 3: form-data-middleware**
```ts
import { formData } from '@remix-run/form-data-middleware'

let router = createRouter({
  middleware: [
    formData({
      uploadHandler: async (file) => {
        // Custom file handling
        return await saveToStorage(file)
      },
    }),
  ],
})

router.post(routes.upload, ({ formData, files }) => {
  // files is a Map of uploaded files
  const file = files.get('file')
  return new Response(`Uploaded: ${file.name}`)
})
```

---

## Feature Comparison

| Feature | ajo-kit | Remix 3 |
|---------|---------|---------|
| **Multiple actions per route** | Native (named exports) | Manual (intent field or separate routes) |
| **Loading state** | Built-in (`form.loading`) | External library |
| **Error state** | Built-in (`form.error`) | External library |
| **Success data** | Built-in (`form.data`) | External library |
| **Form reset** | Built-in (`form.reset`) | Manual |
| **CSRF protection** | Automatic | Manual/middleware |
| **Validation** | Valibot integration | Bring your own |
| **File uploads** | FormData API | Dedicated middleware |
| **Progressive enhancement** | JS required | Native HTML forms |
| **Type safety** | TypeScript | TypeScript |
| **SSR** | Yes | Yes |
| **Streaming** | No | Planned |

---

## Code Examples

### Complete Contact Form

**ajo-kit:**

```ts
// handler.ts
import { parse } from '/src/data'
import { object, string, email } from 'valibot'
import { limit } from '/src/auth/limit'

const ContactSchema = object({
  email: email(),
  subject: string(),
  message: string(),
})

export async function contact(req: Request) {
  // Rate limiting
  if (!limit.check(req.ip, 'contact', 5, 60000)) {
    throw new AppError(429, 'Too many requests')
  }

  const data = parse(ContactSchema, await req.formData())
  await sendEmail(data)
  limit.hit(req.ip, 'contact')

  return { success: true, message: 'Message sent!' }
}
```

```tsx
// page.tsx
import { action } from '/src/app'

interface ContactResult {
  success: boolean
  message: string
}

function* ContactPage() {
  const form = action<ContactResult>('contact')

  yield (
    <main>
      <h1>Contact Us</h1>

      <form onsubmit={form.handle}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>

        <label>
          Subject
          <input name="subject" required />
        </label>

        <label>
          Message
          <textarea name="message" required />
        </label>

        <button disabled={form.loading}>
          {form.loading ? 'Sending...' : 'Send Message'}
        </button>

        {form.error && (
          <div class="error">
            {form.error.message}
            {form.error.fields && (
              <ul>
                {Object.entries(form.error.fields).map(([field, errors]) =>
                  errors.map(e => <li>{field}: {e}</li>)
                )}
              </ul>
            )}
          </div>
        )}

        {form.data?.success && (
          <div class="success">{form.data.message}</div>
        )}
      </form>
    </main>
  )
}

export default ContactPage
```

**Remix 3:**

```ts
// routes.ts
import { route, form, createRouter } from '@remix-run/fetch-router'
import { formData } from '@remix-run/form-data-middleware'
import { z } from 'zod'

let routes = route({
  contact: form('contact'),
})

const ContactSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
})

let router = createRouter({
  middleware: [formData()],
})

router.map(routes, {
  contact: {
    index() {
      return html`
        <!DOCTYPE html>
        <html>
          <head><title>Contact</title></head>
          <body>
            <h1>Contact Us</h1>
            <form method="POST" action="${routes.contact.action.href()}">
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Subject
                <input name="subject" required />
              </label>
              <label>
                Message
                <textarea name="message" required></textarea>
              </label>
              <button>Send Message</button>
            </form>
          </body>
        </html>
      `
    },

    action({ formData }) {
      const result = ContactSchema.safeParse(Object.fromEntries(formData))

      if (!result.success) {
        return html`
          <div class="error">
            <h2>Validation Error</h2>
            <ul>
              ${result.error.issues.map(i => `<li>${i.path}: ${i.message}</li>`).join('')}
            </ul>
            <a href="${routes.contact.index.href()}">Try again</a>
          </div>
        `
      }

      // Send email...

      return html`
        <div class="success">
          <h2>Message Sent!</h2>
          <a href="/">Back to home</a>
        </div>
      `
    },
  },
})

export default router
```

### Enhanced with Client State (Remix 3)

```ts
// With Jotai for client-side state
import { atom } from 'jotai'
import { on } from '@remix-run/interaction'

const formState = atom({
  loading: false,
  error: null as Error | null,
  data: null as { success: boolean; message: string } | null,
})

function ContactForm() {
  return html`
    <form ${on({
      async submit(event, signal) {
        event.preventDefault()
        const form = event.currentTarget

        store.set(formState, { loading: true, error: null, data: null })

        try {
          const res = await fetch(routes.contact.action.href(), {
            method: 'POST',
            body: new FormData(form),
            signal,
          })

          if (!res.ok) {
            throw new Error(await res.text())
          }

          const data = await res.json()
          store.set(formState, { loading: false, error: null, data })
        } catch (e) {
          store.set(formState, { loading: false, error: e, data: null })
        }
      },
    })}>
      <!-- form fields -->
    </form>
  `
}
```

---

## When to Use Each

### Choose ajo-kit when:

- Building database-driven SPAs
- Want built-in form state management
- Need automatic cache invalidation on DB writes
- Prefer file-based routing
- Using JSX + generators component model
- Need CSRF protection out of the box

### Choose Remix 3 when:

- Need progressive enhancement (no-JS support)
- Want maximum flexibility in state management
- Building with modular, composable packages
- Prefer explicit route declarations
- Want HTTP-first, less abstraction
- Building for multiple runtimes (Node, Deno, Bun, CF Workers)

---

## Migration Paths

### From Remix 2 to Remix 3

```diff
- // Remix 2
- import { useActionData, useNavigation } from '@remix-run/react'
-
- export async function action({ request }) {
-   const form = await request.formData()
-   return json({ success: true })
- }
-
- export default function Page() {
-   const data = useActionData()
-   const nav = useNavigation()
-   return <Form method="post">...</Form>
- }

+ // Remix 3
+ import { route, form } from '@remix-run/fetch-router'
+
+ let routes = route({ page: form('page') })
+
+ router.map(routes, {
+   page: {
+     index: () => html`<form method="POST">...</form>`,
+     action: ({ formData }) => html`Success!`,
+   },
+ })
```

### From Remix 2 to ajo-kit

```diff
- // Remix 2
- export async function action({ request }) {
-   const form = await request.formData()
-   return json({ success: true })
- }

+ // ajo-kit handler.ts
+ export async function myAction(req: Request) {
+   const form = await req.formData()
+   return { success: true }
+ }

- // Remix 2 component
- const data = useActionData()
- const nav = useNavigation()
- <Form method="post">

+ // ajo-kit page.tsx
+ const form = action<Result>('myAction')
+ <form onsubmit={form.handle}>
```

---

## Summary

**ajo-kit** provides a batteries-included approach with:
- Named action exports for multiple actions per route
- Built-in `action()` helper with loading/error/data states
- Automatic CSRF protection
- Tight integration with the caching system

**Remix 3** offers a more modular, HTTP-first approach with:
- Explicit route declarations with `form()` and `resources()` helpers
- Method-based handlers (GET, POST, etc.)
- No built-in client state (bring your own)
- Progressive enhancement by default
- Works across all JavaScript runtimes

The fundamental difference is **convention vs configuration**: ajo-kit uses file-based conventions with built-in state management, while Remix 3 uses explicit declarations with external state management.

---

## References

**Remix 3:**
- [Wake up, Remix! - Official announcement](https://remix.run/blog/wake-up-remix)
- [Thoughts on Remix 3](https://frantic.im/remix-3/) — Technical analysis
- [Remix 3: what's changing and why it matters](https://appwrite.io/blog/post/remix-3-whats-changing-and-why-it-matters) — Architecture overview
- [Remix 3 ditched React: Should you stick with it?](https://blog.logrocket.com/remix-3-ditched-react/) — Migration considerations
- [remix3-resources](https://github.com/markdalgleish/remix3-resources) — Community resources
- [fetch-router package](https://github.com/remix-run/remix/tree/main/packages/fetch-router)
- [node-fetch-server](https://github.com/remix-run/remix/tree/main/packages/node-fetch-server)
- [component package](https://github.com/remix-run/remix/tree/main/packages/component)
- [form-data-middleware](https://github.com/remix-run/remix/tree/main/packages/form-data-middleware)
- [interaction package](https://github.com/remix-run/remix/tree/main/packages/interaction)

**ajo-kit:**
- [Form Actions in handler.ts](../CLAUDE.md)
- [API Endpoints](./api-endpoints.md)
- [Data System](./data.md)
