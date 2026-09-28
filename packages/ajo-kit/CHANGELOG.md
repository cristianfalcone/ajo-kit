# ajo-kit

## 0.4.0

### Breaking Changes

- Requires `ajo ^0.2.0` and `vite ^8.3.1`.
- `kit build` writes a compiler descriptor without `migrations` and
  `env.optional`. Only `ajo-engine-compiler` 0.2.0 accepts it, and only
  `ajo-engine` 0.2.0 runs what it seals; the 0.1.0 pair refuses it.
  Migrations still run from the bundled registry at startup. `APP_SECRET` is no
  longer part of the kit's base environment: `ajo-kit-auth` declares it
  required.
- A plugin or App that uses `runtime:net` in the engine declares
  `"kit": { "engine": { "net": true } }` in `package.json`; the build no longer
  infers it from module paths.
- The `ajo-kit/mail`, `ajo-kit/bytes` and `ajo-kit/origins` subpaths are
  removed. Mail is `deliver()` from `ajo-kit-mail`.
- The `@kit` and `@kit/*` import aliases and the `kit.alias` plugin manifest
  field are removed. Import `ajo-kit`, `ajo-kit/server`, `ajo-kit-auth` and the
  other packages by name; only `/src/client` stays as an alias.
- `normalize` is removed from the `ajo-kit` root.
- `ajo-kit/vite` exports only `kit` and `Options`: `jsx`, `defaults`,
  `descriptor`, `engine`, `graph` and their types are gone.
- `ajo-kit/node`: `compile`, `emitDescriptor`, `EngineOutput` and
  `AppEngineConfig` are removed. `build()` returns nothing, `dev()` returns a
  Node request listener (polka is gone) and `listen(listener, port, options)`
  serves it. `create()` from `ajo-kit/server` takes the HTML template string.
- `ajo-kit/platform` no longer exports `argon2Hash`, `argon2Verify` or the
  `Platform` type; `ajo-kit-auth` owns password hashing. In the browser the
  module exports only `env`, `base64UrlEncode` and `base64UrlDecode`.
- SSR state, route JSON and SSE payloads use JSON as the one serializer
  (devalue is gone): a loader returns JSON data, so a `Date` arrives as its ISO
  string and `Map`, `Set` and `undefined` values do not survive.
- Pages and layouts receive `error` as an `Issue` (`{ status, message,
  fields? }`) on the server and after hydration. In production a 5xx renders as
  `Internal Server Error`; the original error goes only to the log.
- The most specific route wins: a static segment over a parameter over a
  splat, for pages, route JSON, API handlers and client navigation.
- A page action runs only when its name is an own key of `actions`; inherited
  names such as `constructor` answer 400.
- With `TRUST_PROXY`, the client address and protocol come from the last
  forwarded hop of `X-Forwarded-For` and `X-Forwarded-Proto`.
- Responses no longer carry `X-Ajo-Bytes`, `send()` no longer sets
  `Content-Length` (the host writes lengths), and a failed request no longer
  returns a `details` field.
- The `Head` type drops the `httpEquiv` meta form.
- `Request` keeps only `user`, `session`, `token`, `scope`, `track` and
  `topics` beyond the HTTP fields; the internal `originPolicy`, `timing`,
  `verifyLive`, `revalidate`, `head` and `entries` fields are gone.
- Managed origins are keyed on `AJO_ORIGINS_FILE`; the `X-Ajo-Origins` marker is
  gone, and an unreadable or invalid origins manifest is a configuration error
  with no fallback.

### What Is New

- `production()` in the `ajo-kit` root, and `integer`, `minValue` and
  `picklist` in `ajo-kit/validate`.
- Page actions accept `application/x-www-form-urlencoded` bodies as flat string
  fields, so a native form post reaches the handler; API routes still leave
  non-JSON bodies unread.
- The client boots over the server-rendered route and keeps its DOM, and route
  params reach the page on the server and on the first client render.
- The client opens the live stream only on routes that track topics, reloads
  from the server for a link no client route matches, leaves back and forward
  scroll to the browser, and refreshes the route when the stream reconnects.
- `head` renders through one view on both sides, with the client reconciling
  only the tags between two SSR markers.
- `db()` connects on first use to `DATABASE_PATH`, or `./database.sqlite`.
- The build no longer scans for `Intl` or `navigator`; the README states the
  engine's runtime `Intl` profile.

### Upgrade Steps

1. Install the new versions together:
   `npm install ajo@0.2.0 ajo-kit@0.4.0` plus `ajo-kit-auth@0.7.0`,
   `ajo-kit-mail@0.4.0` and `ajo-ui-playa@0.2.0` when you use them, and
   `npm install --save-dev --save-exact ajo-engine@0.2.0 ajo-engine-compiler@0.2.0`.
2. Replace `@kit` imports with package names (`@kit` becomes `ajo-kit`,
   `@kit/server` becomes `ajo-kit/server`, `@kit/auth` becomes
   `ajo-kit-auth`) and delete the `@kit` entries from `tsconfig.json` `paths`.
3. Replace `ajo-kit/mail` with `ajo-kit-mail`: `configure({ from, transport })`
   and `deliver(message)`, checking `outcome.ok`.
4. Remove `jsx` from `vite.config.ts`; keep `"jsxImportSource": "ajo"` in
   `tsconfig.json`, or set `oxc: { jsx: { importSource: 'ajo' } }`.
5. Make loader data JSON: send dates as ISO strings and convert `Map` and `Set`
   to arrays or objects.
6. In error layouts, read `error.status`, `error.message` and `error.fields`.
7. Serve development with `listen(await dev(options), port)`: `dev()` returns
   a Node request listener, not a polka app.
8. Add `"kit": { "engine": { "net": true } }` to an App that calls
   `runtime:net` directly.
9. Run `kit build` and seal again with `ajo-engine-compiler` 0.2.0; deploy with
   `ajo-engine` 0.2.0.

## 0.3.2

### Patch Changes

- Support host-managed request origins and deterministic engine metadata from explicitly declared plugins.

## 0.3.1

### Patch Changes

- Preserve fragment navigation after route rendering and handle loader failures without unhandled parent promise rejections.

## 0.3.0

### Minor Changes

- Remove the unused build check option; keep engine graph validation mandatory for every build.

## 0.2.1

### Patch Changes

- Create the compiler output parent on the first kit build and document installed package aliases and Ajo form events.

## 0.2.0

### Minor Changes

- Require nullable Request.token.subject metadata for subject-aware bearer authorization. Upgrade ajo-kit-auth to 0.5.0 together with this release.
