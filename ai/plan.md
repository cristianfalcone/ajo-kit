# Active Feature: DataTable v9

## Feature Definition

- **Objective:** replace the private dynamic-table engine with the latest
  TanStack Table v9 beta behind one Ajo-native, feature-scoped model.
- **User-visible outcome:** DataTable keeps native table semantics while search,
  facets, sorting, visibility, selection, and pagination share one atomic row
  model and one small public interface.
- **Owner:** `packages/ajo-ui` owns model, semantics, lifecycle, and rendering;
  `src/ui` owns only Playa recipes and composition.
- **Prerequisite:** VirtualList is complete. Private `virtual.ts` and the shared
  ScrollArea root recipe are available for a later VirtualDataTable sibling.
- **In scope for the first slice:** exact v9 beta pin, current-consumer inventory,
  explicit feature profile, stable row identity, client-side pagination, native
  table markup, public types, SSR, tests, themed adapter, and removal of the old
  engine in the same clean cut.
- **Out of scope until the paginated family is stable:** server mode, remote
  orchestration, VirtualDataTable publication, grid keyboard semantics, column
  resize/reorder/pinning, grouping, aggregation, expansion, and TanStack
  passthroughs.
- **Constraints:** no backward compatibility, aliases, dual pipelines, React
  adapter, public TanStack types, package leakage into `ajo-cloves`, or changes
  to the static `Table` primitive.

Acceptance criteria:

- the exact latest v9 beta is re-resolved immediately before installation;
- only required v9 features are registered and all upstream objects stay
  private;
- every row has an explicit stable key and selection remains key-first;
- state transitions are atomic and lifecycle cleanup is host-owned;
- native table, caption, header, sort, selection, and empty-state semantics are
  preserved;
- the old table engine and obsolete public seams are deleted in the same cut;
- subpath/root tree-shaking, bundle delta, SSR, unit, stories, browser, build,
  and production gates pass.

The complete architecture, research, API candidates, migration inventory, and
phase gates live in `ai/tables.md`. `ai/vlist.md` is the implemented geometry
foundation and remains the source of truth for virtual scrolling.

## Status

- **Stage:** discovery
- **Active slice:** revalidate the latest TanStack Table v9 beta and map every
  current DataTable consumer against the selected final profile.
- **Blockers:** none
- **Next checkpoint:** exact dependency/API evidence plus a failing public
  tracer test for the replacement paginated DataTable contract.

## Implementation Slices

### Slice 1: Exact upstream and consumer contract

- Resolve the current v9 beta, integrity, feature registry, store lifecycle,
  and tree-shaking behavior from primary sources and the installed tarball.
- Inventory every base/Playa export, route consumer, story, test, renderer,
  class seam, and accessibility label in the current family.
- Freeze the smallest public profile in surface type tests before replacing the
  engine.

### Slice 2: Private v9 model

- Add the exact dependency only to `ajo-ui`.
- Build the private model/store adapter with explicit features, live inputs,
  stable row keys, atomic state, coalesced invalidation, SSR-safe setup, and
  abort cleanup.
- Cover row-model and state contracts without asserting incidental upstream
  internals.

### Slice 3: Native renderer and clean replacement

- Share one internal native-table renderer/policy across the family.
- Replace `data-table.tsx`, delete the old engine and obsolete seams, and keep
  TanStack absent from declarations and DOM vocabulary.
- Verify search, per-column facets, single sort, visibility, key-first
  selection, pagination correction, empty state, labels, and form controls.

### Slice 4: Playa and consumers

- Derive the themed adapter from base types and reuse existing primitives and
  recipes rather than reconstructing parts.
- Migrate all local consumers, stories, and docs in the same no-compatibility
  cut.
- Keep static `Table` unchanged.

### Slice 5: Gates and virtualization decision

- Run type, package/full unit, stories, browser/e2e, build, production, bundle,
  and representative data-size benchmarks.
- Compare the table-specific native-spacer prototype against the geometry/AT
  gates in `ai/tables.md` before deciding whether VirtualDataTable ships in
  this feature or remains a later sibling.
- Report physical AT/iOS checks honestly when unavailable.

## Verification

```sh
pnpm exec tsc --noEmit
pnpm --filter ajo-ui test
pnpm test:unit
pnpm stories:test --match data-table --port <free-port>
pnpm test:e2e
pnpm build
pnpm test:prod
git diff --check
```

Before implementation, verify repository identity and preserve unrelated work:

```sh
git status --short
git diff --stat
git log --oneline -5
```
