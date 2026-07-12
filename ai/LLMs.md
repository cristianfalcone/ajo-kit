# Ajo App LLM Guide

Last updated: 2026-07-12

This is the short app-building guide for AI agents using Ajo and `ajo-kit`.
It is not the repo maintenance guide; use `AGENTS.md` for working on this
repository itself. Use `readme.md` for the human public API guide,
`ai/architecture.md` for implementation internals, and `ai/chat.md` for the
chat demo app.

## Project Shape

Package setup is currently workspace/local: `ajo` is published on npm, but
`ajo-kit`, `ajo-auth`, `ajo-cloves`, `ajo-ui`, and `ajo-backup` should be
installed from workspace, `file:`, or packed tarball dependencies until they
are published.

```text
packages/
  ajo-kit/
    src/
      index.ts        # curated universal @kit root API
      server.tsx      # SSR runtime, send(), emit(), SSE fanout
      app.tsx         # client router, route cache, JSON navigation, SSE live updates
      client.tsx      # action() helper and SSR hydration
      ssr.ts          # devalue-backed SSR boot payload helpers
      cache.ts        # bounded route cache helpers
      freshness.ts    # route hash and topic-version freshness helpers
      timing.ts       # opt-in measurement helpers
      database.ts     # Kysely + SQLite pragmas
  ajo-auth/
    src/
      wares.ts        # session(), csrf
      guard.ts        # protect(), guest(), ability(), confirmed(), verified()
  ajo-cloves/
    src/
      index.ts        # public clove catalog
      core.ts         # Host, id(), shared(), frame()
  ajo-ui/
    src/
      index.ts        # unstyled base component barrel; ajo-ui/<name> per family
      utils.ts        # component-system helpers, including OmitArg + FixedArgs

src/
  (public)/**/handler.ts
  (app)/**/handler.ts
  abilities.ts
  data/index.ts
  data/pagination.ts
  ui/                 # thin "playa"-themed adapters over ajo-ui
```

## Handler Contract

Route `handler.ts` files can export:

- `layout(req, parent?)`
- `page(req, parent?)`
- `head(req, parent?)`
- `actions = { name: async (req, res?) => ... }`
- `default { get, post, put, patch, delete, options, head }` for `/api/*`

## Auth And Abilities

- Root wares populate `req.user` through `@kit/auth`; bearer auth applies only
  to `/api/*`, and an explicit Bearer token wins over cookies there.
- Use `ability(...)` in route `wares.ts` and `authorize(req, ...)` inside
  handlers/actions. Do not check role names for access.
- Roles are assignment/display bundles. `req.user.abilities` is the account
  authorization surface.
- Cookie requests require account abilities. Bearer API requests require both
  account abilities and token abilities.
- Token creation must bound requested abilities by the authenticated account and
  by the current token when the caller is using bearer auth.
- Keep object ownership and field checks close to data reads/writes; constrain
  queries by owner where possible and use explicit `select([...])`.
- Admin reads use `admin:read`; admin mutations use `admin:write`.

## Registration And Invitations

- Signup policy and invitations use `src/data/registration.ts`.
- Public signup defaults to `open`. Public `/register` must enforce invite-only
  mode in the server action before parsing or writing; UI links are not a
  security boundary.
- Public login/register loaders that read signup mode must track
  `registration:policy`.
- Admin registration loaders track `admin:registration`; mode changes emit both
  `admin:registration` and `registration:policy`.
- Invitation tokens are bearer credentials. Generate plaintext once, store only
  the SHA-256 hash, expire them, and consume them in the same transaction that
  creates the user.
- Invitation acceptance creates a verified standard `user`, creates a session
  after commit, and emits user/session/admin topics plus `admin:registration`.

## Live Data Contract

Loaders must track topics they read:

```ts
import type { Request } from '@kit'

export async function page(req: Request) {
  req.track?.('admin:tokens')
  return { tokens: await listTokens() }
}
```

Mutations must emit topics they changed:

```ts
import type { Request } from '@kit'
import { emit } from '@kit/server'

export const actions = {
  revoke: async (req: Request) => {
    await revokeToken(req.body.id)
    emit(['admin:tokens', 'admin:stats', `tokens:${req.user!.id}`, `dashboard:${req.user!.id}`, `user:${req.user!.id}`])
    return { revoked: true }
  }
}
```

For multi-step writes, use a transaction and call `emit()` after commit.

## Route Freshness

The client caches successful route states by URL. Returning to a visited route
sends `X-Have` and `X-Ajo-Versions`.

Server behavior:

- Fresh topic versions can return early `304` before loaders.
- Stale topic versions run loaders and may still return hash-based `304`.
- SSE live payloads update the active route cache hash/topics/versions.
- Relevant non-redirect actions reconcile the active route even when SSE is unavailable.
- The route cache is topic-invalidated and bounded by LRU/TTL helpers.

Do not reintroduce implicit table dependency tracking. The contract is explicit
topics.

## SSR and Protocol Boundaries

- `ai/architecture.md` is the source of truth for data flow, SSR, freshness, and protocol boundaries.
- Use `devalue` only for the SSR boot payload.
- Keep route JSON, actions, SSE messages, and public API responses as plain JSON.
- Do not make handlers return non-JSON values just because the SSR serializer can support them.
- If an action changes topics and does not redirect, the active route should reconcile through SSE first, then JSON fallback if needed.

## Client Rules

- Use `action()` for form/mutation calls.
- Wait for `html[data-ajo-ready="true"]` in browser/e2e automation.
- Render server truth from `args.data`.
- Use `export const pending = true` in the page or innermost layout that should
  receive `loading=true` during client navigation.
- Keep only UI-local state locally.
- Avoid long-lived mirrors of server arrays unless the feature explicitly needs a
  bounded local window.

