# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Dev server with HMR (tsx watch + Vite)
pnpm build        # Production build (client + server)
pnpm prod         # Run production server
pnpm db           # Database CLI
pnpm db seed      # Seed with sample data
pnpm db auth      # OAuth flow for Google Drive
pnpm db sync      # Sync database to Drive (--watch for continuous)
pnpm db pull      # Download database from Drive
```

## Code Principles

**This repo has no users yet.** Refactor freely without backwards compatibility concerns.

**Naming:** Single meaningful words for identifiers—not abbreviations, not single letters. Complete words that describe intent (e.g., `defer`, `parent`, `protect`, `guard`, `embed`, `pack`).

**Style:** DRY, simple, clever, performant, elegant. Research patterns from SvelteKit for inspiration.

## Documentation

- **Ajo-kit patterns:** [docs/LLMs.md](docs/LLMs.md)
- **Ajo UI syntax:** `node_modules/ajo/LLMs.md`

## Architecture

Full-stack metaframework for Ajo (micro UI library with JSX + generators). Inspired by SvelteKit.

**Core files:**
- [app.tsx](src/app.tsx) — Router, page resolution, `action()` helper, HMR
- [server.tsx](src/server.tsx) — SSR, data pipeline, form actions, middleware registration
- [client.tsx](src/client.tsx) — Hydration entry point

**Server-only enforcement:** Vite plugin blocks `handler.ts`, `wares.ts`, `src/data/*`, `src/auth/*` from client bundle.

## Data Loading Pipeline

### Execution Flow

```
SSR (first load):
  1. Server runs handler.ts layout()/page() → server-only data
  2. Server runs page.tsx/layout.tsx handler() → shared data
  3. Merge: { ...serverData, ...clientData }
  4. Inject as globalThis.__SSR__
  5. Hydrate without re-fetch

CSR (navigation):
  1. Client fetches JSON from same URL (Accept: application/json)
  2. Server returns { data: [...], head: {...} }
  3. Client runs local handler() functions
  4. Merge server + client data
  5. Render with new state
```

### Parallel Execution

Layout and page handlers execute **concurrently** via `Promise.all`:

```typescript
const [layoutResults, pageResult] = await Promise.all([
  Promise.all(layoutTasks),  // All layout handlers in parallel
  pageTask                   // Page handler simultaneously
])
```

### Handler Types

| Location | Export | Runs On | Use For |
|----------|--------|---------|---------|
| `page.tsx` | `handler()` | Server + Client | External APIs, public data |
| `handler.ts` | `page()` | Server only | Database, secrets, heavy computation |
| `handler.ts` | `layout()` | Server only | Shared layout data |
| `handler.ts` | `head()` | Server only | Dynamic SEO tags |
| `page.tsx` | `head()` | Server + Client | Static/computed SEO tags |
| `handler.ts` | Named exports | Server only | Form actions |

### Data Merge Order

```typescript
// Server-side merge (server.tsx)
const entry = { ...server, ...client }  // handler.ts + page.tsx

// Client-side merge (app.tsx)
const merged = { ...server.data[depth], ...result.data }  // server JSON + local handler
```

Client/local data always wins over server data for same keys.

## Parent Chain

`parent()` is a promise-based function for accessing ancestor data:

```typescript
// links() creates a chain of deferred promises
export function links(count: number): Link[] {
  const chain: Link[] = []
  for (let depth = 0; depth < count; depth++) {
    const current = deferred<Entry>()
    const parent = depth === 0
      ? async () => ({})
      : async () => {
          const ancestors = await Promise.all(
            chain.slice(0, depth).map(link => link.deferred.promise)
          )
          return ancestors.reduce((acc, entry) => ({ ...acc, ...entry }), {})
        }
    chain.push({ parent, deferred: current })
  }
  return chain
}
```

**Flow:**
1. Each handler receives a `parent()` function
2. Calling `parent()` waits for ALL ancestor handlers to complete
3. Returns merged object of all ancestor data
4. Handler resolves its own deferred when complete
5. Child handlers can then proceed

**Example:**
```
Root layout: deferred[0].resolve({ userId: 1 })
App layout:  await parent() → { userId: 1 }
             deferred[1].resolve({ userId: 1, org: 'acme' })
Page:        await parent() → { userId: 1, org: 'acme' }
```

**Parallel fetch pattern:**
```typescript
export async function handler({ parent }: Context) {
  const [data, ancestors] = await Promise.all([
    fetchMyData(),
    parent()  // Don't block on parent if you don't need it yet
  ])
  return { ...data, ancestorId: ancestors.id }
}
```

## Defer & Loading

Only ONE component shows loading spinner, determined by `defer` export:

```typescript
// compose() in app.tsx
const deferred = page.defer ? 'page' : tree.findLast(entry => entry.module.defer)?.path
```

- Page's `defer: true` → page handles loading
- Layout's `defer: true` → that layout handles loading (innermost wins)
- No `defer` anywhere → root layout handles loading

**Without defer:** Component receives `loading: false`, root layout shows spinner
**With defer:** Component receives `loading: true` during fetch, handles own skeleton

## Head Management

### Merge Strategy

```typescript
export function merge(...heads: Head[]): Head {
  // Simple props: last wins
  if (head.title) result.title = head.title

  // Meta: dedupe by name/property, last wins
  for (const entry of head.meta ?? []) {
    const id = 'name' in entry ? entry.name : entry.property
    // Replace existing or append
  }

  // Links: dedupe by rel, last wins
  for (const entry of head.link ?? []) {
    // Replace existing or append
  }
}
```

### SSR vs CSR

**SSR:** `render()` generates HTML string, injected into template
**CSR:** `apply()` diffs DOM, updates only changed attributes

```typescript
// app.tsx - after navigation
if (state.data?.head) apply(state.data.head)
```

### Export Locations

```typescript
// layout.tsx or page.tsx - runs on both server and client
export async function head({ url, params, parent }: Context): Promise<Head> {
  return { title: 'Page Title' }
}

// handler.ts - runs on server only
export async function head(req: Request, parent: Parent): Promise<Head> {
  const data = await parent()
  return { title: `${data.userName}'s Profile` }
}
```

## Authentication

### Architecture

- **Password:** Argon2id (OWASP recommended, GPU-resistant)
- **Sessions:** 32-byte random tokens, 30-day expiry
- **Cookies:** HttpOnly, SameSite=Lax, Path=/

### Auth Modules

| File | Exports |
|------|---------|
| [password.ts](src/auth/password.ts) | `hash(plain)`, `verify(plain, hashed)` |
| [session.ts](src/auth/session.ts) | `create(userId)`, `validate(token)`, `remove(token)`, `generate()` |
| [cookie.ts](src/auth/cookie.ts) | `read(req)`, `write(res, token)`, `clear(res)` |
| [guard.ts](src/auth/guard.ts) | `auth()`, `role(...roles)`, `protect(to?)`, `guest(to?)`, `when()`, `redirect()` |

### Session Flow

```typescript
// wares.ts - session middleware
const token = read(req)
const session = await validate(token)
const user = await users.find(session.userId)
const userRoles = await roles.forUser(user.id)
req.user = { id, username, email, roles: userRoles }
```

### Guard Middleware

```typescript
// Redirect if not authenticated
protect(to = '/login')

// Redirect if authenticated (for login/register pages)
guest(to = '/dashboard')

// Require authentication (throws UnauthorizedError)
auth()

// Require specific roles (throws ForbiddenError)
role('admin', 'moderator')

// Conditional middleware
when(req => req.path === '/', redirect('/dashboard'))
```

### JSON vs HTML Redirects

Guards handle both response types:
```typescript
if (req.headers.accept?.includes('application/json')) {
  send(res, 200, pack({ redirect: target }))  // Client handles navigation
} else {
  send(res, 302, null, { Location: target })  // Browser redirect
}
```

## Database

### Stack

- **SQLite** with WAL (Write-Ahead Logging)
- **Kysely** for type-safe queries
- **better-sqlite3** for sync API

### Schema ([types.ts](src/data/types.ts))

```typescript
interface DB {
  users: UsersTable      // id, username, firstName, lastName, email, password, verified, created
  sessions: SessionsTable // id, userId, expiry, created
  roles: RolesTable      // id, name
  members: MembersTable  // userId, roleId (many-to-many)
}
```

### Data Access ([auth.ts](src/data/auth.ts))

```typescript
users.find(id)
users.byEmail(email)
users.create(data)

sessions.create({ id, userId, expiry })
sessions.find(id)
sessions.remove(id)

roles.forUser(userId)  // Returns Role[]
roles.assign(userId, roleId)
```

### Google Drive Sync

WAL-based incremental backup:

1. **Snapshot:** Full database backup on rotation (default: 6 hours)
2. **Changes:** WAL file uploaded on each write (debounced: 1s)
3. **Rotation:** Checkpoints WAL into main DB, uploads snapshot, clears remote WAL files

```bash
pnpm db sync --watch  # Continuous sync
pnpm db pull          # Restore from Drive
```

## Validation

### Valibot Schemas

```typescript
// data/fields.ts - Reusable field validators
export const email = pipe(string(), trim(), toLowerCase(), vemail('Invalid email'))
export const password = pipe(string(), minLength(8, 'Password must be at least 8 characters'))

// handler.ts - Schema composition
const Login = object({ email, password: string() })
```

### Parse with Error Handling

```typescript
// data/index.ts
export function parse<T>(schema: T, data: unknown): InferOutput<T> {
  const result = safeParse(schema, data)
  if (result.success) return result.output

  const flat = flatten(result.issues)
  const fields = { ...flat.nested }
  if (flat.root?.length) fields._form = flat.root

  throw new InvalidError(fields, firstMessage)
}
```

### Error Response Format

```json
{
  "status": 400,
  "message": "Validation failed",
  "fields": {
    "email": ["Invalid email"],
    "password": ["Password must be at least 8 characters"],
    "_form": ["Email already registered"]
  }
}
```

## Form Actions

### Client-Side (`action()` helper)

```typescript
const form = action<ResultType>('actionName')

// State:
form.loading   // boolean
form.data      // ResultType | undefined
form.error     // string | undefined
form.fields    // Record<string, string[]> | undefined (validation errors)
form.handle    // (event: SubmitEvent) => void
form.reset     // () => void
```

### Server-Side (handler.ts)

```typescript
// Named export becomes ?/actionName endpoint
export async function subscribe(req: Request, res: Response) {
  const input = parse(Schema, req.body)
  await db.subscribers.create(input)
  return { success: true }  // or { redirect: '/thanks' }
}
```

### Abort Handling

Actions use AbortController—new submissions abort pending ones:
```typescript
controller?.abort()
controller = new AbortController()
await fetch(`?/${name}`, { signal: controller.signal, ... })
```

## Middleware

### Root Middleware ([wares.ts](src/wares.ts))

```typescript
export default [
  timing,   // Adds x-response-time header
  session,  // Populates req.user from cookie
  when(req => req.path === '/', redirect(...)),
] satisfies Middleware[]
```

### Route-Specific

```typescript
// (app)/wares.ts - Protected routes
export default [protect()]

// (auth)/wares.ts - Guest-only routes
export default [guest()]
```

### Execution Order

1. Root wares first (from /src/wares.ts)
2. Then route-specific wares (ancestors → current)
3. Data handlers last

## Serialization ([serial.ts](src/serial.ts))

Uses `devalue` for safe serialization:

| Function | Use | Format |
|----------|-----|--------|
| `embed(value)` | SSR injection | JS code (`uneval`) |
| `pack(value)` | JSON responses | Compact string (`stringify`) |
| `unpack(string)` | Parse responses | Object (`parse`) |

All support `toJSON()` methods (e.g., `AppError.toJSON()`).

## Error Classes

```typescript
AppError(status, message)      // Base class with toJSON()
NotFoundError(message?)        // 404
UnauthorizedError(message?)    // 401
ForbiddenError(message?)       // 403
InvalidError(fields, message?) // 400 with validation fields
```

## Routing

### Pattern Compilation

```
/src/(app)/dashboard/page.tsx  → 'dashboard'
/src/blog/[id]/page.tsx        → 'blog/:id'
/src/docs/[...]/page.tsx       → 'docs/*'
```

Groups `(name)` are excluded from URLs but organize code.

### Navigation

```typescript
import { navigate } from '/src/constants'
navigate('/dashboard')  // Client-side navigation
```

## HMR

Symbol-based tracking for hot module replacement:

```typescript
// vite.config.ts hmr plugin
component[Symbol.for('ajo.hmr')] = '/src/path/page.tsx'
globalThis.__MODULES__.set(path, module)
globalThis.__HMR__?.(path)  // Triggers router.run()
```

Components preserve state across HMR updates.

## Anti-patterns

- Secrets in `page.tsx handler()` (may reach client bundle)
- Checking `args.loading` without `defer` export (always false)
- Forgetting `NotFoundError` for missing data
- Context outside loop in stateful layouts
- React patterns (`useState`, `className`, `onClick`)
- Forgetting to `await parent()` in handlers
