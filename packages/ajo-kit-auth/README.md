# ajo-kit-auth

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
pnpm add ajo-kit-auth
```

`ajo-kit-auth` requires `ajo-kit` as a peer dependency.

## Setup

### 1. Configure DB accessor

Call `configure()` once during app boot so auth modules can access your Kysely instance.

```ts
import { configure } from '@kit/auth'
import { db } from '/src/data'

configure(() => db())
```

### 2. Run migrations

`ajo-kit-auth` exposes `kit.migrations`, so with the package installed:

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

`session()` resolves `req.user` from cookies. Bearer tokens authenticate
`/api/*` routes, where an explicit Bearer token takes precedence over a session
cookie.

`csrf` validates unsafe cookie-auth requests, including `/api/*`. It skips safe
methods, bearer-token requests, and unauthenticated API requests.

### 4. Set secret for verification links

```env
APP_SECRET=<32+ random characters from your secret manager>
```

Development can run without this value. Production fails closed when
`APP_SECRET` is missing, too short, or left as a sample placeholder.

For non-local production, also configure `APP_URL` in the app environment so
same-origin checks and generated links use the trusted public origin.

## Main Exports

The package root exports the APIs below.

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
SHA-256 hash of that value in `sessions.id`.

Session lifetime is 30 days by default or 365 days with `remember = true`.
`validate()` enforces a 30-minute idle timeout, removes expired sessions, and
updates `last` at most once every 5 minutes.

Pass `activity = false` for background checks such as SSE freshness. `prune()`
removes expired rows.

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
import {
  ability,
  auth,
  authorize,
  confirmed,
  guest,
  guard,
  protect,
  redirect,
  verified,
  when,
} from '@kit/auth'
```

- `auth()` requires an authenticated user.
- `authorize(req, ...abilities)` checks account and bearer-token abilities.
- `ability(...abilities)` requires account abilities; bearer requests must
  also carry them on the token.
- `protect('/login')` redirects guests.
- `guest('/dashboard')` redirects authenticated users.
- `confirmed(window?)` requires recent password confirmation.
- `verified()` requires a `users.verified` timestamp.
- `when(condition, middleware, otherwise?)` selects middleware by request.
- `redirect(target)` returns an AJAX-aware redirect middleware.

The same guard functions are available through the `guard` namespace.

### `token`

```ts
import { can, token } from '@kit/auth'

const plain = await token.create(user, 'My token', ['posts:*'])
const valid = await token.validate(plain)
const canWrite = can(valid?.abilities ?? [], 'posts:write')
await token.revoke(plain)
await token.purge(user)
const all = await token.list(user)
await token.prune()
```

Abilities support `*`, exact matches, and resource wildcards like `posts:*`.
`token.create()` requires explicit abilities; app routes should bound requested
abilities by the authenticated account and bearer token before creating one.

Browser code imports ability helpers from the client-safe subpath:

```ts
import { all, can, compact, intersect, merge } from '@kit/auth/ability'
```

### `account`

```ts
import { account } from '@kit/auth'

const grants = await account.grants(user)
const abilities = await account.abilities(user)
```

`account.grants(user)` loads assigned role grants. `account.abilities(user)`
merges them and removes duplicate or redundant wildcard grants. Authorize with
abilities through `ability()` or `authorize()`.

### `limit`

```ts
import { limit } from '@kit/auth'

if (!limit.check(ip)) throw new Error('Too many attempts')
limit.hit(ip, 60_000)
limit.remaining(ip)
limit.clear(ip)
```

The limiter stores counters in process memory. Multi-process deployments
require a shared limiter.

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
import type { Ability, Auth, New, Role, Session, Token, User } from '@kit/auth'
```
