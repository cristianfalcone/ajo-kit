# Ajo-kit LLM Instructions

Ajo-kit is a full-stack metaframework for building web applications with Ajo. It provides file-based routing, SSR, API routes, layouts, and data loading.

**For Ajo UI library syntax (components, JSX, `this.next()`, context, etc.):** See `node_modules/ajo/LLMs.md`

## Project Structure

```
src/
├── app.tsx              # Router (DO NOT MODIFY)
├── server.tsx           # SSR + API setup (DO NOT MODIFY)
├── client.tsx           # Client hydration (DO NOT MODIFY)
├── layout.tsx           # Root layout
├── page.tsx             # Home page (/)
├── constants.ts         # Global types, contexts, utilities
├── handler.ts           # Root API handlers
├── wares.ts             # Root API middlewares
├── ui/                  # Global reusable components
├── (marketing)/         # Route group (no URL impact)
│   ├── layout.tsx       # Section layout
│   ├── constants.ts     # Section-specific types, contexts
│   ├── ui/              # Section-specific components
│   ├── blog/
│   │   ├── page.tsx     # /blog
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

```tsx
// src/blog/[id]/page.tsx
import type { Stateful } from 'ajo'

type Args = { params: { id: string } }

const BlogPost: Stateful<Args, 'article'> = function* (args) {
  let post: { title: string; content: string } | null = null

  fetch(`/api/posts/${args.params.id}`)
    .then(r => r.json())
    .then(data => this.next(() => post = data))

  while (true) yield (
    <>
      {post ? (
        <>
          <h1>{post.title}</h1>
          <div>{post.content}</div>
        </>
      ) : (
        <div>Loading...</div>
      )}
    </>
  )
}

BlogPost.is = 'article'
BlogPost.attrs = { class: 'prose max-w-4xl' }

export default BlogPost
```

**With SSR data loader:**

```tsx
import type { Stateful } from 'ajo'
import { NotFoundError, type LoaderArgs } from '../constants'

type Args = {
  params: { id: string }
  data: { post: { title: string; content: string } }
}

const BlogPost: Stateful<Args> = function* (args) {
  while (true) {
    const { data } = args
    yield (
      <>
        <h1>{data.post.title}</h1>
        <p>{data.post.content}</p>
      </>
    )
  }
}

export default BlogPost

export const load = async ({ params }: LoaderArgs) => {
  const post = await fetchPost(params.id)
  if (!post) throw new NotFoundError()
  return { post }
}
```

## Layout Component

**Stateless layout:**

```tsx
// src/blog/layout.tsx
import type { Children, Stateless } from 'ajo'

type Args = { children: Children }

const Layout: Stateless<Args> = ({ children }) => (
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
import type { Children, Stateful } from 'ajo'
import { AdminContext } from './constants'

type Args = { children: Children }

const AdminLayout: Stateful<Args> = function* (args) {
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

  del: (req: Request) => {  // 'del' for DELETE
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
// src/constants.ts - Global
import { context } from 'ajo/context'

export class NotFoundError extends Error {}

export type LoaderArgs = { url: URL; params: Record<string, string> }
export type User = { id: string; name: string; email: string }

export const ThemeContext = context<'light' | 'dark'>('light')
export const AuthContext = context<User | null>(null)

export const navigate = (to: string) => {
  history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
}

// src/(admin)/constants.ts - Section-specific
import { context } from 'ajo/context'

export const AdminContext = context<{ sidebarOpen: boolean }>({ sidebarOpen: true })
```

## Rules

| Topic | Rule |
|-------|------|
| **Pages** | Export `default` component + optional `load` function |
| **Layouts** | Export `default` component, receives `children` in args |
| **Loaders** | Async `load({ url, params })`, return data object |
| **404** | Throw `NotFoundError` in loader |
| **API handlers** | Export default object with HTTP verbs: `get`, `post`, `put`, `del`, `patch` |
| **Middleware** | Export default function or array from `wares.ts` |
| **Route groups** | `(name)/` folders organize code, excluded from URL |
| **Dynamic segments** | `[param]` for single, `[...]` for catch-all |
| **Static files** | Place in `public/` directory |
| **Core files** | Never modify `app.tsx`, `server.tsx`, `client.tsx` |
| **Constants** | Global in `src/constants.ts`, section-specific in `src/(section)/constants.ts` |
| **Components** | Global in `src/ui/`, section-specific in `src/(section)/ui/` |

## SSR Data Flow

1. Server runs all `load()` functions in parallel
2. Data injected into HTML as `window.__SSR__`
3. Client hydrates, uses cached data (no re-fetch)
4. Subsequent navigations run loaders client-side

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
export const load = async ({ params }) => {
  return await fetch(`/api/${params.id}`)  // might return null
}

// ✅ Handle missing data
export const load = async ({ params }) => {
  const data = await fetch(`/api/${params.id}`)
  if (!data) throw new NotFoundError()
  return data
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