## Calendar and Date Fields

Use the themed roots from `src/ui`; they keep all behavior in `ajo-ui` and add
only the playa recipes:

```tsx
<Calendar
  disabled={{ before: earliest }}
  unavailable={[{ dayOfWeek: [0, 6] }, holiday]}
/>

<InputDateTime
  calendar
  unavailable={{ time: { from: '12:00', to: '13:00' } }}
/>
```

- `disabled` means a hard calendar block: native disabled, skipped by focus,
  and never emitted. `unavailable` means selectable-but-invalid: the value
  commits and the field exposes its reason/message. Do not merge the channels.
- Matcher fields inside one object intersect; matcher arrays are alternatives.
  Time windows are half-open. A time window never marks an entire Calendar day.
- Ranges crossing unavailable interior days invalidate both sides by default.
  Add `allowNonContiguous` when that crossing is valid; unavailable interior
  cells then remain visible but are omitted from the selected band.
- Calendar's default caption drills day → month → year. Use
  `minView="month"` or `minView="year"` to commit whole periods. Use
  `captionLayout="label"` for a static caption or a `dropdown*` layout when
  explicit selects are the desired UI.
- `<InputDateTime calendar />` includes a popup time surface by default. It
  edits the same field record as the outer segments and therefore keeps the
  popup open after a day pick. Explicit compositions may place
  `InputDateTimeField side="from|to"` inside `InputDateContent`.
- Calendar intentionally has no preset API. Standalone presets are ordinary
  application buttons controlling `selected`; InputDate family presets remain
  value-level buttons inside its popup.
- In explicit InputDate composition, `unavailable`, `allowNonContiguous`,
  mode, and selected state belong to the root. `InputDateCalendar` accepts
  presentation and hard-disabled customization but seals those owned args.

Do not create a second date/time engine in `src/ui`, and do not write an Ajo
Context from a Stateless component. Stateless parts read the root's live view;
the Stateful root owns all context writes and mutations. A Stateless part may
invoke a registration callback exposed by that owner, but it must not turn the
callback into a context setter.

## Sharing Logic With Cloves

- Import shared UI behavior from `ajo-cloves`, not from `ajo-kit`.
- Preserve the one-way layer dependency: `ajo-cloves` → `ajo-ui` → `src/ui`.
- Keep general, reusable Ajo behavior and primitives in `ajo-cloves`; its
  public cloves should be useful outside this app and component catalog.
- Keep small component-system-only helpers together in `ajo-ui/utils.ts`.
  Do not grow one-function utility modules for them.
- Import `OmitArg` and `FixedArgs` only from `ajo-ui/utils`; neither belongs in
  the `ajo-ui` root nor in `ajo-cloves`.
- Keep `src/ui` as a thin themed layer over unstyled `ajo-ui`; do not move
  reusable component behavior or general-purpose logic into the theme.
- Use `*Class` for a static singleton part, a scoped `classNames` or `classes`
  map for a themed collection, and a callback such as `dayClassName` when the
  class depends on state.
- Mutable Context ownership stays in Stateful components. Stateless parts may
  read the live view and invoke owner callbacks, but never write the Context.
- The clove pattern itself is defined by `node_modules/ajo/LLMs.md`; do not
  restate or fork those rules here.
- The public catalog lives in `packages/ajo-cloves/README.md`.
- Repo-specific decisions, the attr-bag convention, and deferrals live in
  `ai/cloves.md`.

## Pagination

Admin list routes use `paginate`, `rows`, and `info` from
`src/data/pagination.ts`, then render the themed `Pagination` family from
`src/ui/pagination.tsx`, normally through `src/(app)/admin/pagination.tsx`.

Keep list reads bounded. Do not add totals unless the UI needs them.

## Timing

Use this only while measuring:

```powershell
$env:AJO_TIMING = "1"
pnpm dev
```

Timing headers/logs:

- `Server-Timing`
- `X-Ajo-Bytes`
- `X-Ajo-Cache`

Use `AJO_TIMING=1` route headers/logs during investigations; do not import
framework timing internals from app code.

## Production Topology

Assume one `kit start` Node process with one SQLite database file. Do not design
new app features that rely on multi-instance coherence unless the app explicitly
adds a shared topic bus and shared rate-limit store.

Process-local framework state:

- route topic versions
- active SSE connections
- pending live fanout
- auth rate limits
- password confirmation stamps

Keep mutations durable in SQLite and emit topics after commit. Treat reverse
proxy TLS/restart/edge limits as deployment concerns around the single app
process.

Production env for apps:

- `APP_URL`: public `http` or `https` origin for non-local deployments.
- `APP_SECRET`: 32+ random characters when using `ajo-auth`.
- `DATABASE_PATH`: persistent SQLite file path if the app connects from env.

## Topic Names

Use the current app topic vocabulary from `ai/architecture.md`. Prefer multiple
precise topics over a broad catch-all. Chat-specific topic names live in
`ai/chat.md`. Registration-specific topics are `registration:policy` for public
signup affordances and `admin:registration` for admin mode/invitation reads.

## Common Pitfalls

- Missing `req.track` in a live loader.
- Missing `emit` after mutation.
- Emitting only self topics and forgetting admin/global topics.
- Emitting before a transaction commits.
- Clearing the whole route cache manually instead of relying on emitted topics.
- Adding indexes or abstractions before measuring a real hot path.

## Verification

For framework/data changes:

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm test:all
pnpm test:prod
```

The stories manager smoke must enter through the real manager, wait for the
preview iframe, change a control through `postMessage`, reset to initial args,
exercise a search URL, and navigate to a second story before canvas stories.
Live arg changes rerender the same story instance; only a story-id change
remounts it.

For docs-only changes, use consistency searches instead of running the full app.
