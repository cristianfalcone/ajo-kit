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

- **Stage:** complete — paginated DataTable cut
- **Active slice:** none. `VirtualDataTable` is a separate, deliberately
  deferred slice rather than a dormant mode in the shipped component.
- **Implemented:** exact v9/store pins, explicit feature profile, private model
  and contract, one native renderer, explicit package exports, Playa slot
  recipe, and migrated local consumers.
- **Green evidence:** dependency installation, typecheck, all 187 `ajo-ui`
  tests, all 577 root unit tests, five DataTable stories, the full browser story
  matrix, 49 e2e tests, production build, production smoke, and package/root
  isolation with a 14,784 B model-profile artifact and a 29,539 B incremental
  public DataTable gzip artifact.
- **Manual evidence not claimed:** physical screen-reader/iOS coverage and a
  formal painted-browser performance harness. The five-run Node diagnostic is
  recorded in `ai/tables.md`; those remaining gates belong to the later
  virtual-table decision and do not publish a partial `VirtualDataTable`.
- **Blockers:** none
- **Next checkpoint:** open `VirtualDataTable` only when its native-table
  geometry, physical AT, browser, and formal performance gates can be executed.

## Implementation Slices

Slices 1 through 5 landed as one clean greenfield cut.

### Slice 1: Exact upstream and consumer contract — implemented

- Resolve the current v9 beta, integrity, feature registry, store lifecycle,
  and tree-shaking behavior from primary sources and the installed tarball.
- Inventory every base/Playa export, route consumer, story, test, renderer,
  class seam, and accessibility label in the current family.
- Freeze the smallest public profile in surface type tests before replacing the
  engine.

### Slice 2: Private v9 model — implemented

- Add the exact dependency only to `ajo-ui`.
- Build the private model/store adapter with explicit features, live inputs,
  stable row keys, atomic state, coalesced invalidation, SSR-safe setup, and
  abort cleanup.
- Cover row-model and state contracts without asserting incidental upstream
  internals.

### Slice 3: Native renderer and clean replacement — implemented

- Keep one native-table renderer and policy inside `data-table.tsx`.
- Replace `data-table.tsx`, delete the old engine and obsolete seams, and keep
  TanStack absent from declarations and DOM vocabulary.
- Verify search, per-column facets, single sort, visibility, key-first
  selection, pagination correction, empty state, labels, and form controls.

### Slice 4: Playa and consumers — implemented

- Derive the themed adapter from base types and reuse existing primitives and
  recipes rather than reconstructing parts.
- Migrate all local consumers, stories, and docs in the same no-compatibility
  cut.
- Keep static `Table` unchanged.

### Slice 5: Gates and virtualization decision — complete for DataTable

- Run type, package/full unit, stories, browser/e2e, build, production, bundle,
  and representative data-size benchmarks.
- Keep VirtualDataTable deferred: its native-spacer comparison and geometry/AT
  gates are not necessary to ship a dormant mode inside paginated DataTable.
- Record the diagnostic runtime measurements and report physical AT/iOS checks
  honestly when unavailable.

## Verification

```sh
pnpm exec tsc --noEmit
pnpm --filter ajo-ui test
pnpm test:unit
pnpm test:perf:data-table
pnpm stories:test --match data-table --port <free-port>
pnpm test:e2e
pnpm build
pnpm test:prod
git diff --check
```

Before each remaining gate or follow-up, verify repository identity and
preserve unrelated work:

```sh
git status --short
git diff --stat
git log --oneline -5
```
