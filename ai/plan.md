# Ajo Kit Active Plan

Last updated: 2026-07-12

## Status

- Objective: **complete**. The cohesion and Calendar work across
  `ajo-cloves -> ajo-ui -> src/ui` has landed through T9.
- Active feature: none.
- Active slice or sub-slice: none.
- Blockers: none.
- Implementation head: `ba52ca4` (`fix(ajo-cloves): freeze storage views after
  teardown`).
- Closure: D1 is the documentation-only commit that closes the 46-commit
  series. Its final integration battery is recorded below.

Do not reopen the completed audit ledger as an active plan. New work starts
only from a new user-directed goal and a current code/test inspection.

## Architecture at a glance

```text
ajo-cloves  ->  ajo-ui  ->  src/ui  ->  application routes and stories
general         unstyled    Playa       product composition
host logic      components  theme       and content
```

- `ajo-cloves` owns reusable host, lifecycle, state, sensor, positioning,
  keyboard, geometry, and attr-bag logic. It must remain useful outside this
  component catalog.
- `ajo-ui` owns unstyled component behavior and component-system helpers. Its
  deep internal modules remain private. `OmitArg` and `FixedArgs` deliberately
  live together on `ajo-ui/utils`; they describe themed adapter ownership, not
  general host behavior.
- `src/ui` is a thin Playa-themed adapter layer: classes, icons, recipes, and
  composition only. It derives public args from `ajo-ui` and does not fork
  interaction engines.
- Application routes consume `src/ui` and keep product-specific composition
  local.

The published runtime dependency is Ajo `0.1.35`. This series did not create or
require a new Ajo release.

Cross-layer invariants:

- Stateful components own context writes; Stateless consumers may read context
  but must not mutate an ancestor's context.
- The default Stateful host is expressed as `Stateful<Args>` without a
  redundant `Component.is = 'div'`; explicit hosts are used only when semantic
  markup differs from the configured default.
- Browser work is lifecycle-owned and SSR-gated.
- A themed adapter fixes base implementation knobs with `OmitArg` plus
  `FixedArgs`, keeps `class` on the visible root, and preserves generic and
  discriminated-union relationships.
- No compatibility aliases or transitional wrappers remain for the retired UI
  surface.

## Canonical sources

Read only what the task needs:

- `AGENTS.md` — repository rules, commands, compatibility stance, and concise
  architecture snapshot.
- `node_modules/ajo/LLMs.md` — authoritative Ajo JSX, component, context, and
  special-attribute rules.
- `ai/architecture.md` — implemented runtime and package architecture.
- `ai/LLMs.md` — app-building guidance for Ajo Kit consumers and agents.
- `readme.md` — public Ajo Kit framework API.
- `packages/ajo-cloves/README.md` — public clove catalog and ownership rules.
- `packages/ajo-ui/README.md` — public unstyled component-system API.
- `ai/commits.md` — final 46-commit implementation record.

Feature and audit records (`ai/audit.md`, `ai/calendar.md`, `ai/cloves.md`,
`ai/consolidation.md`, `ai/date.md`, `ai/menus.md`, `ai/select.md`, and
`ai/stories.md`) preserve decisions and evidence. They are not active queues and
must not override current source, tests, or the canonical documents above.

## Recorded deferrals

These are demand-driven extension points, not pending slices:

- Calendar/date: `InputDateSlots`, a dedicated `InputMonth` family,
  month-range hover preview, and multiple month/year themed scenarios. The
  broader paste, native-constraint, spin-repeat, overnight-range,
  autocomplete, non-Gregorian, and IANA-time-zone extensions remain recorded
  in `ai/date.md`.
- Select: explicit `closeOnSelect`, delta/reason callbacks, `readOnly`, a
  separate form serializer, chip overflow, and virtualization remain recorded
  in `ai/select.md` until a consumer requires them.
- Menus/navigation: a morphing NavigationMenu viewport/indicator and a Sidebar
  cookie-read seam remain recorded in `ai/menus.md`.
- Package promotion: the popup engine remains internal to `ajo-ui`; promote it
  to an `ajo-cloves` clove only after a second consuming package appears.
- General cloves: the P2 parking lot in `ai/cloves.md` remains closed under the
  no-consumer/no-clove rule.

Rejected alternatives documented in those records are not deferrals and
should not be reintroduced as speculative work.

## Final verification

The last implementation snapshot records:

- root unit suite: **527 tests**;
- `ajo-ui`: **144 tests**;
- `ajo-cloves`: **241 tests**;
- stories: **468 stories**;
- e2e: **47 tests**.

Run the documentation closure against the final tree and record the result in
this block. If discovery changes a count, update both this block and the final
snapshot in `ai/commits.md`.

Status: **PASSED on the clean `ba52ca4` implementation snapshot**

Verified counts: unit 527; ajo-ui 144; ajo-cloves 241; stories 468; e2e 47;
production smoke 1. TypeScript, client build, and SSR build also passed. One
initial unit flake did not recur in 50 focused runs or 10 complete-suite runs.

```bash
git diff --check
pnpm exec tsc --noEmit
pnpm test:unit
pnpm --filter ajo-ui test
pnpm --filter ajo-cloves test
pnpm stories:test --port <free-port>
pnpm test:e2e
pnpm build
pnpm test:prod
```

## Handoff

There is no next implementation slice. Before any new task, verify live state:

```bash
git status --short
git log --oneline -5
```

Preserve unrelated user work, inspect the current package seam before editing,
and create a new narrow plan only when the user supplies the next objective.
