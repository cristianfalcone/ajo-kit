# Ajo Kit Feature Plan

Use this file for one active feature at a time. It is a working plan, not a
history, audit ledger, or release log.

Before implementation, replace the prompts in the feature sections. When the
feature closes, move durable contracts into canonical documentation and reset
the feature-specific sections for the next objective.

## Feature Definition

Define the intended outcome before choosing implementation details:

- **Objective:** state the capability or improvement in one sentence.
- **User-visible outcome:** describe what becomes possible or more reliable.
- **Motivation:** record the concrete problem or evidence that justifies work.
- **In scope:** name the behaviors, packages, and surfaces allowed to change.
- **Out of scope:** make adjacent features and speculative extensions explicit.
- **Constraints:** record compatibility, performance, accessibility, or platform
  boundaries.
- **Acceptance criteria:** list observable conditions that prove completion.

The objective must identify an owner in the package chain and a verifiable end
state. Do not begin from a proposed abstraction without a real consumer.

## Status

Keep only live execution state here:

- **Stage:** discovery, design, implementation, verification, or complete.
- **Active slice:** the one outcome currently being implemented.
- **Blockers:** facts that prevent progress, with their required resolution.
- **Next checkpoint:** the next observable result, decision, or verification.

Do not retain completed task lists, commit hashes, suite counts, or chronology.
Git and canonical technical documents own that history.

## Architecture At A Glance

```text
ajo-cloves  ->  ajo-ui  ->  src/ui  ->  application routes and stories
general         unstyled    Playa       product composition
host logic      components  theme       and content
```

- `ajo-cloves` owns reusable Ajo behavior, lifecycle, sensors, positioning,
  state primitives, and host utilities.
- `ajo-ui` owns unstyled component behavior, semantic markup, accessibility,
  composition, and component-domain engines.
- `src/ui` owns Playa classes, visual defaults, recipes, icons, and theme-level
  composition.
- Application routes own product content, route-specific layout, and business
  state.

Dependencies flow only from left to right. Move logic downward when its
semantics are general enough for the lower layer and a real consumer proves the
interface.

## Ownership And Implementation Guidelines

### Package Ownership

- Put reusable host or interaction behavior in `ajo-cloves`.
- Put component semantics and shared family policy in `ajo-ui`.
- Put classes, icons, recipes, and visual composition in `src/ui`.
- Keep product-only state and composition in application routes.
- Keep component-specific engines internal to `ajo-ui`.
- Promote a helper to `ajo-cloves` only when its interface is generally useful,
  not merely because two files share code.

Small helpers belong in the layer's existing `utils.ts` when a separate module
would contain only one small function or a few constants. A generally useful
Ajo behavior belongs in `ajo-cloves`, with a public contract and real consumer.

Changing or publishing the upstream `ajo` package requires a concrete need and
explicit scope. Prefer the correct local `ajo-kit` package for kit-local logic.

### Stateful And Context Ownership

- Stateful roots own mutable state, browser effects, lifecycle, and Context
  writes.
- Stateless wrappers and parts may read Context and invoke owner callbacks.
- Stateless components must not set an ancestor Context.
- Expose a public Context directly as `XContext`; do not wrap Context reads in
  React-shaped `useX` accessors.
- Use `Stateful<Args>` for Ajo's default host; do not repeat `.is = 'div'`.
- Declare another host only when its native semantics matter.
- Pass root DOM args through `statefulRootAttrs` where the contract requires it.
- Keep Context module-private unless real cross-family or Playa composition
  needs a public view.

### Cross-Layer Quality

- Keep one canonical engine for one behavior; compose it instead of forking it.
- Prefer small, cohesive changes that preserve the global package model.
- Keep public values, DOM identity, slots, ARIA, and controlled-state semantics
  consistent across families.
- Treat closures as live inputs and bind browser-owned work to host lifecycle.
- Preserve SSR shape and gate DOM access through the established helpers.
- Derive Playa adapter args from base types. Seal adapter-owned keys with
  `OmitArg` and `FixedArgs`.
- Keep `class` on the visible root and use named seams for subparts.
- Favor simple data flow, stable identity, bounded work, and one geometry read
  per interaction frame where measurement is required.

Do not leave dead code, compatibility aliases, transitional wrappers, stale
comments, duplicate utilities, or documentation that reveals implementation
iterations. These packages are not constrained by backward compatibility yet.

## Canonical Sources

