# ajo-kit

Full-stack metaframework for [Ajo](https://github.com/nicostav/ajo) (JSX + generators). SvelteKit-style routing & data loading, Laravel-style auth.

## Quick Start

### Template (recommended)

```bash
pnpm dlx degit user/ajo-kit/packages/template my-app
cd my-app
pnpm install
pnpm dev
```

### Manual Setup

```bash
mkdir my-app && cd my-app
pnpm init
pnpm add ajo ajo-kit
pnpm add -D vite tsx typescript
```

Create **server.ts**:

```ts
import { run } from 'ajo-kit/node'
await run()
```

Create **vite.config.ts**:

```ts
import { defineConfig } from 'vite'
import { kit, jsx } from 'ajo-kit/vite'

export default defineConfig({
  plugins: [...kit()],
  esbuild: jsx,
})
```

Create **tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "baseUrl": ".",
    "paths": {
      "/src/*": ["src/*"],
      "@kit": ["node_modules/ajo-kit/src/constants.ts"],
      "@kit/*": ["node_modules/ajo-kit/src/*"]
    }
  }
}
```

Create **src/page.tsx**:

```tsx
export default () => (
  <main>
    <h1>Welcome to ajo-kit</h1>
    <p>Edit <code>src/page.tsx</code> to get started.</p>
  </main>
)
```

Add scripts to **package.json**:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts dev",
    "build": "tsx server.ts build",
    "start": "NODE_ENV=production tsx server.ts start"
  }
}
```

Run:

```bash
pnpm dev
```

## Imports

App code imports from `@kit` (resolved automatically by the Vite plugin). Config files that run outside Vite use `ajo-kit/` directly.

```ts
// App code — use @kit
import type { Request, Response, Middleware } from '@kit'
import { AppError, type PageArgs, navigate } from '@kit'
import { action, subscribe, invalidate } from '@kit/client'
import { emit, send } from '@kit/server'
import { protect, guest } from '@kit/auth/guard'
import { parse } from '@kit/validate'

// Companion libraries — installed by the app
import type { Stateful } from 'ajo'
import { object, string } from 'valibot'
import { sql } from 'kysely'

// Config files — use ajo-kit/
import { kit, jsx } from 'ajo-kit/vite'       // vite.config.ts
import { run } from 'ajo-kit/node'             // server.ts
```

## Routing

File-based routing with groups, params, and catch-all:

```
src/page.tsx                    → /
src/about/page.tsx              → /about
src/blog/[id]/page.tsx          → /blog/:id
src/docs/[...]/page.tsx         → /docs/*
src/(app)/dashboard/page.tsx    → /dashboard    (group excluded from URL)
```

Each route can have:

| File | Runs On | Purpose |
|------|---------|---------|
| `page.tsx` | Both | UI component + client-side data loading |
| `layout.tsx` | Both | Shared wrapper + loading/error states |
| `handler.ts` | Server | Database queries, secrets, form actions, SSE events |
| `wares.ts` | Server | Middleware (auth guards, logging) |

## Data Loading

**Client-side** (in `page.tsx` / `layout.tsx`):

```tsx
export async function handler(context, parent) {
  const parentData = await parent()
  return { posts: await fetch('/api/posts').then(r => r.json()) }
}
```

**Server-side** (in `handler.ts`):

```ts
export const deps = ['posts', ':user']  // enables caching

export async function page(req, parent) {
  return { posts: await db().selectFrom('posts').select(['id', 'title']).execute() }
}
```

Data merges as `{ ...serverData, ...clientData }` — client wins on conflicts.

## Form Actions

```ts
// handler.ts
export const actions = {
  create: async (req, res) => {
    const data = parse(schema, req.body)
    await db().insertInto('posts').values(data).execute()
    return { ok: true }
  }
}
```

```tsx
// page.tsx
import { action } from '@kit/client'

const Page = function* () {
  const form = action('create')
  while (true) {
    yield (
      <form onsubmit={form.handle}>
        <input name="title" />
        <button disabled={form.loading}>Create</button>
        {form.error && <p>{form.error.message}</p>}
      </form>
    )
  }
}
```

## Real-time Events (SSE)

Events fire automatically when their `deps` tables change:

```ts
// handler.ts
export const deps = ['messages', ':user']
export const events = {
  messages: async (req) => {
    return { messages: await db().selectFrom('messages').execute() }
  }
}
```

```tsx
// page.tsx
import { subscribe } from '@kit/client'

const Page = function* (args) {
  let messages = args.data?.messages ?? []
  subscribe('messages', ({ data }) => { messages = data.messages })
  while (true) {
    yield <ul>{messages.map(m => <li>{m.text}</li>)}</ul>
  }
}
```

## Auth (ajo-auth)

Auth is a separate package. Install it if your app needs authentication:

```bash
pnpm add ajo-auth
```

The `@kit/auth/*` alias resolves to `ajo-auth/*` automatically via the Vite plugin.

| Import | Purpose |
|--------|---------|
| `@kit/auth/password` | Argon2id hash/verify |
| `@kit/auth/session` | Session create/validate |
| `@kit/auth/cookie` | HttpOnly session cookie |
| `@kit/auth/guard` | `protect()`, `guest()`, `role()`, `ability()` |
| `@kit/auth/csrf` | CSRF protection |
| `@kit/auth/limit` | Rate limiting |
| `@kit/auth/token` | Bearer token auth |
| `@kit/auth/reset` | Password reset tokens |
| `@kit/auth/verify` | Email verification |

## Cache

Export `deps` in `handler.ts` to enable SvelteKit-style caching:

```ts
export const deps = ['users', ':user']       // skip if users table unchanged + same user
export const deps = ['posts', ':ttl:60000']  // skip if posts unchanged + <60s elapsed
```

The client sends `X-Have` headers with cached sums. If sums match, the server skips the handler and returns `null` (client uses cache). Use `invalidate()` from `@kit/client` to clear cache manually.
