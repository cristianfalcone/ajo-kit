# ajo-kit application skeleton

This package is intentionally small enough to read top to bottom. It shows one
complete application slice instead of a collection of disconnected examples.

## Mental model

Development runs on Node because Vite, TypeScript, migrations, and Vitest are
development tools. `kit build` closes and audits the server graph, compiles the
migration registry, builds the client, and stages both with `compiler.json` under
`.ajo/`. `ajo-engine-compiler` seals that exact staging tree into `dist/ajo`; ajo-server then
runs its server graph on the ajo runtime and serves its client tree. Node is not
a production target.

## Read the files in this order

- `vite.config.ts` installs the kit route compiler, server-only guard, Ajo JSX,
  and UnoCSS.
- `src/database.ts` selects the Node or ajo SQLite face behind one typed Kysely
  schema.
- `db/migrations/0001_notes.ts` evolves schema; the build discovers, validates,
  qualifies, and compiles this registry into the artifact.
- `src/wares.ts` is the root request boundary and the production bootstrap hook.
- `src/handler.ts` owns the `/` loader and action beside the route it serves.
- `src/page.tsx` renders loader data during SSR and invokes the named action in
  the browser.
- `src/layout.tsx` shows how layouts wrap descendant route output without a
  React runtime.
- `index.html` supplies the head, serialized data, root, and client-entry slots
  used by SSR and hydration.
- `tests/handler.test.ts` runs the migration, bootstrap, loader, and action on
  the Node face with a temporary SQLite database.
- `vitest.config.ts` keeps tests on public package imports and the Node face.
- `uno.config.ts` chooses Playa; replace it or use unstyled `ajo-ui` components
  when the application needs a different visual system.

The loader tracks `notes`. The action validates input, commits one row, then
emits `notes` through `ActionContext`; the client invalidates matching cache
entries and the active SSE route is revalidated with a full loader payload.
Loaders remain server truth, so the page does not maintain a second notes store.

## Three application commands

```bash
pnpm dev       # Node + Vite development server
pnpm build     # audited engine staging in .ajo/
pnpm artifact  # build, then seal dist/ajo with ajo-engine-compiler
```

Run `pnpm kit migrate up` once before the first development boot; production
runs the compiled registry automatically before `bootstrap`.
Run `pnpm test` for the handler test and the public-package build smoke test.
Run `pnpm typecheck` before handing off a change.

## Server-side types

`ajo-kit` exports the host-neutral `Request`, `Response` reply accumulator,
`Middleware`, `PageArgs`, `LayoutArgs`, `ActionContext`, and `Bootstrap` types.
`ajo-kit/database` exports Kysely, `Generated`, `Selectable`, `Insertable`, and
`sql`; use explicit selections so transport data stays intentional.

The engine declarations in `ajo-kit/runtime.d.ts` describe `runtime:app`,
`runtime:crypto`, `runtime:http`, and `runtime:sqlite`, plus root-confined
`runtime:fs` and FIFO-only `runtime:ipc`. `runtime:app` also exposes hostname,
RSS bytes, and uptime metrics. Application code normally prefers the portable
kit faces; import a `runtime:*` module only for an engine-specific capability.

`package.json#kit.engine` is empty but present so authority has an obvious home;
its exported TypeScript shape is `AppEngineConfig` from `ajo-kit/node`. Authority
is declared in that manifest block and sealed into the artifact descriptor.
Runtime modules expose only that authority, so filesystem roots and IPC pipes
cannot be widened by application code. Missing, malformed, or undeclared
authority fails closed during build or module load.

The named `bootstrap` hook runs after compiled migrations and before the engine
listens, whether starting audited staging directly or the sealed artifact. It is
for idempotent seed data and application registration, not schema changes. It
does not run in `kit dev`; development and operations use `kit migrate`.

## Next

Read `packages/demo` for route groups such as `src/(app)`, nested layouts, auth,
CSRF, abilities, transactional workflows, mail, and browser journeys. Auth is
deliberately not a baseline dependency: add `ajo-kit-auth` when the domain has
an identity or authorization boundary.