Read only what the feature needs, but resolve uncertainty from source and tests:

- `AGENTS.md` for repository rules and commands.
- `node_modules/ajo/LLMs.md` for Ajo JSX, components, Context, and cloves.
- `ai/architecture.md` for application and runtime architecture.
- `ai/ui.md` for the implemented UI system and stories harness.
- `ai/LLMs.md` for app-building guidance.
- `readme.md` for the public Ajo Kit framework surface.
- `packages/ajo-cloves/README.md` for the public clove catalog.
- `packages/ajo-ui/README.md` for the unstyled package surface.

When documentation and implementation disagree, inspect public types, source,
tests, and stories. Update the stale document as part of the owning slice.

## Discovery And Baseline

Record only evidence needed to plan the active feature:

- current behavior and the smallest reproduction or motivating example;
- owning packages, public entrypoints, internal engines, and consumers;
- existing tests, stories, docs, and accessibility contracts;
- relevant working-tree changes that must be preserved;
- risks involving controlled state, focus, lifecycle, SSR, forms, direction,
  identity, performance, or top-layer behavior;
- assumptions that need proof before implementation.

Prefer focused source searches and direct tests over broad speculative reading.
Resolve ownership before designing the public interface.

## Implementation Slices

Split the feature into cohesive, independently verifiable outcomes. Order slices
from the deepest reusable dependency toward themed and integration surfaces.

Use this structure for each active slice:

### Slice `<number>`: `<outcome>`

- **Goal:** the behavior completed by this slice.
- **Owner:** the package and module responsible for it.
- **Surface:** public types, exports, slots, attributes, or docs that change.
- **Implementation:** the smallest coherent code path to add or replace.
- **Tests:** focused evidence required for this slice.
- **Cleanup:** obsolete code, aliases, files, comments, and docs to remove.
- **Exit condition:** the observable result required before the next slice.

Keep at most one slice active. If discovery changes ownership or scope, update
the feature definition before widening implementation.

## Commit Strategy

Commits demonstrate incremental feature progress by package or cohesive surface:

1. General behavior and tests in `ajo-cloves`.
2. Unstyled family behavior and tests in `ajo-ui`.
3. Playa adapters, themed composition, and stories in `src/ui`.
4. Integration, documentation, and cleanup that require the completed stack.

Use only the steps the feature actually needs. Each commit must be coherent,
reviewable, and green at its own boundary. Do not mix unrelated user changes or
leave temporary compatibility work for a later cleanup commit.

Commit titles describe the package and outcome. Descriptions explain the public
contract, important ownership decisions, and verification without narrating the
agent's process.

## Verification

Choose focused checks first and expand in proportion to the affected contract:

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

### Verification Matrix

- `ajo-cloves`: focused clove tests, package suite, types, lifecycle, and SSR.
- `ajo-ui`: focused family tests, package suite, types, ARIA, focus, and forms.
- `src/ui`: typecheck, focused unit tests, stories, theme states, and direction.
- Cross-layer behavior: root unit suite and relevant browser stories or e2e.
- Build-facing changes: client build, SSR build, and production smoke.
- Documentation-only changes: stale-reference scan and `git diff --check`.

Run the full integration battery before closing a feature that changes several
layers, public contracts, shared engines, hydration, or production behavior.
Report skipped, blocked, flaky, or noisy gates explicitly.

## Completion And Cleanup

A feature is complete only when:

- every acceptance criterion is observable and tested at the right layer;
- package ownership and dependency direction remain intact;
- public exports, TSDoc, READMEs, technical docs, and stories agree;
- no dead code, obsolete file, stale reference, or transitional API remains;
- performance-sensitive work is bounded and avoids duplicate subscriptions or
  measurements;
- the final diff contains only intended changes;
- verification results and any genuine residual risk are known.

Write durable documentation in present tense. Consolidate decisions into the
canonical reference instead of appending an implementation diary.

## Handoff

Before continuing or handing off, capture only current operational state:

- the active objective and slice;
- completed behavior that the next slice depends on;
- exact files or package seam under work;
- verification already run and its result;
- one concrete next action;
- any real blocker or unresolved decision.

Verify the repository before editing or handing off:

```bash
git status --short
git diff --stat
git log --oneline -5
```

Preserve unrelated work. When the feature is complete and committed, move its
durable contracts into canonical docs and reset the feature-specific fields in
this file rather than preserving a historical ledger.
