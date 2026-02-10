# kit

Full-stack metaframework for [Ajo](https://github.com/cristianfalcone/ajo) (JSX + generators). SvelteKit-style routing & data loading, Laravel-style auth.

## Getting Started

### 1. Project structure

```
my-app/
├── packages/kit/           # framework (this package)
├── src/
│   ├── layout.tsx          # root layout
│   ├── page.tsx            # root page (/)
│   ├── wares.ts            # root middleware
│   ├── data/               # database, schema, fields
│   ├── (public)/           # public routes group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (app)/              # authenticated routes group
│       ├── wares.ts        # group middleware (e.g. protect())
│       └── dashboard/page.tsx
├── index.html
├── server.ts
├── vite.config.ts
├── pnpm-workspace.yaml
└── package.json
```

### 2. Workspace setup

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'
```

**package.json:**

```json
{
  "type": "module",
  "dependencies": {
    "kit": "workspace:*",
    "ajo": ">=0.1.0"
  },
  "scripts": {
    "dev": "tsx watch server.ts dev",
    "build": "pnpm build:client && pnpm build:server",
    "build:client": "vite build --outDir dist/client",
    "build:server": "vite build --ssr packages/kit/src/server.tsx --outDir dist/server",
    "prod": "NODE_ENV=production tsx server.ts prod"
  }
}
```

### 3. Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { kit, jsx } from 'kit/vite'

export default defineConfig({
  plugins: [...kit()],
  esbuild: jsx,
})
```

The `kit()` plugin:
- Registers `@kit` as an import alias (use `@kit/*` in your app code)
- Generates virtual modules for routes, handlers, and CSS
- Blocks server-only modules from the client bundle
- Enables HMR for pages and layouts

**Options:**

```ts
kit({
  routes: '/src/**/{layout,page}.{j,t}s{,x}',    // default
  handlers: '/src/**/handler.{j,t}s{,x}',         // default
  wares: '/src/**/wares.{j,t}s{,x}',              // default
  serverOnly: [/(handler|wares)\.[jt]sx?$/, /\/src\/data\//, /\/src\/auth\//],
  css: ['virtual:uno.css'],                        // CSS entries injected into client
})
```

### 4. Server entry

```ts
// server.ts
import { dev, prod, listen } from 'kit/node'
import sade from 'sade'

sade('my-app')
  .option('--port, -p', 'Port', 5173)
  .command('dev')
  .action(async (opts) => { await listen(await dev(), opts.port) })
  .command('prod')
  .action(async (opts) => { await listen(await prod(), opts.port) })
  .parse(process.argv)
```

### 5. HTML template

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- ssr:head -->
</head>
<body>
  <!-- ssr:data -->
  <div id="root">
    <!-- ssr:root -->
  </div>
  <script src="/src/client" type="module"></script>
</body>
</html>
```

The `<!-- ssr:* -->` markers are replaced during SSR. The `/src/client` script resolves to `@kit/client` via the Vite plugin.

### 6. TypeScript

Add `@kit` paths to your **tsconfig.json** for IDE support:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "/src/*": ["src/*"],
      "@kit": ["packages/kit/src/constants.ts"],
      "@kit/*": ["packages/kit/src/*"]
    }
  }
}
```

## Imports

App code imports from `@kit` (resolved by the Vite plugin). Config files that run outside Vite (`vite.config.ts`, `server.ts`) use `kit/` directly.

```ts
// App code — use @kit
import { AppError, type PageArgs, navigate } from '@kit'
import { action, subscribe, invalidate } from '@kit/client'
import { emit } from '@kit/server'
import { protect, guest } from '@kit/auth'
import { hash } from '@kit/auth/password'
import { parse } from '@kit/validate'
import type { Head } from '@kit/head'

// Config files — use kit/
import { kit, jsx } from 'kit/vite'       // vite.config.ts
import { dev, prod, listen } from 'kit/node' // server.ts
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

**Auto-emit** — events fire when their `deps` tables change:

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

## Auth

Configure the auth DB accessor in your root middleware:

```ts
// wares.ts
import { configure } from '@kit/auth/store'
import { db } from '/src/data'
configure(() => db())
```

Available modules:

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
