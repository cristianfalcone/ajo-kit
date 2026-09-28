# ajo-kit

A modular toolkit for building applications and component systems with
[Ajo](https://github.com/cristianfalcone/ajo).

Use the packages that match the project: a full-stack metaframework,
authentication, reusable component behaviors, unstyled UI, or the Playa themed
component library.

## Packages

| Package | Use |
|---|---|
| [`ajo-kit`](packages/ajo-kit/README.md) | File routes, SSR, loaders, actions, API handlers, middleware, SQLite migrations, and live SSE updates |
| [`ajo-kit-auth`](packages/ajo-kit-auth/README.md) | Authentication, authorization, sessions, API tokens, CSRF, guards, password reset, and verification for `ajo-kit` apps |
| [`ajo-kit-mail`](packages/ajo-kit-mail/README.md) | Validated mail contract with SMTP, HTTP provider, and capture transports for `ajo-kit` apps |
| [`ajo-cloves`](packages/ajo-cloves/README.md) | Reusable stateful behaviors and lifecycle utilities for Ajo components |
| [`ajo-ui`](packages/ajo-ui/README.md) | Unstyled accessible component families for Ajo |
| [`ajo-ui-playa`](packages/ajo-ui-playa/README.md) | Themed Ajo components and an UnoCSS preset |
| [`create-ajo`](packages/create-ajo/README.md) | `pnpm create ajo <dir>`: a new App from the starter |

## Install

Install only the packages used by the application.

### Full-Stack Application

```bash
pnpm add ajo ajo-kit
pnpm add -D vite typescript @types/node
```

Add authentication and outbound mail when needed:

```bash
pnpm add ajo-kit-auth
pnpm add ajo-kit-mail
```

See the [`ajo-kit` guide](packages/ajo-kit/README.md) for the application setup,
routing, CLI, server APIs, persistence, validation, and live updates.

### Reusable Component Behaviors

```bash
pnpm add ajo ajo-cloves
```

See the [`ajo-cloves` catalog](packages/ajo-cloves/README.md) for controlled
state, dismissal, keyboard navigation, selection, sensors, and lifecycle
utilities.

### Unstyled Components

```bash
pnpm add ajo ajo-ui
```

See the [`ajo-ui` guide](packages/ajo-ui/README.md) for component families,
state contracts, styling hooks, localization, and component utilities.

### Playa Components

```bash
pnpm add ajo ajo-ui-playa
pnpm add -D unocss@66.10.5
```

See the [`ajo-ui-playa` guide](packages/ajo-ui-playa/README.md) for UnoCSS
setup, themed component imports, and the complete family catalog.

## Starter

```bash
pnpm create ajo notes
cd notes
pnpm kit dev
```

[`create-ajo`](packages/create-ajo/README.md) copies the
[starter](packages/create-ajo/template/README.md), installs it and prepares its
database: a small private notebook with registration, sessions and CSRF, SQLite
migrations, owner-scoped notes, live updates, verified email and Playa, pinned
to the packages of its release.

## Example Application

[`packages/demo`](packages/demo) is a complete application using `ajo-kit`,
`ajo-kit-auth`, and Playa.

It contains routes, auth flows, SQLite migrations, live updates, unit tests,
integration tests, dev-server browser tests, and ajo engine acceptance tests.
