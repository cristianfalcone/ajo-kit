# ajo-auth

Authentication and authorization for ajo-kit apps. Session-based auth with cookie management, CSRF protection, API tokens, rate limiting, password reset, and email verification.

## Install

```bash
pnpm add ajo-auth argon2
```

> `ajo-kit` and `kysely` are peer dependencies — your app must install them.

## Setup

Configure the database accessor in your root middleware (`wares.ts`):

```ts
import { configure } from '@kit/auth/store'
import { db } from '/src/data'

configure(() => db())
```

### Required Tables

Auth expects these tables (create via Kysely migrations):

```sql
CREATE TABLE users (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE,
  password  TEXT,
  verified  TEXT,
  created   TEXT NOT NULL DEFAULT (datetime('now')),
  updated   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id      TEXT PRIMARY KEY,
  user    INTEGER NOT NULL REFERENCES users(id),
  expiry  TEXT NOT NULL,
  ip      TEXT,
  agent   TEXT,
  last    TEXT,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tokens (
  id        TEXT PRIMARY KEY,
  user      INTEGER NOT NULL REFERENCES users(id),
  name      TEXT NOT NULL,
  abilities TEXT NOT NULL DEFAULT '["*"]',
  last      TEXT,
  expiry    TEXT,
  created   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE resets (
  id      TEXT PRIMARY KEY,
  user    INTEGER NOT NULL REFERENCES users(id),
  expiry  TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE roles (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE members (
  user INTEGER NOT NULL REFERENCES users(id),
  role INTEGER NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user, role)
);
```

### Environment

```env
APP_SECRET=your-secret-key  # Required for signed URLs (email verification)
```

## Modules

Import individual modules via `@kit/auth/*`:

### password — Argon2id hashing

```ts
import { hash, verify } from '@kit/auth/password'

const hashed = await hash('plaintext')
const valid = await verify('plaintext', hashed)
```

### session — Session management

```ts
import * as session from '@kit/auth/session'

const id = await session.create(userId, remember, ip, agent)
const sess = await session.validate(id)    // { id, user, expiry } | null
await session.touch(id)                    // update last activity
await session.remove(id)
```

Sessions last 30 days, or 365 days with `remember = true`.

### cookie — HttpOnly session cookie

```ts
import * as cookie from '@kit/auth/cookie'

const id = cookie.read(req)                // read session ID from cookie
cookie.write(res, sessionId, remember)     // set cookie
cookie.clear(res)                          // delete cookie
```

### csrf — CSRF protection

```ts
import * as csrf from '@kit/auth/csrf'

const token = csrf.set(res)                // set XSRF-TOKEN cookie
const valid = csrf.verify(req)             // check double-submit or same-origin
```

Verifies via double-submit cookie (`X-XSRF-TOKEN` header matches cookie) or same-origin check (Origin/Referer matches Host).

### guard — Route middleware

```ts
import { protect, guest, auth, role, ability, confirmed, verified, redirect, when } from '@kit/auth'

// Redirect unauthenticated users to login
protect('/login')

// Redirect authenticated users away (e.g., login page)
guest('/dashboard')

// Throw 401/403 (for API routes)
auth()
role('admin', 'editor')
ability('posts:write', 'posts:delete')

// Require password confirmation (3 min window)
confirmed()

// Require verified email
verified()

// Conditional middleware
when(req => req.user?.admin, adminMiddleware, fallback)

// AJAX-aware redirect (JSON response for fetch, 302 for browser)
redirect('/login')
```

### token — API tokens (Bearer auth)

```ts
import * as token from '@kit/auth/token'

const plain = await token.create(userId, 'My Token', ['posts:*'], expiresMs)
const data = await token.validate(plain)   // { id, user, abilities } | null
token.can(abilities, 'posts:write')        // check ability
await token.revoke(plain)
await token.revokeAll(userId)
const all = await token.list(userId)
```

Abilities support wildcards: `*` (all), `posts:*` (all post operations), `posts:write` (specific).

### limit — In-memory rate limiting

```ts
import * as limit from '@kit/auth/limit'

if (!limit.check(ip)) throw new AppError(429, 'Too many attempts')
limit.hit(ip, 60_000)                     // 1 min window
limit.remaining(ip)                        // attempts left (default max: 5)
limit.clear(ip)                            // reset on success
```

### confirm — Password confirmation stamps

```ts
import * as confirm from '@kit/auth/confirm'

confirm.stamp(userId)                      // after password verification
confirm.check(userId, 180_000)             // valid for 3 min (default)
confirm.clear(userId)
```

### reset — Password reset tokens

```ts
import * as reset from '@kit/auth/reset'

const plain = await reset.create(userId)   // hashed in DB, expires 1hr
const userId = await reset.validate(plain)
const userId = await reset.consume(plain)  // validate + delete
await reset.prune()                        // clean expired
```

### verify — Email verification (signed URLs)

```ts
import * as verify from '@kit/auth/verify'

const link = verify.url(userId, 'https://example.com')  // /verify/:signature
const userId = verify.validate(signature)                // number | null
```

Uses HMAC-SHA256 signed URLs. Expires in 24 hours. Requires `APP_SECRET` env var.
