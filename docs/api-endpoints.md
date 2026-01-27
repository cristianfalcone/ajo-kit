# API Endpoints in ajo-kit

This document explains how API endpoints work in ajo-kit and how they differ from form actions.

## Overview

Every `handler.ts` file can export multiple types of handlers:

```ts
// handler.ts exports

export async function page(req, parent) { }    // Server data loading
export async function layout(req, parent) { }  // Layout data
export async function head(req, parent) { }    // SEO metadata
export const deps = ['table']                   // Cache dependencies

export async function action1(req, res) { }    // Form action (?/action1)
export async function action2(req, res) { }    // Form action (?/action2)

export default {                                // API endpoints
  get(req, res) { },                           // GET /route
  post(req, res) { },                          // POST /route
  put(req, res) { },                           // PUT /route
  delete(req, res) { }                         // DELETE /route
}
```

## Form Actions vs API Endpoints

| Aspect | Form Actions | API Endpoints |
|--------|-------------|---------------|
| **Export** | Named functions | `default { method() }` |
| **Route** | `POST /route?/name` | `METHOD /api/route` |
| **Usage** | SPA forms (`action('name')`) | External APIs, mobile |
| **CSRF** | ✅ Required | ❌ Skipped (if Bearer token) |
| **Return** | `{ redirect?, ...data }` | Uses `send(res, status, data)` |

**Important:** API endpoints automatically get `/api/` prefix. A handler at `src/(public)/login/handler.ts` with `default export` creates routes at `/api/login`, not `/login`.

## API Endpoint Registration

**File:** `src/server.tsx` (lines 326-340)

```ts
const { default: routes, page, layout, head, deps, ...actions } = exports

if (routes) {
  for (const method of Object.keys(routes) as HttpMethod[]) {
    app[method](toPattern(segments), json(), ...collect(segments), routes[method])
  }
}
```

**Process:**
1. Scan all `handler.ts` files
2. Extract `default` export as API routes
3. Register each HTTP method with Polka
4. Apply JSON parsing + middleware chain
5. Route to handler function

## Route Patterns

### File to URL Mapping

| File | Handler Export | URL | Type |
|------|---------------|-----|------|
| `(public)/login/handler.ts` | `page.tsx` exists | `/login` | Web page |
| `(public)/login/handler.ts` | Named function | `/login?/authenticate` | Form action |
| `(public)/login/handler.ts` | `default { post }` | `/api/login` | API endpoint |
| `(app)/posts/[id]/handler.ts` | `default { get, put, delete }` | `/api/posts/:id` | API endpoint |
| `docs/[...]/handler.ts` | `page.tsx` exists | `/docs/*` | Web page |

**Rules:**
- Groups `(name)` are removed from URLs
- `[param]` becomes `:param`
- `[...]` becomes `*` (catch-all)
- **API endpoints (`default export`) automatically get `/api/` prefix**

## Middleware Inheritance

API endpoints inherit **all middlewares** from ancestor `wares.ts` files, **including the wares.ts at the same level as the handler.ts**.

### How Middleware Collection Works

**File:** `src/server.tsx` (line 307)
```ts
const collect = (segments: string[]): Middleware[] =>
  ancestors(segments).flatMap(path => wares.get(path) ?? [])
```

**File:** `src/constants.ts` (line 73)
```ts
export const ancestors = (segments: string[]) =>
  segments.map((_, i) => segments.slice(0, i + 1).join('/'))
```

### Example: Middleware Chain for `/admin/users`

```
src/
  wares.ts                      → Root middleware (key: '')
  (app)/
    wares.ts                    → App group middleware
    admin/
      wares.ts                  → Admin section middleware
      users/
        wares.ts                → Route-level middleware ← SAME LEVEL!
        handler.ts              → Handler
```

**For** `src/(app)/admin/users/handler.ts`:
- File path: `/src/(app)/admin/users/handler.ts`
- Segments: `['', '(app)', 'admin', 'users']` ← Note: starts with `''`
- Ancestors: `['', '/(app)', '/(app)/admin', '/(app)/admin/users']`
- Middleware lookup keys:
  - `''` → `src/wares.ts` (root)
  - `'/(app)'` → `src/(app)/wares.ts` (group)
  - `'/(app)/admin'` → `src/(app)/admin/wares.ts` (section)
  - `'/(app)/admin/users'` → `src/(app)/admin/users/wares.ts` (route-level)

**Execution order:** Root → Group → Section → Route-level → Handler

**Important:** The root segment `''` (empty string) is ALWAYS the first segment, so `src/wares.ts` is ALWAYS applied to all routes.

