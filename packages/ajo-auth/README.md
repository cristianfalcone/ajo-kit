# ajo-auth

Authentication and authorization for `ajo-kit` apps.

Includes:

- session auth (cookie)
- bearer tokens with abilities
- CSRF middleware
- route guards
- in-memory rate limiting
- password reset tokens
- email verification signatures

## Install

```bash
pnpm add ajo-auth
```

`ajo-kit` is a peer dependency.

## Setup

### 1. Configure DB accessor

Call `configure()` once during app boot so auth modules can access your Kysely instance.

```ts
import { configure } from '@kit/auth/store'
import { db } from '/src/data'

configure(() => db())
```

### 2. Run migrations

`ajo-auth` exposes `kit.migrations`, so with the package installed:

```bash
kit migrate up
```

This creates auth tables (`users`, `sessions`, `roles`, `members`, `tokens`, `resets`).

### 3. Register auth middlewares

```ts
// src/wares.ts
import { session, csrf } from '@kit/auth/wares'

export default [session(), csrf]
```

`session()` resolves `req.user` from cookies, and from bearer tokens only on `/api/*` routes. On API requests, an explicit Bearer token takes precedence over session cookies.
`csrf` validates unsafe cookie-auth requests, including `/api/*`. It skips safe methods, bearer-token requests, and unauthenticated API requests.

### 4. Set secret for verification links

```env
APP_SECRET=your-secret-key
```

If missing, verification falls back to `change-in-production` (not safe for production).

## Main Exports

You can import from `@kit/auth/*`:

### `password`

```ts
import { hash, verify } from '@kit/auth/password'
```

Argon2id hash/verify helpers.

### `session`

```ts
import * as session from '@kit/auth/session'

const id = await session.create(userId, remember, ip, agent)
const active = await session.validate(id)
await session.touch(id)
await session.remove(id)
```

Session lifetime: 30 days (default) or 365 days (`remember = true`).

### `cookie`

```ts
import * as cookie from '@kit/auth/cookie'

const id = cookie.read(req)
cookie.write(res, id, remember)
cookie.clear(res)
```

Cookie name is `session`, with `HttpOnly; SameSite=Lax; Path=/`.

### `csrf`

```ts
import * as csrf from '@kit/auth/csrf'

const token = csrf.set(res)
const ok = csrf.verify(req)
```

Verification accepts:

- double-submit (`XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header)
- same-origin check (`Origin`/`Referer` host matches request host)

### `wares`

```ts
import { session, csrf } from '@kit/auth/wares'
```

`session(lookup?)` accepts an optional custom user resolver. Bearer token auth is scoped to `/api/*`; route actions use cookie sessions and CSRF.

### Guards (`@kit/auth` or `@kit/auth/guard`)

```ts
import { auth, role, ability, protect, guest, confirmed, verified, redirect, when } from '@kit/auth'
```

- `auth()` -> requires authenticated user
- `role(...names)` -> requires any matching role
- `ability(...abilities)` -> checks token abilities (when bearer token is present)
- `protect('/login')` -> redirect guests
- `guest('/dashboard')` -> redirect authenticated users
- `confirmed(window?)` -> requires recent password confirmation
- `verified()` -> requires `users.verified` timestamp
- `when(condition, middleware, otherwise?)`
- `redirect(target)` -> AJAX-aware redirect helper

### `token`

```ts
import * as token from '@kit/auth/token'

const plain = await token.create(userId, 'My token', ['posts:*'])
const valid = await token.validate(plain)
const canWrite = token.can(valid?.abilities ?? [], 'posts:write')
await token.revoke(plain)
await token.revokeAll(userId)
const all = await token.list(userId)
await token.prune()
```

Abilities support `*`, exact matches, and resource wildcards like `posts:*`.

### `limit`

```ts
import * as limit from '@kit/auth/limit'

if (!limit.check(ip)) throw new Error('Too many attempts')
limit.hit(ip, 60_000)
limit.remaining(ip)
limit.clear(ip)
```

In-memory limiter (per-process, non-distributed).

### `confirm`

```ts
import * as confirm from '@kit/auth/confirm'

confirm.stamp(userId)
confirm.check(userId, 180_000)
confirm.clear(userId)
```

Tracks recent password confirmation in memory.

### `reset`

```ts
import * as reset from '@kit/auth/reset'

const plain = await reset.create(userId)
const user = await reset.validate(plain)
const consumed = await reset.consume(plain)
await reset.prune()
```

Reset tokens are SHA-256 hashed in DB and expire in 1 hour.

### `verify`

```ts
import * as verify from '@kit/auth/verify'

const link = verify.url(userId, 'https://example.com')
const verifiedUser = verify.validate(signature)
```

HMAC-SHA256 signed token, default expiry 24 hours.

## Types

```ts
import type { User, NewUser, Session, Token, Role, AuthDB } from '@kit/auth'
```
