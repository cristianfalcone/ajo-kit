# Ajo Kit LLM Instructions

`ajo-kit` is the full-stack framework for Ajo Apps: file routes, server loaders
and actions, SQLite through Kysely, live route updates, and a build that seals
the App for the ajo engine. This file holds the rules for building an App;
[README.md](./README.md) holds the setup, the `kit` command line and the API
reference. Components are Ajo TSX, not React: read `node_modules/ajo/LLMs.md`
before writing any.

The path from an empty directory to a live App is on ajo.dev, in
[Deploy your first App](https://ajo.dev/docs/start/deploy), and
[llms.txt](https://ajo.dev/llms.txt) indexes every documentation page. The
plugins and UI packages (`ajo-kit-auth`, `ajo-kit-mail`, `ajo-cloves`, `ajo-ui`,
`ajo-ui-playa`) document their APIs in their own READMEs.

## Data

| Topic | Rule |
|-------|------|
| **Server truth** | Loaders are the source of truth and components render `args.data`. Keep only UI-local state (an open menu, a draft) in a component, never a long-lived copy of server rows |
| **JSON** | Loader output travels as JSON in the SSR state, route JSON and live messages. Return strings, numbers, booleans, `null`, arrays and plain objects: a `Date` arrives as its ISO string (format it with `date()`), a `Map` or class instance does not survive |
| **Parent data** | Read ancestor loader data through `parent()` instead of querying it again or sending it twice |
| **Actions** | Validate `req.body` with `parse()` from `ajo-kit/validate` before writing; its `Invalid` reaches the form as `error.fields`. Fail by throwing `Missing`, `Forbidden`, `Denied` or `Invalid`, not by writing an error response |
| **Client calls** | Call route actions through `action()` from `ajo-kit/client`. It reads the topics the action emitted and refreshes the cached routes; a hand-written `fetch` skips that |
| **Queries** | Select columns explicitly with `select([...])`; `selectAll()` only when the whole row is needed. Bound every list read with a limit. Filter by owner in the query, not after it |
| **Writes** | A write of several steps runs in one Kysely transaction (`db().transaction().execute(...)`) |
| **Migrations** | A migration that ran anywhere is never edited, renamed or deleted. A schema change appends the next number in its own folder |

## Live updates

| Topic | Rule |
|-------|------|
| **Track** | A live loader calls `req.track?.(topic)` (a string or an array) for every topic it reads. An untracked read never refreshes |
| **Emit** | Route actions call `action.emit(...)`; API handlers, loaders and process-level work call `emit()` from `ajo-kit/server`. Emit only after the write commits |
| **Every reader** | Emit every topic the write changed, including the lists and counters other people see, not only the author's |
| **Names** | Name topics after the data and its owner, such as `notes:<user id>`. Prefer several precise topics to one broad topic: every live route that tracks a topic runs its loaders again when it changes |
| **Freshness** | Show fresh data by emitting its topic, never by reloading the page: the route cache follows topics |

## Access

| Topic | Rule |
|-------|------|
| **Abilities** | Guard with abilities: `ability(...)` in `wares.ts`, `authorize(req, ...)` or `admit(req, subject, ...)` in handlers (`ajo-kit-auth`). Never compare role names |
| **Rows** | Signing in does not restrict which rows a query returns. Check ownership where the data is read and written |
| **Secrets** | Loader output reaches the browser. Never return a password hash, a token hash or a secret from a loader or an API handler |

## Runtime

| Topic | Rule |
|-------|------|
| **Engine** | Server code runs on the ajo engine, not Node: no Node builtins, no `process`, no package that needs them. Read configuration with `env()` from `ajo-kit/platform` |
| **One process** | Design for one engine process with one SQLite file. Topic versions, live streams, and `ajo-kit-auth`'s rate limits and password confirmations live in process memory |
| **Measure first** | Add an index, a cache or an abstraction only for a hot path you measured (`AJO_TIMING=1`) |

## Tools

| Topic | Rule |
|-------|------|
| **CLI** | Run `pnpm kit <command> --json`: stdout holds one JSON document. On failure, branch on `error.code` and do what `next` says |
| **Browser tests** | Wait for `html[data-ajo-ready="true"]` before interacting: the client sets it once it has mounted the route |