## Authentication

### Dual System (Cookie + Bearer Token)

**Middleware:** `src/wares.ts` (lines 28-98)

```ts
async function session(req, res, next) {
  // 1. Try cookie session (SPA/Web)
  const cookie = read(req)
  if (cookie) {
    const session = await validate(cookie)
    if (session) {
      req.user = await loadUser(session.user)
      return next()
    }
  }

  // 2. Try Bearer token (API/Mobile)
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    const token = await validateToken(auth.slice(7))
    if (token) {
      req.user = await loadUser(token.user)
      req.token = { abilities: token.abilities }
    }
  }

  next()
}
```

### Request Extensions

```ts
declare module 'polka' {
  interface Request {
    user?: User                      // Populated by session middleware
    token?: { abilities: string[] }  // Bearer token metadata
  }
}
```

**User object:**
```ts
interface User {
  id: number
  name: string
  email: string
  roles: Role[]  // ['user'] or ['admin']
}
```

## CSRF Protection

**Middleware:** `src/wares.ts` (lines 100-113)

```ts
function csrf(req, _, next) {
  // Skip for Bearer tokens
  if (req.token) return next()

  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  if (!verifyCsrf(req)) {
    throw new ForbiddenError('Invalid CSRF token')
  }

  next()
}
```

**Why Bearer tokens skip CSRF:**
- Authorization headers cannot be sent cross-origin by browsers
- Cookies are sent automatically (vulnerable to CSRF)
- Bearer tokens require explicit code (not vulnerable)

## Guards

Seven authorization guards available from `src/auth/guard.ts`:

```ts
import { auth, role, ability, protect, guest, confirmed, verified } from '/src/auth/guard'

// Use in wares.ts files:

// 1. Require authentication
export default [auth()]

// 2. Require specific role
export default [role('admin')]

// 3. Require token ability (only for Bearer tokens)
export default [ability('posts:create')]

// 4. Require password confirmation (3min window)
export default [confirmed()]

// 5. Require email verification
export default [verified()]

// 6. Redirect if authenticated (for login page)
export default [guest('/dashboard')]

// 7. Redirect if not authenticated
export default [protect('/login')]
```

### Example: Protected Admin Section

```ts
// src/(app)/admin/wares.ts
import { role } from '/src/auth/guard'

export default [role('admin')]
```

All routes under `src/(app)/admin/*` will require admin role.

## Token Abilities

**File:** `src/auth/token.ts`

```ts
// Create token with abilities
const token = await create(
  userId,
  'Mobile App',
  ['posts:read', 'posts:create', 'users:update'],
  90 * 24 * 60 * 60 * 1000  // 90 days expiry (optional)
)

// Wildcard matching
'*'           // All abilities
'posts:*'     // All post operations
'posts:read'  // Only read posts

// Check ability
can(['posts:*'], 'posts:create')  // true
can(['posts:read'], 'posts:create')  // false
```

## Example: Login Endpoint

```ts
// src/(public)/login/handler.ts

import type { Request, Response } from 'polka'
import send from '@polka/send'
import { verify } from '/src/auth/password'
import { create } from '/src/auth/token'
import { db, parse, email } from '/src/data'
import { object, string } from 'valibot'
import { UnauthorizedError } from '/src/constants'

const Login = object({
  email,
  password: string(),
})

// API endpoint for mobile/external clients
export default {
  async post(req: Request, res: Response) {

    const input = parse(Login, req.body)

    const user = await db()
      .selectFrom('users')
      .select(['id', 'name', 'email', 'password'])
      .where('email', '=', input.email)
      .executeTakeFirst()

    if (!user?.password || !await verify(input.password, user.password)) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Create stateless token
    const token = await create(user.id, 'Mobile App', ['*'])

    send(res, 200, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    })
  }
}
```

**Usage from mobile:**

```ts
const response = await fetch('https://example.com/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})

const { token, user } = await response.json()

// Use in subsequent requests
fetch('https://example.com/api/posts', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## Example: CRUD API

```ts
// src/(app)/posts/handler.ts

import type { Request, Response } from 'polka'
import send from '@polka/send'
import { db } from '/src/data'

// Data loading for web page
export const deps = ['posts', ':user']

export async function page(req: Request) {
  const posts = await db()
    .selectFrom('posts')
    .select(['id', 'title', 'content'])
    .where('user', '=', req.user!.id)
    .execute()

  return { posts }
}

