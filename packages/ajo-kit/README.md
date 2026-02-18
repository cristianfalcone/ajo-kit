# ajo-kit

Full-stack metaframework for [Ajo](https://github.com/cristianfalcone/ajo) with file-based routing, server handlers, form actions, middleware, migrations, and SSE topic updates.

## Install

```bash
pnpm add ajo ajo-kit
pnpm add -D vite tsx typescript @types/node
```

`kit` is a TSX-powered CLI (`#!/usr/bin/env tsx`), so `tsx` must be available in your project.

## Minimal Setup

### `package.json`

```json
{
  "type": "module",
  "scripts": {
    "dev": "kit dev",
    "build": "kit build",
    "start": "kit start"
  }
}
```

### `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import { kit, jsx } from 'ajo-kit/vite'

export default defineConfig({
  plugins: [...kit()],
  esbuild: jsx,
})
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "/src/*": ["src/*"],
      "@kit": ["node_modules/ajo-kit/src/constants.ts"],
      "@kit/*": ["node_modules/ajo-kit/src/*"]
    }
  }
}
```

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- ssr:head -->
</head>
<body>
  <!-- ssr:data -->
  <div id="root"><!-- ssr:root --></div>
  <script src="/src/client" type="module"></script>
</body>
</html>
```

### `src/page.tsx`

```tsx
export default () => (
  <main>
    <h1>Welcome to ajo-kit</h1>
    <p>Edit <code>src/page.tsx</code> to get started.</p>
  </main>
)
```

Use `packages/template` in this monorepo as the current reference scaffold.

## CLI

```bash
kit dev [-p 5173]
kit build
kit start [-p 5173]

kit migrate up [-d ./database.sqlite]
kit migrate down [-d ./database.sqlite]
kit migrate status [-d ./database.sqlite]
kit migrate create <name>

kit seed [-d ./database.sqlite]
```

Defaults:

- database: `./database.sqlite`
- migrations folder: `db/migrations`
- seeds folder: `db/seeds`

## Routing

File-based routes:

```text
src/page.tsx                    -> /
src/about/page.tsx              -> /about
src/blog/[id]/page.tsx          -> /blog/:id
src/docs/[...]/page.tsx         -> /docs/*
src/(app)/dashboard/page.tsx    -> /dashboard
```

Per-route files:

- `page.tsx`: page component
- `layout.tsx`: shared wrapper for a route branch
- `handler.ts`: server loaders/actions/api handlers
- `wares.ts`: middleware for that branch and descendants

## Server Handlers

`handler.ts` supports:

```ts
import type { Request, Response } from '@kit'
import { send } from '@kit/server'
import type { Head } from '@kit/head'

export async function layout(req: Request, parent: () => Promise<Record<string, unknown>>) {
  return {}
}

export async function page(req: Request, parent: () => Promise<Record<string, unknown>>) {
  return {}
}

export async function head(req: Request, parent: () => Promise<Record<string, unknown>>): Promise<Head> {
  return { title: 'My page' }
}

export const actions = {
  async save(req: Request, res: Response) {
    return { ok: true }
  }
}

export default {
  async get(req: Request, res: Response) {
    send(res, 200, { ok: true })
  }
}
```

Notes:

- `default` maps HTTP methods to `/api/<route>`.
- API handlers in `default` must write/send the HTTP response.
- `actions` are invoked by `POST /current-route?/actionName`.
- action `"default"` is used when no `?/name` is provided.
- `parent()` resolves merged ancestor loader data.

## Actions from Client

```tsx
import { action } from '@kit/client'

const Page = function* () {
  const form = action<{ ok: boolean }>('save')

  while (true) {
    yield (
      <form onsubmit={form.submit}>
        <input name="title" />
        <button disabled={form.loading}>Save</button>
        {form.error && <p>{form.error.message}</p>}
      </form>
    )
  }
}
```

You can also trigger programmatically:

```ts
await form.invoke({ title: 'Hello' })
```

If an action returns `{ redirect: '/path' }`, client navigation is triggered automatically.

## Middleware

`wares.ts` exports one middleware or an array:

```ts
import { session, csrf } from '@kit/auth/wares'

export default [session(), csrf]
```

Middlewares are collected from route ancestors and applied to both page and API handlers.

## SSE Topics (Live Updates)

Track topics in loaders, then emit from server code after mutations:

```ts
// src/chat/handler.ts
import { emit } from '@kit/server'

export async function page(req) {
  req.track?.('messages')
  return { messages: [] }
}

export const actions = {
  async create(req) {
    // write to DB...
    emit('messages')
    return { ok: true }
  }
}
```

The runtime maintains an SSE stream, revalidates affected routes, computes JSON patches, and applies them client-side.

## Database and Migrations

`ajo-kit/database` exports:

- `connect(path?)`
- `db<T>()`
- `raw()`
- `close()`
- `Database` (better-sqlite3)
- `sql` and Kysely types

`kit migrate` merges:

- app migrations in `db/migrations`
- plugin migrations discovered from installed `ajo-*` packages that expose `package.json#kit.migrations`

`kit seed` runs sorted `db/seeds/*.ts` files that export:

```ts
export async function seed(db) {
  // ...
}
```

## Validation

`@kit/validate` re-exports common Valibot helpers and provides `parse(schema, data)`, which throws `InvalidError` with field-level details.

## Plugin Discovery

Installed packages named `ajo-*` (except `ajo-kit`) with a `kit` block in `package.json` are auto-discovered:

```json
{
  "kit": {
    "alias": "auth",
    "serverOnly": true,
    "migrations": "./migrations/",
    "commands": "./src/commands.ts"
  }
}
```

This enables:

- `@kit/<alias>` import aliases
- server-only import protection in Vite
- automatic migration loading
- CLI command extension via `register(cli)`
