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
- single-use account invitations

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

This creates the auth, passkey, team, and invitation tables.

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

HTTPS deployments use `__Host-session` with
`HttpOnly; SameSite=Lax; Path=/; Secure`; the `__Host-` prefix prevents sibling
subdomains from shadowing the host-only session. Local HTTP development uses
the unprefixed `session` name because browsers require `Secure` on `__Host-`
cookies.

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
- `admit(req, subject, ...abilities)` checks account abilities plus the
  team-scoped abilities for one subject; bearer tokens must still carry the
  abilities themselves.
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
abilities through `ability()` or `authorize()`. `account.scoped(user, subject)`
resolves the abilities a user gains over one subject through team membership;
global grants stay out on purpose — `admit()` composes both.

### `team`

```ts
import { admit, team } from '@kit/auth'

const id = await team.create('platform')
await team.join(id, user, role)
await team.claim(id, 'app:blog')

await admit(req, 'app:blog', 'apps:operate')
```

A team is a named group of users; each teammate holds a role from the same
`roles` catalog global members use. A claim records that the team holds a
subject — an opaque string your app defines (an app name, a project id, a
customer). Authority composes one way: global grants always apply everywhere;
on top, for one subject, a user gains the abilities of every role they hold in
every team claiming it.

- `create(name)` / `rename(team, name)` / `remove(team)` / `get(team)` /
  `list()` — lifecycle; `list()` carries member and claim counts.
- `join(team, user, role)` — one membership per team and user; joining again
  changes the role. `leave(team, user)` removes it.
- `members(team)` — users with their role names.
- `claim(team, subject)` (idempotent) / `release(team, subject)` /
  `claims(team)` / `holders(subject)`.
- `of(user)` — the user's teams with role names. `subjects(user)` — every
  subject reachable through any membership, for scoping list views.

### `invite`

```ts
import { invite } from '@kit/auth'

const token = await invite.create({
  role: 'member',
  email: 'person@example.com',
  name: 'Person',
  inviter: user,
})

const pending = await invite.get(token)
const account = await invite.accept(token, { password: passwordHash })
await invite.revoke(invitationId)
const invitations = await invite.list()
```

`create()` returns a plaintext `ajoinv_` token once; the database stores only
the SHA-256 hash of the complete token. Invitations expire after seven days by
default. Supplying an email binds acceptance to its normalized value and
revokes any previous pending invitation for that email. Without an email, the
acceptor supplies one and invitations are not deduplicated.

The invitation carries a role name and optional team. Acceptance resolves the
role from the `roles` catalog and fails closed when it is unknown. A team
invitation creates a `teammates` row; a global invitation creates a `members`
row. The optional password is already hashed: accounts accepted with one are
verified immediately, while accounts accepted without one remain unverified.

A credential-less account can revisit the invitation while completing a
passkey ceremony. The window closes as soon as the account gains either a
password or a WebAuthn credential. `list()` returns only unexpired invitations
that have not been accepted or revoked, using stored ids suitable for
`revoke()`.

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

### `passkey`

WebAuthn, implemented here rather than depended upon: registration asks for
`attestation: 'none'`, which is what every mainstream passkey provider emits,
so there is no attestation statement to verify and no certificate chain to
walk — what remains is CBOR, fixed-offset parsing, and signatures `node:crypto`
verifies natively. Accepts ES256, EdDSA and RS256; dropping RS256 would lock
out Windows Hello over a TPM.

```ts
import { passkey } from '@kit/auth'

// Once, at startup. Never derived from a request header: the browser puts the
// real address bar origin into client data, and deriving what it is compared
// against from `Host` would let the caller choose.
passkey.configure({ rpId: 'example.com', origins: ['https://example.com'] })

// Registration, two requests.
const options = await passkey.registration({ id: user.id, name: user.email })
const id = await passkey.register(user.id, response)

// Authentication, two requests. Ends where password.verify ends.
const options = await passkey.authentication()
const user = await passkey.authenticate(response)

await passkey.list(user)
await passkey.remove(user, id)
await passkey.prune()
```

Challenges are rows, single-use, and expire on the redemption path — a window
enforced only by a sweeper nobody schedules is not a window. `prune()` reclaims
the rows; expiry does not depend on it.

**The relying party id is permanent.** Credentials are bound to `rpId` for
life and there is no migration: passkeys registered against `localhost` (an
SSH tunnel, say) will not be offered when the same host is later served at a
real name, and the browser will not even show them. Register the durable name
from the start where one exists; treat tunnel credentials as disposable where
it does not. In production use the apex (`example.com`, never
`app.example.com`) — any subdomain can assert against the apex, not the
reverse.

The counter is recorded and not enforced: passkeys synced through iCloud or
Google report zero from every device by design, so a regression is a note for
whoever reads the row, never a reason to refuse. What *is* enforced: backup
eligibility cannot change in either direction, and a credential registered
with the person verified cannot later be used on presence alone.

## Types

```ts
import type { Ability, Auth, Invite, New, Session, Team, Token, User } from '@kit/auth'
```