// API endpoints for mobile
export default {

  // GET /api/posts
  async get(req: Request, res: Response) {
    const posts = await db()
      .selectFrom('posts')
      .select(['id', 'title', 'content', 'created'])
      .where('user', '=', req.user!.id)
      .execute()

    send(res, 200, { posts })
  },

  // POST /api/posts
  async post(req: Request, res: Response) {
    const { id } = await db()
      .insertInto('posts')
      .values({
        user: req.user!.id,
        title: req.body.title,
        content: req.body.content,
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    send(res, 201, { id })
  },

  // PUT /api/posts
  async put(req: Request, res: Response) {
    await db()
      .updateTable('posts')
      .set({
        title: req.body.title,
        content: req.body.content,
      })
      .where('id', '=', req.body.id)
      .where('user', '=', req.user!.id)
      .execute()

    send(res, 200, { success: true })
  },

  // DELETE /api/posts
  async delete(req: Request, res: Response) {
    await db()
      .deleteFrom('posts')
      .where('id', '=', req.body.id)
      .where('user', '=', req.user!.id)
      .execute()

    send(res, 200, { success: true })
  }
}
```

## Error Handling

Use error classes from `src/constants.ts`:

```ts
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  InvalidError
} from '/src/constants'

// Generic HTTP error
throw new AppError(429, 'Rate limit exceeded')

// Specific errors
throw new NotFoundError('Post not found')
throw new UnauthorizedError('Invalid credentials')
throw new ForbiddenError('Insufficient permissions')

// Validation errors with field-level messages
throw new InvalidError(
  { email: ['Invalid format'] },
  'Validation failed'
)
```

**Error response format:**
```json
{
  "error": {
    "status": 400,
    "message": "Validation failed",
    "fields": {
      "email": ["Invalid format"]
    }
  }
}
```

## Response Helpers

```ts
import send from '@polka/send'

// JSON response
send(res, 200, { data: 'value' })

// Error response
send(res, 404, { error: 'Not found' })

// Created resource
send(res, 201, { id: 123 })

// No content
send(res, 204)
```

## Complete Request Flow

```
Mobile Client
     │
     │ POST /api/posts
     │ Authorization: Bearer <token>
     │ Content-Type: application/json
     │
     ├────────────────────────────────>  Polka Router
     │                                        │
     │                                   json() middleware
     │                                        │
     │                                   Root wares (src/wares.ts)
     │                                        │
     │                                   ├─ timing: log request
     │                                   ├─ session: validate Bearer token
     │                                   │  → sets req.user + req.token
     │                                   ├─ csrf: skip (Bearer token)
     │                                        │
     │                                   Group wares (src/(app)/wares.ts)
     │                                        │
     │                                   ├─ protect(): check req.user
     │                                        │
     │                                   Route wares (src/(app)/posts/wares.ts)
     │                                        │
     │                                   ├─ [custom middleware if exists]
     │                                        │
     │                                   Handler default.post(req, res)
     │                                        │
     │                                   ├─ parse request body
     │                                   ├─ database operations
     │                                   ├─ send(res, 201, { id })
     │                                        │
     │  { id: 123 }
     │<────────────────────────────────
```

## Best Practices

1. **Validation:** Always use Valibot schemas with `parse()`
2. **Authorization:** Apply guards in `wares.ts` files, not in handlers
3. **Rate limiting:** Use `check()`, `hit()`, `clear()` from `src/auth/limit.ts`
4. **Token abilities:** Use granular permissions like `posts:read` instead of `*`
5. **Error handling:** Throw typed errors (`UnauthorizedError`, etc.)
6. **Response format:** Use consistent JSON structure across all endpoints
7. **SQL safety:** Always use `.select(['fields'])`, never `.selectAll()`
8. **Secrets:** Never leak sensitive data in API responses
9. **Middleware order:** Root → Group → Section → Route-level
10. **Same-level wares:** Remember that `wares.ts` at the same level as `handler.ts` also applies

## Form Actions (Complementary Pattern)

Form actions are the **preferred pattern** in ajo-kit for SPA interactions:

```ts
// handler.ts
export async function authenticate(req: Request, res: Response) {
  // ... validation
  write(res, sessionToken)
  return { redirect: '/dashboard' }
}

// Client
const form = action<Result>('authenticate')
<form onsubmit={form.handle}>
  {/* Submits to ?/authenticate */}
</form>
```

### When to Use Each Pattern

**Use form actions when:**
- Building SPA features with server-side validation
- Need CSRF protection automatically
- Want framework-managed loading states
- Client and server are same-origin

**Use API endpoints when:**
- Building mobile apps
- Supporting third-party integrations
- Need stateless authentication (Bearer tokens)
- Client is different origin
- Building RESTful APIs
