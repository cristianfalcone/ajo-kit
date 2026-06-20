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
import { configure } from '@kit/auth'
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
import { wares } from '@kit/auth'

export default [wares.session(), wares.csrf]
```

`session()` resolves `req.user` from cookies, and from bearer tokens only on `/api/*` routes. On API requests, an explicit Bearer token takes precedence over session cookies.
`csrf` validates unsafe cookie-auth requests, including `/api/*`. It skips safe methods, bearer-token requests, and unauthenticated API requests.

### 4. Set secret for verification links

```env
APP_SECRET=<32+ random characters from your secret manager>
```

Development can run without this value. Production fails closed when
`APP_SECRET` is missing, too short, or left as a sample placeholder.

## Main Exports

Import namespaces from `@kit/auth`:

### `password`

```ts
import { password } from '@kit/auth'
```

Argon2id hash/verify helpers.

### `session`

```ts
import { session } from '@kit/auth'

const id = await session.create(user, remember, ip, agent)
const active = await session.validate(id)
await session.touch(id)
await session.remove(id)
await session.prune()
```

`create()` returns the plaintext cookie value. The database stores only a
SHA-256 hash of that value in `sessions.id`. Session lifetime is a 30-day
absolute expiry by default or 365 days with `remember = true`. `validate()`
also enforces a 30-minute idle timeout, deletes expired session rows, and
updates `last` at most once every 5 minutes. Pass `activity = false` for
background checks such as SSE freshness. `prune()` removes expired rows that are
no longer presented by a browser cookie.

### `cookie`

```ts
import { cookie } from '@kit/auth'

const id = cookie.read(req)
cookie.write(res, id, remember)
cookie.clear(res)
```

Cookie name is `session`, with `HttpOnly; SameSite=Lax; Path=/` and `Secure`
in production.

### `csrf`

```ts
import { csrf } from '@kit/auth'

const token = csrf.set(req, res)
const ok = csrf.verify(req)
```

Verification accepts:

- signed double-submit bound to the current session
  (`XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header)
- same-origin check (`Origin`/`Referer` host matches request host)

### `wares`

```ts
import { wares } from '@kit/auth'
```

`session(lookup?)` accepts an optional custom user resolver. Bearer token auth is scoped to `/api/*`; route actions use cookie sessions and CSRF.

### Guards

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
import { token } from '@kit/auth'

const plain = await token.create(user, 'My token', ['posts:*'])
const valid = await token.validate(plain)
const canWrite = token.can(valid?.abilities ?? [], 'posts:write')
await token.revoke(plain)
await token.purge(user)
const all = await token.list(user)
await token.prune()
```

Abilities support `*`, exact matches, and resource wildcards like `posts:*`.

### `limit`

```ts
import { limit } from '@kit/auth'

if (!limit.check(ip)) throw new Error('Too many attempts')
limit.hit(ip, 60_000)
limit.remaining(ip)
limit.clear(ip)
```

In-memory limiter (per-process, non-distributed).

### `confirm`

```ts
import { confirm } from '@kit/auth'

confirm.stamp(req)
confirm.check(req, 180_000)
confirm.clear(req)
confirm.clearSession(user, sessionId)
confirm.clearToken(user, tokenId)
confirm.clearUser(user)
```

Tracks recent password confirmation in memory, scoped to the current session or
bearer token credential.

### `reset`

```ts
import { reset } from '@kit/auth'

const plain = await reset.create(user)
const user = await reset.validate(plain)
await reset.prune()
```

Reset tokens are SHA-256 hashed in DB and expire in 1 hour.

### `verify`

```ts
import { verify } from '@kit/auth'

const link = verify.url(user, 'https://example.com')
const verifiedUser = verify.validate(signature)
```

HMAC-SHA256 signed token, default expiry 24 hours. Production requires a strong
`APP_SECRET`.

## Types

```ts
import type { User, New, Session, Token, Role, Auth } from '@kit/auth'
```
