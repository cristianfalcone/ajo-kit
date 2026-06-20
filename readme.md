# ajo-kit

The fastest way to build [Ajo](https://github.com/cristianfalcone/ajo) apps.

`ajo-kit` is a small full-stack metaframework for Ajo: file routes, SSR, route
loaders, actions, API handlers, middleware, SQLite/Kysely, validation, live SSE
updates, and optional auth through `ajo-auth`.

## Documentation Map

- `readme.md`: human guide for building apps with Ajo and `ajo-kit`.
- `ai/architecture.md`: technical implementation and runtime architecture.
- `ai/LLMs.md`: compact operating guide for AI coding agents.
- `ai/chat.md`: chat demo app behavior, data, and QA notes.

## Install

```bash
pnpm add ajo ajo-kit ajo-auth
pnpm add -D vite tsx typescript @types/node
```

`kit` runs through `tsx`, so `tsx` must be available in the app.

## Minimal Setup

```json
{
  "type": "module",
  "scripts": {
    "dev": "kit dev",
    "build": "kit build",
    "start": "kit start",
    "test": "vitest run"
  }
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { kit, jsx } from 'ajo-kit/vite'

export default defineConfig({
  plugins: [...kit()],
  esbuild: jsx,
})
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "ajo",
    "strict": true,
    "paths": {
      "/src/*": ["./src/*"],
      "@kit": ["./node_modules/ajo-kit/src/constants.ts"],
      "@kit/*": ["./node_modules/ajo-kit/src/*"],
      "@kit/auth": ["./node_modules/ajo-auth/src/index.ts"],
    }
  }
}
```

```html
<!-- index.html -->
<!doctype html>
<html>
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

The examples below use the app aliases created by the Vite plugin: `@kit` maps
to `ajo-kit`, and `@kit/auth` maps to `ajo-auth`.

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

- Database: `./database.sqlite`
- Migrations: `db/migrations`
- Seeds: `db/seeds`

## Routes

Routes are filesystem based:

```text
src/page.tsx                    -> /
src/about/page.tsx              -> /about
src/blog/[id]/page.tsx          -> /blog/:id
src/docs/[...]/page.tsx         -> /docs/*
src/(app)/dashboard/page.tsx    -> /dashboard
```

Route files:

- `page.tsx`: page component.
- `layout.tsx`: wrapper for a route branch.
- `handler.ts`: loaders, actions, head, and API handlers.
- `wares.ts`: middleware for the branch and descendants.

## Route Module API

```ts
import type { Parent, Request, Response, Entry } from '@kit'
import type { Head } from '@kit/head'
import { send } from '@kit/server'

export async function layout(req: Request, parent: Parent): Promise<Entry> {
  return {}
}

export async function page(req: Request, parent: Parent): Promise<Entry> {
  req.track?.('topic:name')
  return {}
}

export async function head(req: Request, parent: Parent): Promise<Head> {
  return { title: 'Page title' }
}

export const actions = {
  async save(req: Request, res: Response) {
    return { ok: true }
  },
}

export default {
  async get(req: Request, res: Response) {
    send(res, 200, { ok: true })
  },
}
```

Types:

```ts
type Entry = Record<string, unknown>
type Parent = () => Promise<Entry>
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'

type RouteModule = {
  layout?: (req: Request, parent: Parent) => Promise<Entry>
  page?: (req: Request, parent: Parent) => Promise<Entry>
  head?: (req: Request, parent: Parent) => Promise<Head>
  actions?: Record<string, (req: Request, res: Response) => Promise<unknown>>
  default?: Partial<Record<Method, Middleware>>
}
```

Rules:

- `layout()` returns branch data.
- `page()` returns page data.
- `parent()` returns merged ancestor loader data.
- `head()` returns title/meta/link data.
- `actions.default` handles `action()` with no name.
- `actions.name` handles `action('name')` at `POST /current-route?/name`.
- `default` HTTP methods become `/api/<route>` handlers.
- API handlers own the response; use `send(res, status, payload)`.
- Track live reads with `req.track?.(topic)` and emit after writes commit.

## Page and Layout Components

```tsx
import type { Frame, Props } from '@kit'

type Data = { user: { id: number; name: string } }

export default function Page({ data, params, loading, error }: Props<Data>) {
  if (error) return <p>{error.message}</p>
  return <h1>{data?.user.name}</h1>
}

export function Layout({ data, children }: Frame<Data>) {
  return <main>{children}</main>
}
```

Types:

```ts
type Props<T = Entry> = {
  params: Record<string, string>
  data?: T
  loading: boolean
  error?: Failure
}

type Frame<T = Entry> = Props<T> & {
  children: import('ajo').Children
}
```

## `@kit`

Core route and request helpers.

```ts
import {
  Failure,
  Missing,
  Forbidden,
  Denied,
  Invalid,
  normalize,
  navigate,
  ajax,
  api,
  ip,
  origin,
  date,
  type Request,
  type Response,
  type Middleware,
  type Parent,
  type Props,
  type Frame,
  type Action,
  type User,
} from '@kit'
```

Errors:

```ts
class Failure extends Error {
  constructor(status: number, message: string)
  status: number
  toJSON(): { status: number; message: string; stack?: string }
}

class Missing extends Failure        // 404
class Forbidden extends Failure       // 403
class Denied extends Failure    // 401
class Invalid extends Failure {       // 400
  fields: Record<string, string[] | undefined>
}

function normalize(error: unknown): Failure
```

Request helpers:

```ts
function ajax(req: Request): boolean
function api(req: Request): boolean
function ip(req: Request): string
function origin(req: Request): string
```

Client helpers:

```ts
function navigate(to: string): void
function date(iso: string, options?: Intl.DateTimeFormatOptions): string
```

Request extensions set by the framework and auth middleware:

```ts
interface Request {
  user?: User
  session?: { id: string }
  token?: { id: string; abilities: string[] }
  track?: (topic: string | string[]) => void
  topics?: Set<string>
}

interface User {
  id: number
  roles?: string[]
  [key: string]: unknown
}
```

## `@kit/server`

Server runtime helpers.

```ts
import { emit, send } from '@kit/server'
```

```ts
function emit(topic: string | string[]): void
```

Notifies active routes that data for those topics changed.
Call it after durable writes commit.

```ts
import { send } from '@kit/server'

send(res, 200, { ok: true })
```

`send` is the Polka response helper for API handlers.

## `@kit/client`

Action helper for stateful Ajo generator components.

```tsx
import { action } from '@kit/client'

const form = action<{ ok: true }>('save')

<form onsubmit={form.submit}>
  <input name="title" />
  <button disabled={form.loading}>Save</button>
  {form.error && <p>{form.error.message}</p>}
</form>

await form.invoke({ title: 'Hello' })
```

Types:

```ts
function action<T = unknown>(name?: string, init?: RequestInit): Action<T>

type Action<T> = {
  loading: boolean
  data?: T
  error?: { status: number; message: string; fields?: Record<string, string[] | undefined> }
  submit: (event: SubmitEvent) => void
  invoke: (body?: unknown) => Promise<T | undefined>
  reset: () => void
}
```

Behavior:

- Sends JSON with `credentials: 'include'`.
- Aborts previous in-flight calls for the same action state.
- Resets successful forms submitted through `submit()`.
- Navigates automatically when the action returns `{ redirect: '/path' }`.
- Invalidates route cache topics returned by the server.

## `@kit/head`

Document head contract.

```ts
import type { Head } from '@kit/head'
import { merge, render, apply } from '@kit/head'
```

```ts
type Head = {
  title?: string
  meta?: (
    | { name: string; content: string }
    | { property: string; content: string }
    | { httpEquiv: string; content: string }
  )[]
  link?: { rel: string; href: string; [key: string]: string | undefined }[]
}

function merge(...heads: (Head | undefined)[]): Head
function render(head?: Head): string
function apply(head?: Head): void
```

`merge()` dedupes `meta` and `link` entries; later heads win. `render()` is for
SSR. `apply()` updates `document.head` on the client.

## `@kit/validate`

Valibot helpers plus framework error mapping.

```ts
import {
  object,
  string,
  number,
  boolean,
  array,
  optional,
  literal,
  pipe,
  trim,
  toLowerCase,
  transform,
  forward,
  partialCheck,
  email,
  minLength,
  maxLength,
  unknown,
  parse,
} from '@kit/validate'
```

```ts
function parse<T extends GenericSchema>(schema: T, data: unknown): InferOutput<T>
```

`parse()` returns validated data or throws `Invalid` with field-level
errors that `action()` can display.

## `@kit/database`

SQLite and Kysely helpers.

```ts
import {
  connect,
  db,
  raw,
  close,
  sql,
  Database,
  type Kysely,
  type Generated,
  type Selectable,
  type Insertable,
  type Sqlite,
} from '@kit/database'
```

```ts
function connect(path?: string): Sqlite
function db<T = any>(): Kysely<T>
function raw(): Sqlite
function close(): Promise<void>
```

`connect()` enables WAL, foreign keys, a 5000 ms busy timeout, and
`synchronous = NORMAL`. `db<T>()` returns the Kysely instance. `raw()` returns
the underlying `better-sqlite3` database.

## `@kit/mail`

Small configurable mail transport.

```ts
import { configure, send, type Mail, type Transport } from '@kit/mail'
```

```ts
type Mail = {
  to: string
  subject: string
  text: string
  html?: string
}

type Transport = (mail: Mail) => Promise<void>

function configure(handler: Transport): void
function send(mail: Mail): Promise<void>
```

The default transport logs mail to stdout. Configure a real transport at app
boot.

## `@kit/vite`

Vite integration.

```ts
import { kit, jsx, defaults, type Options } from 'ajo-kit/vite'
```

```ts
type Guard = RegExp | string | ((id: string) => boolean)

type Options = {
  guard?: Guard[]
  css?: string[]
}

function kit(options?: Options): import('vite').Plugin[]

const jsx = {
  jsx: 'automatic',
  jsxImportSource: 'ajo',
} as const

const defaults = {
  database: './database.sqlite',
  migrations: 'db/migrations',
  seeds: 'db/seeds',
} as const
```

`kit()` is the app integration plugin. It wires file routes, handlers, aliases,
server-only protection, HMR, CSS entries, and production SSR support.

## `ajo-kit/node`

Programmatic CLI runtime. Most apps use the `kit` binary instead.

```ts
import { compile, dev, start, build, listen, type Options } from 'ajo-kit/node'
```

```ts
type Options = {
  hmr?: import('vite').ServerOptions['hmr']
}

function compile(html: string): (slots: Record<string, string>) => string
function dev(options?: Options): Promise<any>
function start(): Promise<any>
function build(): Promise<void>
function listen(app: any, port?: number, options?: { strict?: boolean }): Promise<number>
```

## Auth Setup

`ajo-auth` is a kit plugin. It provides auth tables, route middleware, guards,
API tokens, password hashing, reset tokens, email verification signatures, and
in-memory rate limiting.

```ts
// src/wares.ts
import { configure, wares } from '@kit/auth'
import { db } from '/src/data'

configure(() => db())

export default [wares.session(), wares.csrf]
```

Run migrations after installing `ajo-auth`:

```bash
kit migrate up
```

Set a production secret for signed verification links:

```env
APP_SECRET=your-secret-key
```

## `@kit/auth`

Main auth exports.

```ts
import {
  configure,
  auth,
  role,
  protect,
  guest,
  ability,
  confirmed,
  verified,
  redirect,
  when,
  authorize,
  wares,
  password,
  session,
  cookie,
  csrf,
  token,
  limit,
  confirm,
  reset,
  verify,
  type User,
  type New,
  type Session,
  type Token,
  type Role,
  type Auth,
} from '@kit/auth'
```

```ts
function configure(fn: () => Kysely<any>): void
```

Connects auth helpers to the app Kysely instance.

Guards:

```ts
function auth(): Middleware
function role<R extends string>(...allowed: R[]): Middleware
function protect(to?: string): Middleware
function guest(to?: string): Middleware
function ability(...required: string[]): Middleware
function confirmed(window?: number): Middleware
function verified(): Middleware
function redirect(to: string | ((req: Request) => string)): Middleware
function when(
  condition: (req: Request, res: Response) => boolean,
  middleware: Middleware,
  otherwise?: Middleware,
): Middleware
```

Guard behavior:

- `auth()` requires `req.user`.
- `role()` requires any matching role.
- `protect()` redirects guests.
- `guest()` redirects authenticated users.
- `ability()` checks bearer-token abilities when a bearer token is present.
- `confirmed()` requires recent password confirmation for the current credential.
- `verified()` requires `users.verified`.
- `redirect()` returns JSON redirects for AJAX requests and 302 for normal pages.

For handler-local ability checks:

```ts
import { authorize } from '@kit/auth'

authorize(req, 'tokens:read')
```

## `@kit/auth` Middleware

Authentication and CSRF middleware.

```ts
import { wares } from '@kit/auth'
```

```ts
type ResolveUser = (user: number) => Promise<import('@kit').User | null>

const wares: {
  session(lookup?: ResolveUser): Middleware
  csrf: Middleware
}
```

`session()` clears auth state, authenticates bearer tokens only on `/api/*`, and
falls back to cookie sessions for browser routes. On API requests, an explicit
Bearer token wins over cookies.

`csrf` skips safe methods, bearer-token requests, and unauthenticated public API
requests. Unsafe cookie-auth requests need a valid double-submit token or
same-origin proof.

## Auth Low-Level Modules

These are useful when implementing custom auth routes.

```ts
// password
function hash(plain: string): Promise<string>
function verify(plain: string, hashed: string): Promise<boolean>
```

```ts
// session
function generate(): string
function hash(plain: string): string
function create(user: number, remember?: boolean, ip?: string, agent?: string): Promise<string>
function validate(plain: string): Promise<{ id: string; user: number; expiry: string } | null>
function remove(plain: string): Promise<unknown>
function touch(plain: string): Promise<unknown>
```

Sessions return a plaintext cookie value. The database stores only
`sha256(plain)`.

```ts
// cookie
function parse(header: string | undefined, key: string): string | undefined
function read(req: Request): string | undefined
function write(res: Response, value: string, remember?: boolean): void
function clear(res: Response): void
```

```ts
// csrf
function set(res: Response): string
function verify(req: Request): boolean
```

```ts
// token
type Ability = string

function create(
  user: number,
  name: string,
  abilities?: Ability[],
  ttl?: number | null,
): Promise<string>

function validate(plain: string): Promise<{
  id: string
  user: number
  abilities: Ability[]
  expiry: string | null
} | null>

function can(abilities: Ability[], required: Ability): boolean
function all(abilities: Ability[], required: Ability[]): boolean
function revoke(plain: string): Promise<unknown>
function purge(user: number): Promise<unknown>
function list(user: number): Promise<Token[]>
function prune(): Promise<unknown>
```

Abilities support `*`, exact matches, and resource wildcards like `posts:*`.

```ts
// limit
function check(key: string, max?: number): boolean
function hit(key: string, window?: number): void
function clear(key: string): void
function remaining(key: string, max?: number): number
```

This limiter is in-memory and per-process.

```ts
// confirm
function credential(req: Request): string | null
function stamp(req: Request): boolean
function check(req: Request, window?: number): boolean
function clear(req: Request): void
function session(user: number, id: string): void
function token(user: number, id: string): void
function user(user: number): void
```

Confirmation is scoped to the current session or bearer token credential.

```ts
// reset
function create(user: number): Promise<string>
function validate(plain: string): Promise<number | null>
function prune(): Promise<unknown>
```

Reset tokens are hashed in the database and expire after one hour.

```ts
// verify
function sign(user: number): string
function validate(signature: string): number | null
function url(user: number, base: string): string
```

Verification signatures are HMAC-SHA256 signed and expire after 24 hours.

## Live Data Pattern

```ts
import type { Request } from '@kit'
import { emit } from '@kit/server'

export async function page(req: Request) {
  req.track?.('posts:list')
  return { posts: await listPosts() }
}

export const actions = {
  async create(req: Request) {
    await createPost(req.body)
    emit('posts:list')
    return { ok: true }
  },
}
```

Loaders track every topic they read. Mutations emit every topic whose readers
observe changed data. Emit after transactions commit.

## Public Import Map

| Import | Use |
|---|---|
| `@kit` / `ajo-kit` | Core types, errors, request helpers, navigation helpers |
| `@kit/server` / `ajo-kit/server` | `send`, `emit`, server runtime entry |
| `@kit/client` / `ajo-kit/client` | `action()` and client boot runtime |
| `@kit/head` / `ajo-kit/head` | Head type, merge/render/apply |
| `@kit/validate` / `ajo-kit/validate` | Valibot helpers and `parse()` |
| `@kit/database` / `ajo-kit/database` | SQLite/Kysely helpers and types |
| `@kit/mail` / `ajo-kit/mail` | Mail transport configure/send |
| `ajo-kit/vite` | Vite plugin, JSX config, defaults |
| `ajo-kit/node` | Programmatic dev/build/start/listen |
| `@kit/auth` / `ajo-auth` | Auth setup, guards, middleware, and low-level namespaces |
