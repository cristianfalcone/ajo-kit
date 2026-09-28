# ajo-kit-auth

## 0.7.0

### Breaking Changes

- Requires `ajo-kit ^0.4.0`. Auth queries run on `db()` from
  `ajo-kit/database`: `configure()` and its store are removed.
- `wares.csrf` accepts an unsafe cookie-authenticated request only when
  `Origin`, or `Referer` when `Origin` is absent, names the exact request
  origin; a request with neither is refused. The signed `XSRF-TOKEN` cookie,
  the `X-XSRF-TOKEN` header and the `csrf` namespace (`csrf.set`,
  `csrf.verify`) are removed.
- `protect(to)` answers 401 on `/api/` routes and redirects elsewhere. `auth()`
  and `verified()` are removed, and so is the `guard` namespace (the guards stay
  top-level exports).
- `limit.hit(key, max = 5, window = 60_000)` records the attempt and returns
  whether it is allowed; `limit.check` and `limit.remaining` are removed. The
  store holds at most 10,000 keys and refuses a new key while it is full of
  live counters.
- `confirm.check(req)` uses a fixed three-minute window and takes no window
  argument.
- Passkey registration and authentication require user verification (a PIN,
  biometric or device unlock). A credential that proves only presence stops
  working, and its owner must enroll a passkey that verifies the user.
- `invite.revoke(id)` also revokes an accepted invitation whose enrollment is
  unfinished.
- `wares.session()` takes no lookup argument.
- Removed exports: `session.touch`, `token.prune`, `reset.prune`,
  `passkey.prune`, `passkey.window`, `team.rename`, `team.of`, `team.holders`,
  `cookie.parse`, `cookie.secure`, and the `New`, `Session`, `Token`, `Team` and
  `Invite` types. `User` and `Auth` remain.
- The package declares `APP_SECRET` as a required engine variable, so a sealed
  App that uses auth does not start without it.

### What Is New

- Passwords hash with Argon2id (m=19456, t=2, p=1) through the engine's
  `runtime:crypto` in a sealed App and through npm `argon2` on Node.
- An account's first passkey is stored atomically: when two registrations for
  a credential-less account race, the first to finish wins.
- Issuing a passkey challenge deletes expired challenge rows.
- `account.parse(value)` parses a stored ability list and returns `null` when it
  is not a JSON array of strings.
- WebAuthn and verification links decode UTF-8 with the standard fatal
  `TextDecoder`.
- The migrations are unchanged (`0001` to `0006`).

### Upgrade Steps

1. Install `ajo-kit-auth@0.7.0` with `ajo-kit@0.4.0`.
2. Delete the `configure(() => db())` call; auth reads the kit database.
3. Keep `export default [wares.session(), wares.csrf]` in `src/wares.ts`.
   Remove any code that reads the `XSRF-TOKEN` cookie or sends
   `X-XSRF-TOKEN`; browsers send `Origin` on unsafe requests.
4. Replace `auth()` with `protect()`. Replace `verified()` with a check of
   `req.user.verified` in the route.
5. Replace `if (!limit.check(key, max)) ...; limit.hit(key, window)` with
   `if (!limit.hit(key, max, window)) ...`.
6. Remove the window argument from `confirm.check(req)`.
7. Before upgrading a deployed App, ask passkey owners to enroll a credential
   that verifies the user; presence-only credentials stop working.
8. Set `APP_SECRET` for every sealed App.

## 0.6.1

### Patch Changes

- Validate cookie-authenticated writes against the current managed App origin and require ajo-kit 0.3.2 or newer.

## 0.6.0

### Minor Changes

- Require ajo-kit 0.3 while preserving session, token, and migration behavior.

### Patch Changes

- Updated dependencies:
  - ajo-kit@0.3.0

## 0.5.0

### Minor Changes

- Add exact-subject API tokens with a 90-day maximum lifetime and current account/team authorization. token.create now takes an options object as its fourth argument; token.revoke requires the owner and full stored id. Migration 0006 adds subject metadata and revokes scoped credentials before rollback removes it.

### Patch Changes

- Updated dependencies:
  - ajo-kit@0.2.0
