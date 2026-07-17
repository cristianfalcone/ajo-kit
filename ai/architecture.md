# Ajo Kit Architecture

Last updated: 2026-07-16

This is the canonical architecture document for `ajo-kit`. It describes the
current implementation and operating contracts for the framework, app runtime,
data flow, SSR, actions, APIs, auth, security, persistence, build, and tests.
It is factual: no historical phase log, migration story, or future roadmap is
included here.

## Operating Principles

`ajo-kit` is a small full-stack metaframework for Ajo. The implementation is
kept direct and explicit:

- Server loaders own durable application state.
- Components render server data from `args.data`.
- Live data is explicit through `req.track(topic)` and `emit(topic)`.
- Protocol boundaries stay small and stable.
- Public package surface is narrow.
- Security policy is route-owned where possible and credential-aware where
  needed.
- Measurements justify performance changes; speculative architecture is avoided.
- Tests protect behavior, security contracts, and regression boundaries.

Do not reintroduce implicit table tracking, normalized client stores, broad data
framework abstractions, or compatibility fallbacks that are not part of the
current local-project contract.

## Package Boundaries

| Package | Alias | Responsibility |
|---|---|---|
| `packages/ajo-kit` | `@kit`, `@kit/*` | Framework core, SSR, routing, data flow, database, validation, mail, build/runtime CLI |
| `packages/ajo-auth` | `@kit/auth` | Sessions, API tokens, passwords, reset/verify/confirm flows, CSRF, guards, auth migrations |
| `packages/ajo-cloves` | `ajo-cloves` | Reusable Ajo component behavior cloves and lifecycle-bound UI sensors |
| `packages/ajo-ui` | `ajo-ui` | Unstyled base UI components built on cloves; a private transitive implementation for Playa apps |
| `packages/ajo-ui-playa` | `ajo-ui-playa` | Playa runtime family adapters and the build-time UnoCSS preset |
| `packages/ajo-backup` | none | Google Drive backup tooling |

Public app-facing imports and signatures are documented in `readme.md`. This
architecture document only records package boundaries when they affect runtime
design. Internal app runtime, route discovery, and migration helpers are not
public subpaths. The CLI can use those internals directly.

## Core Files

| File | Role |
|---|---|
| `packages/ajo-kit/src/index.ts` | Curated universal root API for `@kit` / `ajo-kit` |
| `packages/ajo-kit/src/server.tsx` | Polka SSR runtime, route wares/loaders/actions/API dispatch, JSON route data, route freshness, SSE fanout, `send`, `emit` |
| `packages/ajo-kit/src/app.tsx` | Client router, route resolution, JSON navigation, route cache use, SSE live updates |
| `packages/ajo-kit/src/client.tsx` | Hydration, SSR boot read, `action()` helper |
| `packages/ajo-kit/src/cache.ts` | Private bounded client route cache helpers |
| `packages/ajo-kit/src/freshness.ts` | Route hashes, topic normalization, topic versions, freshness parsing |
| `packages/ajo-kit/src/head.tsx` | Head merge/render/apply helpers |
| `packages/ajo-kit/src/headers.ts` | Shared defensive response header policy |
| `packages/ajo-kit/src/ssr.ts` | SSR boot payload serialization/parsing and data-script rendering |
| `packages/ajo-kit/src/constants.ts` | Shared public/internal types, errors, request helpers, auth request extensions, formatting |
| `packages/ajo-kit/src/vite.ts` | Vite plugin, virtual route modules, aliases, server-only guard, HMR, native externalization |
| `packages/ajo-kit/src/node.ts` | `kit dev`, `kit build`, `kit start`, HTML template compiler, listener |
| `packages/ajo-kit/src/database.ts` | SQLite connection and Kysely instance |
| `packages/ajo-kit/src/timing.ts` | `AJO_TIMING=1` measurement helpers |
| `packages/ajo-auth/src/wares.ts` | Session/bearer auth and CSRF middleware |
| `packages/ajo-auth/src/guard.ts` | Redirect, auth, ability, confirmation, verified guards |
| `packages/ajo-cloves/src/index.ts` | Public clove root export catalog |
| `packages/ajo-cloves/src/core.ts` | Clove `Host` re-export, `id`, `shared`, and `frame` infrastructure |
| `packages/ajo-ui-playa/src/index.ts` | Build-time root that exports only `playa()` |
| `packages/ajo-ui-playa/src/styles.ts` | UnoCSS preset, Playa theme, preflights, rules, variants, shortcuts, and Lucide collection |

## Shared Component Logic

Shared component code has one dependency direction: `ajo-cloves` -> `ajo-ui`
-> `ajo-ui-playa` -> application. `ajo-cloves` owns reusable Ajo behavior,
`ajo-ui` owns unstyled component interfaces, `ajo-ui-playa` owns the Playa
theme, and the app owns product composition.
`ajo-cloves` owns no anchored or point-referenced floating geometry; that
policy and its runtime dependency belong entirely to `ajo-ui`.
App/UI code imports cloves from `ajo-cloves`; there is no `ajo-kit/cloves`
public subpath. The package exports its root directly to `./src/index.ts` and
has only the `ajo >= 0.1.35` peer dependency.

Package layout:

```text
packages/ajo-cloves/src/
  index.ts      # public root exports
  core.ts       # shared protocol/lifecycle/data utilities; source-internal on()/live()
  <name>.ts     # one clove per file
```

The root selectively exports the general primitives in `core.ts`: `Host`,
`browser`, `dom`, `listen`, `statefulRootAttrs`, `callHandler`, `callRef`,
`clamp`, `remember`, `id`, `shared`, and `frame`. Arbitrary-target `on()` and
the live-target harness remain package-source implementation details.

`ajo-ui` is the standalone package for unstyled base components built on
cloves. Its explicit export map exposes one module per public component family
(`ajo-ui/<name>`), a root barrel, and normalization/composition helpers through
`ajo-ui/utils`. `OmitArg` and `FixedArgs` live only in that utils subpath; they
are not root or `ajo-cloves` exports.

`packages/ajo-ui/src/position.ts` (the sole Floating UI Adapter and profile
policy table), `packages/ajo-ui/src/popup.ts` (semantic popup state and
lifecycle), `packages/ajo-ui/src/native.ts` (the native Popover capability
boundary), `packages/ajo-ui/src/menu-cluster.ts` (private menu composition,
invocation, collection, and branch seams),
`packages/ajo-ui/src/collection.ts` (the general item protocol),
`packages/ajo-ui/src/bar.ts` (the open-value/roving/typeahead machine),
`packages/ajo-ui/src/segments.ts` (localized editable date/time segments), and
`packages/ajo-ui/src/availability.ts` are deliberate internal engines.

Top-level `data-table-contract.ts` and `data-table-model.ts` are also private.
There is no wildcard export, so none of these modules has a public subpath.
The Playa DataTable recipe projects the same named Menu and Select Uno
shortcuts consumed by those direct themed adapters; composed controls do not
maintain a second visual recipe.

`ajo-ui-playa` declares `ajo-ui` as a regular dependency, so consuming apps do
not install or import the unstyled base. The package root exposes only
`playa()`, its build-time UnoCSS preset. Runtime components resolve through
explicit `ajo-ui-playa/<family>` subpaths; there is no runtime root barrel or
wildcard export. `ajo` and exact UnoCSS `66.7.2` are peers.

The preset owns Wind4, the Lucide collection, Playa theme tokens, preflights,
rules, variants, and component shortcuts. It has no product safelist or
product-specific shortcut. Applications keep product-only shortcuts and icon
tokens in their own UnoCSS config, adding an app-owned safelist only for icon
names assembled dynamically.

### Environment Gates

`browser()` in `ajo-cloves` requires both `window` and `document`, so Node,
workers, and asymmetric shims remain inert. `dom(host)` answers a different
question: whether a particular stateful host is a real element. Stateful DOM
work uses `dom` even when browser globals exist, because ajo/html protocol hosts may run
inside a DOM-backed test realm. Capability-specific checks remain local; for
example, InputDate intentionally reads `<html lang>` when document alone exists
and never falls back to navigator.

### Shared Sources

Shared document/window/observer sources use `shared(key, start, fn, signal)`.
The key is a string namespace for one real source. The first subscriber starts
the source, callbacks live in a `Set`, each subscriber is removed through its
AbortSignal, and the source stop function runs when the last subscriber leaves.

`frame(fn)` wraps high-frequency work so repeated calls collapse into one
`requestAnimationFrame` callback per subscriber. `resize` adds one more layer:
it owns a module-level `ResizeObserver`, a `WeakMap<Element, Set<Callback>>`
registry, and a subscription counter. Elements are unobserved when their last
callback leaves, and the observer disconnects when the counter returns to zero.

The source-internal `live(host, { target, onChange, bind })` owns the shared
leak-proof retarget machine used by scrolling and resize: it captures the
original host signal, gives each target an abort scope and guarded notify,
coalesces initial/source changes through one frame, and cancels old work on
same/null/retarget/reset transitions. Binding is the only adapter seam. A
partial bind rolls back its listener and queued frame before rethrowing, so the
same target can retry. Callers retain their SSR/capability guards; `live` is not
part of the package root API.

ResizeObserver registry entries are published only after `observe()` succeeds.
A failed first observe releases an otherwise-unused observer, and notifications
are accepted only from the current observer generation; this prevents a queued
callback from a disconnected instance reaching a later subscription for the
same element.

High-frequency source callbacks invalidate a stateful subtree only when their
measurement changes observable component state. Carousel snapshots selection,
item count, and both scrollability flags on scroll/resize, then re-renders only
when one changes. Explicit reinitialization and target replacement remain
unconditional lifecycle boundaries; public events are emitted from the same
state transition after the invalidation decision has been captured.

`timer(host)` is a host-owned one-shot with restart, stop, pause, and resume.
It captures the exact lifecycle signal it subscribes to: abort clears pending
work, and an old view cannot restart after teardown or a host reset. Resuming a
paused task whose deadline already elapsed schedules it at zero delay rather
than retaining a permanently paused callback. `running` and `remaining` expose
the current timer state without making the timer reactive by itself.

### Attr Bags

When a clove needs to wire several attributes and handlers to rendered elements,
the view exposes attr bags for JSX spread. Bags contain plain HTML attributes
(`role`, `aria-*`, `tabindex`, `id`, `data-*`) plus Ajo `set:on*` handlers.
Plain attributes render during SSR; `set:*` handlers attach on the client.
Events should use bags when they target rendered children, because keyed
reconciliation can reuse those children while a bag is re-applied each render.

### State Attributes

`data-state` names a family state only when it is a real styling or composition
contract. Calendar navigation uses native `disabled` plus `aria-disabled`, and
day cells expose the boolean `data-selected` flag. Calendar day buttons retain
`selected/unselected` as their whole-selection state; InputDate uses the
selected button when choosing its open-autofocus target.

Desktop Sidebar uses `expanded/collapsed`: an icon-collapsed sidebar is still
open, so this state is intentionally distinct from the mobile Drawer branch's
`open/closed` vocabulary.

### DOM Identity

Component values that mint DOM ids preserve exact string identity with
`encodeURIComponent`; they are never slugged or normalized. Tabs, Select, and
Command therefore keep punctuation, case, and non-Latin values distinct while
producing deterministic SSR/client ids. Each family adds its own root and part
prefix around that encoded segment. Chart follows the same rule when deriving
its internal style/ARIA identity from a caller DOM id; a caller-supplied
`chartId` remains an exact resolved override, and the no-id fallback is minted
once in the stateful root's setup phase.

### Context Surface

Component contexts stay module-private unless another family, the themed layer,
or a public consumer genuinely needs their view. CheckboxGroup and RadioGroup
keep their contexts private. ToggleGroup exports its context because the themed
item consumes its variant, size, spacing, and orientation; Collapsible, Menu,
and Field have equivalent cross-family composers. The root wildcard barrel
inherits those module decisions rather than maintaining a second export list.

Context writes belong to Stateful components. Stateless components may read a
context, but a setter there would write through the currently active Stateful
ancestor and can leak after the Stateless subtree is removed. DirectionProvider
is the canonical adapter: its public Stateless wrapper forwards ordinary DOM
attrs, while a private Stateful root writes the dynamic direction inside its
render loop. Nesting, sibling traversal, and provider removal therefore restore
the parent context rather than mutating it.

A Stateless part may invoke a registration callback exposed by its Stateful
owner, but that does not transfer mutable context ownership and must not become
a context setter.

Public context seams expose their exact `*Context` instance. The Playa layer
re-exports that same instance when its consumers need it; it does not wrap
context reads in React-shaped `use*` helpers.

Carousel and MessageScroller keep DOM-part registration in private sibling
contexts. Their public contexts expose only observable state and controls;
MessageScroller `setApi` receives that same public controller object.

Chart keeps its full context private and exposes only `ChartIdContext` because
the themed wrapper genuinely consumes the resolved identity. Its private
`ChartStyle` is inserted as a direct child marker and scopes variables with
`[data-slot="chart"]:has(>style[data-chart-style])`. This lets the identity be
owned by stateful setup in both SSR and the browser without a provisional
`data-chart` write on the host; the direct-child selector also isolates nested
charts. Neither the marker component nor root `data-chart` is part of the
themed public surface.

### Themed Modal Surfaces

`packages/ajo-ui-playa/src/modal.tsx` is an internal theme-token module. The
other cross-family recipes live in `packages/ajo-ui-playa/src/internal/recipes.tsx`.
Neither path is present in the package export map. The modal seam owns the
fixed surface, inset centering, enter animation, closed gate, and icon
close-button recipes. Dialog and Command compose the full centered cluster;
Drawer composes only surface/closed/close and owns side geometry plus discrete
motion. AlertDialog composes the themed
Dialog content and description, then fixes its alert role, size selectors,
outside-dismiss policy, and absence of an implicit close button. Command's
sizing/padding and Dialog's grid/padding stay local family deltas. The tokens
have no public subpath.

### Themed Input-Group Chrome

`packages/ajo-ui-playa/src/internal/recipes.tsx` owns the shared root,
addon/alignment, and native-input recipes used by the public InputGroup family,
SelectInput, and the InputDate/Time families.
`inputGroupVariants` defaults to `width: 'full'` and emits `w-full` exactly
once. `width: 'auto'` emits no width utility: CSS already defaults to auto, and
this leaves a caller-supplied width as the sole owner rather than competing
with `w-auto`. Select keeps button chrome local; InputDate keeps its disabled
pointer/opacity delta local. Shared selectors that cannot match a particular
family remain inert instead of becoming new option axes. The composition
tokens are direct private imports and intentionally have no package subpath.

### Themed Choice Controls

`packages/ajo-ui-playa/src/internal/recipes.tsx` owns Checkbox's shared
box/state/indicator recipes plus the invisible native input overlay and the
horizontal/vertical group layout. CheckboxGroup composes the complete
Checkbox cluster; RadioGroup keeps its circular item/dot and consumes only the
overlay/layout; Switch keeps its track/thumb and consumes only the overlay.
Every decorative indicator above an overlay is pointer-inert, so the native
input owns the whole visual hit area. These tokens are package-private; public
family types remain independent.

Checkbox and RadioGroup share live native-state mirroring through
`ajo-ui/utils`. The input owns `data-state` plus `aria-checked`; its visual
companion receives only `data-state`. Indeterminate/mixed applies only to
checkbox inputs, while radios remain checked/unchecked even if their DOM
`indeterminate` property is set. Each family retains its own timing and target
orchestration: Checkbox syncs its root after refs/input/change, and RadioGroup
sweeps every native input so the sibling silently unchecked by the browser is
also reconciled. SSR uses the same pure ARIA mapper but stays declarative and
performs no live DOM synchronization.

### Themed Adapter Contracts

Stateful components use Ajo's configured default host without spelling the
current `div` default twice: `Stateful<Args>` and no `.is`. The tag generic plus
`.is` are reserved for real non-default hosts such as `details`, `fieldset`,
`nav`, `li`, `span`, and `button`. Consequently default-host roots deliberately
follow `ajo.defaults.tag` / `ajo/html.defaults.tag`; the two renderer defaults
must be configured consistently. A public Stateless adapter maps plain DOM
attrs through `statefulRootAttrs` from `ajo-cloves` when a Stateful root owns
behavior.

Field and DataTable are canonical examples of that adapter seam. Their Stateful
owners stay private; public Stateless roots separate behavior from DOM attrs
and stamp the family slot on the actual host.

DataTable owns its complete native child structure and exposes stable slots,
not structural callbacks or a base class map. Its generic types keep rows,
columns, keys, and callbacks correlated across the base and Playa adapters.

Playa adds only `playa-data-table` plus the shared `playa-table` slot recipe
(the same one the manual Table wrapper carries); Uno styles descendants
through those slots.
The model binds `@tanstack/table-core@9.0.0-beta.47` and
`@tanstack/store@0.11.0` through an explicit paginated profile. Model and
contract stay hidden by the package export map.

`ajo-ui-playa` family modules derive their public args from the corresponding
private `ajo-ui` types. Use a direct alias when the adapter adds nothing, an
intersection for real theme additions or the theme's `class?: string`
contract, and `OmitArg` only when the adapter fixes or replaces a base
implementation knob. A fixed knob also receives `FixedArgs<Key>`; both helpers
come only from `ajo-ui/utils`, never the package root or `ajo-cloves`.
`OmitArg` preserves named types across Ajo's open Args index, while `FixedArgs`
prevents the removed name from returning as `unknown`. Replaced knobs keep the
theme's explicit type instead. Do not copy host props or re-declare a base
discriminated union: the base remains the behavioral source of truth.

`class` always styles the visible component root. A static singleton part uses
a named `xxxClass` hook; themed InputOTP is the canonical two-surface example,
with `class` on the visible slot container and `inputClass` on the hidden
native input. A themed collection uses its scoped `classNames` or `classes`
map, while state-dependent styling uses a callback such as `dayClassName`.
Part slots follow the component vocabulary (`empty-media`, `item-media`,
`attachment-media`, ...), with no legacy dual names.

Polymorphic theme-only components use a discriminated union per rendered tag.
Required semantic props belong to that branch (for example, Marker anchors
require `href`), and refs/events stay contextual to the selected element.

Public theme composition helpers use the `xxxVariants` suffix. Export them from
the owning `ajo-ui-playa/<family>` subpath when app consumers are expected to
compose another component into that visual slot. Helpers shared only between
themed siblings remain package-private; `scrollAreaVariants` is the canonical
internal example.

### Floating Stack

`ajo-ui` pins exact `@floating-ui/dom@1.8.0` and owns all anchored and
point-referenced floating geometry. `packages/ajo-ui/src/position.ts` is the
only package-source importer and the private Adapter boundary; `ajo-cloves`
supplies general state, intent, dismissal, measurement, and host-lifecycle
primitives but exposes no floating geometry API.

The Adapter accepts real DOM or virtual references. Its zero-area
`pointReference()` retains a live `contextElement` for point-positioned
families. One policy table selects the defaults for `popover`, `tooltip`,
`menu`, `submenu`, `select`, `date`, `navigation`, `context`, `menubar`, and
`chart`; callers may select a supported placement or gap, but do not receive a
raw Floating UI pass-through. Each profile composes the applicable official
`inline`, `offset`, `flip` or `autoPlacement`, `shift` with `limitShift`,
`size`, `arrow`, and `hide` middleware.

`position()` exposes only `start()`, coalesced `update()`, and `stop()`.
`autoUpdate()` exists only for the active reference/floating tuple and uses its
observer/event lifecycle rather than animation-frame polling. Host abort,
retargeting, and stop dispose that scope; disconnected elements cannot commit.
Generation and request guards reject stale asynchronous measurements and
commits. `dom(host)` returns an inert view for protocol-only SSR hosts before
element suppliers or ambient DOM capability reads. DOM services and DPR are
derived from each element's `ownerDocument.defaultView`, preserving same-origin
cross-realm behavior.

Popup profiles write fixed `left`/`top`, final `data-placement`, `data-side`,
and `data-align`, transform origin, optional arrow coordinates, and
`--reference-*` / `--available-*` CSS variables. Size-aware profiles apply the
available width as `max-width`; popup profiles also apply `max-height`, while
Tooltip preserves caller height. This leaves author transforms free for themed
motion. Chart consumes `position()` directly with an absolute, DPR-rounded
transform writer and enables `will-change` only while active. The first Chart
commit snaps before the Adapter stamps `data-positioned`; Playa uses that seam
to transition later transforms for users who allow motion, while the Adapter
continues to commit current endpoints without smoothing or an animation loop.
A tuple replacement clears Adapter-owned output from the previous floating and
arrow elements; stop invalidates work and removes Chart's motion stamp,
transient transform, and `will-change` output.

`packages/ajo-ui/src/popup.ts` sits above geometry and owns controlled open
state, ids and ARIA seams, trigger/content/reference and owned arrow registration, hover
intent, dismissal, reference-hidden policy, and post-position focus hooks. A
real trigger or invoker remains the native Popover `source` even when geometry
uses a virtual reference. Content opens concealed, waits for a current first
geometry commit, then reveals and runs its focus hook; source or reference
retargeting restarts that sequence without accepting stale work. An owned arrow resize
also restarts positioning. `packages/ajo-ui/src/native.ts` is the narrow
capability boundary for opening, closing, and querying the native Popover API.
`popupStyle()` applies the UA `[popover]` reset (`inset:auto;margin:0`) exactly
once per family.

Popover, Tooltip, Menu and its composing families, Select, InputDate, and
NavigationMenu consume `popup()`; Chart is the only direct component consumer
of `position()`. Item discovery/highlight for menus, select, and command goes
through `packages/ajo-ui/src/collection.ts` (`data-item="<kind>"` protocol);
slot re-exports go through `withSlot` from `ajo-ui/utils`.

Select is one family for single, multiple, searchable, editable, chips, and
tagging by composition. The field part (SelectTrigger, SelectInput, or
SelectChips) decides the focus model. The `controlled` clove distinguishes
`undefined` from controlled-empty `null`. See `ai/ui.md` for the full contract.

Accordion, CheckboxGroup, and ToggleGroup share runtime multi-value
normalization through `strings` in `ajo-ui/utils`: only arrays are accepted and
each present value is copied through `String`. Mode selection, single-value
policy, and nullish controlled/uncontrolled gates remain family-owned outside
the helper. Story-control normalization stays consumer-owned rather than
reaching into the base package's component-system helpers.

Filterable-list policy shared by Command and Select lives beside the other
component-system helpers in `ajo-ui/utils`. It owns the English
result-count default and resolves
filter modes as `undefined` (the family fallback), `null` (unfiltered/external
ownership), or a custom predicate. `collection(kind).sweep()` derives its
empty, group, and separator slots from the kind unless a caller overrides an
individual selector. It reconciles groups before measuring rendered items, so
clearing a filter and dynamically force-mounting a group restore visibility in
the same sweep; empty state and separator topology then use that fresh set.

DataTable filtering belongs to its private TanStack feature profile instead of
the collection protocol. The paginated profile is exact and explicit;
`VirtualDataTable` remains deferred until its separate gates pass.

The menu families share deliberate private seams in
`packages/ajo-ui/src/menu-cluster.ts`; `MenuContext`, collection/focus helpers,
composition contexts, invocation controllers, and branch clusters are not a
public substrate. ContextMenu gives one descendant Menu a stable virtual point
reference, the real invoker as native source, and focus restoration. Menubar
gives one descendant Menu its profile and a one-shot focus acknowledgement;
`bar()` owns its value, roving focus, typeahead, and semantic open-value follow
policy. Menu submenus select the `submenu` profile and use their direct parent
surface only as the reference-hidden clipping boundary.

NavigationMenu owns a `navigation` popup per item, positioned from that item's
active trigger/content pair, while its root `bar()` coordinates hover, focus,
keyboard transfer, and the single open value; it exposes no shared Viewport or
Indicator. `PopoverContent` enables its owned arrow with `arrow`, while
`TooltipContent` always enables one; no arrow component or arrow props type is
public. Both content families render sibling internal `popup-surface` and
`popup-arrow` slots. The latter is a transparent measurement marker registered
through `popup()`; Floating UI's `arrow` middleware computes its coordinates,
and the Adapter commits those coordinates, `--popup-arrow-center`, and the
transform origin derived from final placement. The surface is the only painted
geometry and extends toward that center, so its border and caret are one shape.
Toolbar (APG pattern) rounds out the bar trio; the toast viewport rides the raw
`popover="manual"` primitive with epoch-gated re-promotion above later modals;
sidebar's mobile branch composes Drawer.
Shared themed popup and menu tokens live in
`packages/ajo-ui-playa/src/internal/recipes.tsx`. `popupAnimation` owns the
common fade/zoom state chain; `popupSlide` is a separate opt-in placement
suffix so Select can retain its no-slide variant while Popover, Tooltip, and
InputDate compose it. Family geometry, spacing, radius, and surface colors
remain local. The recipes module deliberately uses `.tsx`: UnoCSS extracts its
private class literals as family modules enter the application graph; plain
`.ts` is outside the default extraction set.

The position/popup stack remains private to `ajo-ui`: its profiles and commit
sequencing are component-system policy, while `ajo-cloves` remains independent
of `@floating-ui/dom` and owns no floating geometry.

### Intl Formatting

Intl policy stays inside `ajo-ui`: it is pure in-process formatting, not a host
lifecycle concern for `ajo-cloves`, and `ajo-ui-playa` only forwards formatter
options. Calendar caches its six named display formats by locale and
its zoned date-parts formatter by time zone. Chart creates its host-locale
default NumberFormat lazily; supplying `formatValue` bypasses it completely.
The InputDate segment engine owns localized unit labels, name matching, and
committed-value formatting, keyed by every option that changes their output.

Keyed Intl caches use the general `remember()` primitive from `ajo-cloves`.
The Intl cache keys and ownership stay private to `ajo-ui`; `remember` only
provides insertion-ordered FIFO bounding (32 entries by default, configurable
and validated). This prevents arbitrary locale extensions from growing
long-lived SSR memory without bound. Intl instances are
stateless and safe to share across concurrent renders; SSR and browser realms
still own separate module caches.

### Calendar and Date-Field System

Calendar and the InputDate family are one behavioral system across two
`ajo-ui` modules and two internal pure engines:

- `availability.ts` owns `CalendarMatcher`, `AvailabilityMatcher`, time
  windows, and `compile()`. A compiled policy exposes day-, instant-,
  serialized-value-, and exclusive-interior range checks. Matcher objects are
  AND expressions; top-level arrays are OR alternatives. Calendar caches by
  matcher identity plus time zone, and InputDate caches by matcher identity.
- `calendar.tsx` owns day/month/year presentation and selection. One
  `controlled<CalendarView>` and one `grid` clove serve all three scales.
  `minView` decides whether a month/year cell drills down or commits; public
  month ranges emit first-of-start-month through last-of-end-month, and year
  ranges emit Jan 1 through Dec 31.
- `segments.ts` owns the ISO editing record and reason-coded validation. An
  InputDate family root has exactly one `FieldView` per range side.
  `InputDateTimeField` renders `timeRun()` from that same record inside the
  popup; it does not create another editor or a staged value.
- `input-date.tsx` is the composition boundary. It separates the outer field
  and popup into rendered focus surfaces, namespaces their segment ids, and
  lets both surfaces share host-level typing/spin listeners. Mounted time
  surfaces register by element identity, so a day pick defaults to staying
  open only while at least one such surface actually exists.

`disabled` and `unavailable` are intentionally different channels.
`disabled` is a native hard block and is skipped by focus and selection.
`unavailable` is announced and styled but remains selectable; the committed
value then receives `{ code: 'unavailable' }`. A range that crosses an
unavailable interior receives consumer-raised `unavailableRange` on both
sides. `allowNonContiguous` suppresses that reason and removes unavailable
interior cells from the selected range band without splitting the emitted
value. `InputDateCalendar` seals these root-owned policy and selection knobs;
its object args may customize Calendar presentation and hard-disabled rules,
but cannot create a competing availability source.

This logic remains in `ajo-ui`: it is component-domain policy with one
consuming package, not a general host/lifecycle primitive. `ajo-cloves` owns
only the reusable `controlled`, `grid`, `roving`, `spin`, cache, DOM, and
callback/ref mechanics. `ajo-ui-playa` supplies classes, component icons,
dropdown adapters, and popup layout only.

### Message Scroller Geometry

MessageScroller keeps DOM discovery in document order, because prepended rows
make registry insertion order differ from visual order. Each synchronized scroll
sample performs one item query, one viewport rectangle read, and one rectangle
read per item. It derives visible ids, the current semantic anchor, and the
prepend-preservation anchor from that single snapshot. Edge and item geometry
is read before the visibility, scrollability, and button commits. The shared
`overflow` clove separately owns the viewport's public `data-overflow-y` state
and refreshes it on scroll, viewport resize, provider render/retarget, and
content mutation; the theme's shared preflight turns that one attribute into
the fitting/start/end/both edge mask. The clove removes both axis attributes
when its target changes, becomes null, or its host aborts, so a detached or
reused old target cannot retain a stale global mask.

Prepend preservation is a small transaction rather than a one-frame sample.
The first intersecting row remains the preservation anchor across the mutation
and resize settle burst caused by `content-visibility`; an actual or imperative
scroll clears it before a new row can be captured. Enabling
`preserveScrollOnPrepend` and prepending in the same provider update captures
the old geometry before yielding the new children. This keeps the visible row
stable without moving discovery into `ajo-cloves`: the behavior is specific to
the MessageScroller family, while frame, scrolling, and resize lifecycles remain
clove-owned. Its transient imperative-scroll marker composes `timer(this)` for
the no-`scrollend` fallback, so restart and host cleanup follow the same public
clove contract as hover and typeahead.

## Build and Runtime

### Vite Plugin

`kit()` provides the app integration:

- `virtual:ajo/routes` exposes `import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}')`.
- `virtual:ajo/handlers` exposes handler and ware globs.
- `@kit` and `@kit/*` resolve to `ajo-kit` public subpaths.
- Plugin aliases from discovered packages map `@kit/<alias>` roots and subpaths to package names.
- Server-only modules are blocked from the client graph.
- Page/layout modules receive Ajo HMR metadata in dev.
- Native modules such as `better-sqlite3` and `argon2` are externalized as
  `file://` URLs so production SSR bundles run on Windows ESM.

Default `guard` patterns include:

- route `handler` and `wares` files
- discovered plugin packages marked `serverOnly`

Custom `guard` patterns are additive, not replacements. Directory conventions
such as `/src/data/` are app decisions; this app guards `/src/data/` through
`kit({ guard: [...] })` in `vite.config.ts`. Modules named
`*.client.{js,ts,jsx,tsx}` are explicitly client-safe and bypass all guard
patterns; their own imports are still checked, so a `serverOnly` package can
expose an isomorphic module (for example `ajo-auth/ability`) without opening
the rest of the package to the client graph.

### CLI Runtime

`kit dev`:

- Creates a Polka app.
- Runs Vite in middleware mode.
- Loads the SSR server through `vite.ssrLoadModule('ajo-kit/server')`.
- Compiles the HTML template and proxies requests to the current inner server.
- Reloads server routes on handler/wares/page/layout change, add, or unlink.
- Sends full reload for page/layout changes.

`kit build`:

- Builds `dist/client` with Vite.
- Builds `dist/server/server.js` using `ajo-kit/server` as the SSR entry.

`kit start`:

- Loads `dist/server/server.js` with a `file://` URL.
- Reads `dist/client/index.html`.
- Compiles SSR slots.
- Serves static client assets through `sirv`.
- Applies shared defensive headers to static client assets.
- Proxies dynamic requests to the built server.

`listen(app, port, { strict })` starts an HTTP server. In normal mode it tries
the next port on `EADDRINUSE`; in strict mode it rejects so e2e startup is
deterministic.

`ajo-kit/server` is the SSR runtime entry for the kit CLI/Vite build and the
server-only helper module for route handlers. App code imports `send` and
`emit` from `@kit/server`; `create()` is the runtime factory used by
`ajo-kit/node`.

### HTML Template

The HTML template uses slot comments:

```html
<!-- ssr:head -->
<!-- ssr:data -->
<!-- ssr:root -->
```

`compile(html)` splits on those markers and replaces missing slots with an empty
string. The default template includes a non-executable SSR data slot and a
client module script for `/src/client`.

## Routing Model

Routes are filesystem based:

- `page.tsx`: Ajo UI component.
- `layout.tsx`: nested layout component.
- `handler.ts`: server data loaders, actions, head loaders, and API handlers.
- `wares.ts`: middleware for a route subtree.

Examples:

- `src/(app)/dashboard/page.tsx` maps to `/dashboard`.
- `src/(app)/account/profile/page.tsx` maps to `/account/profile`.
- `src/(public)/reset/[token]/page.tsx` maps to `/reset/:token`.

Route groups such as `(app)` do not appear in URLs. Dynamic segments use
`[id]`; splats use `[...]`.

Handler exports:

```ts
export async function layout(req: Request, parent: Parent) {}
export async function page(req: Request, parent: Parent) {}
export async function head(req: Request, parent: Parent) {}
export const actions = { name: async (req, res) => {} }
export default { get, post, put, patch, delete, options, head }
```

Page and layout UI modules can export `pending = true`. During client
navigation, the page receives `loading=true` first; otherwise the innermost
pending layout receives it. This only controls loading UI ownership, not loader
execution or fetch timing.

`default` method handlers are mounted under `/api/<route>`. Page GET routes run
route middleware and loaders, but do not run the JSON body parser. Page POST
actions and API handlers run the JSON parser.

Ancestor route wares are collected for both page routes and API routes. This is
the authorization boundary for route subtrees. Keep subtree-specific checks in
`wares.ts` so loaders, actions, and API handlers share the same boundary.

## Loader Execution and Parent Data

The server executes layout loaders and the page loader through a small deferred
parent chain. This preserves parallel loader execution while allowing a child
loader to await `parent()` when it needs merged ancestor data.

Rules:

- Layouts own cross-route data.
- Pages return route-specific data.
- Use `parent()` only where it removes real duplicate reads or payload fields.
- Do not serialize duplicated user/account data just because it is convenient.

Current ownership:

- Root layout owns shell concerns.
- `(app)` layout owns authenticated user snapshot, roles, abilities, and mutable
  profile shell fields.
- Dashboard and profile reuse app-layout user data through `parent()`.
- Admin and account list pages keep bounded route-specific data.

`head()` loaders return the compact `Head` contract:

```ts
type Head = {
  title?: string
  meta?: Meta[]
  link?: Link[]
}
```

`description` and `canonical` are represented as regular `meta` and `link`
entries instead of derived fields.

## SSR and Hydration

### SSR Request

SSR runs route wares and loaders, resolves the Ajo component tree, renders HTML,
and embeds one initial route state in a data script:

```html
<script type="application/json" id="__SSR__">...</script>
```

The boot state contains:

- `url`
- `params`
- `data`
- `head`
- `hash`
- `topics`
- `versions`
- serialized error data when rendering an error route

The client reads this script during boot, parses it, stores it as the initial
route state, and renders without refetching the same route.

### Serialization Boundary

Only SSR boot data uses `devalue.stringify` and `devalue.parse` through
`packages/ajo-kit/src/ssr.ts`. This protects the script-tag boundary from values
such as `</script>` while still supporting values JSON cannot represent.

Route JSON, actions, SSE payloads, and public API responses remain plain JSON.
Handlers should keep those transport values JSON-compatible.

### Headers

Dynamic route HTML and JSON use:

- `Cache-Control: no-store`
- `Vary: Accept, Cookie`
- correct `Content-Type`

Global defensive headers are applied before route handling:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Content-Security-Policy: frame-ancestors 'none'`
- `Strict-Transport-Security` only in production when `APP_URL` is HTTPS

`kit start` applies the same defensive header policy to static client assets
served from `dist/client`.

HTML SSR does not use route-data `304`. JSON route-data requests can return
`304` with cache/freshness headers.

## Client Runtime

The client runtime uses `navaid` for routing and Ajo generator components for
stateful UI.
After hydration/boot, it marks `html[data-ajo-ready="true"]` so e2e automation
can wait for the app runtime without guessing network timing.

Navigation flow:

1. The router picks a page config from discovered pages.
2. `resolve()` loads the page/layout modules and yields a loading state when
   needed.
3. The client requests route JSON unless SSR initial state or server-side render
   data is already available.
4. Successful state updates `head`, route cache metadata, and active state.
5. The composed component tree renders from mutable route state.

The active route can be refreshed without a full navigation. SSE and action
fallback mutate the active state and call `this.next()` so the existing composed
route renders from current data.

HMR stores updated modules in `globalThis.__MODULES__`, clears Ajo generator and
memo state for affected DOM subtrees, and reruns the router.

## Route Data and Freshness

`ajo-kit` uses server-owned route data and explicit topic freshness.

A successful SSR or JSON route response includes:

- `head`
- `data`
- `hash`
- `topics`
- `versions`

JSON navigation sends:

- `Accept: application/json`
- `X-Have: <hash>` when the URL is cached
- `X-Ajo-Versions: {...}` when the URL has topic version metadata
- `credentials: include`
- `cache: no-store`

Server responses:

- `200` and `X-Ajo-Cache: miss` when loaders ran and data changed or was not
  cached by the client.
- `304` and `X-Ajo-Cache: fresh` before loaders when the client's topic
  versions prove the cached route is current.
- `304` and `X-Ajo-Cache: revalidated` after loaders when topic versions were
  stale but the recomputed route hash matches.

Route hashes are derived from `{ head, data }`. Topic versions are in-memory per
server process and incremented by `emit()`.

Wares and auth run before early `304`, so loader work is skipped only after the
route security boundary has passed.

## Client Route Cache

The route cache is private to `packages/ajo-kit/src/cache.ts` and accessed only
through helpers.

Policy:

- URL-keyed state cache.
- Max entries: 50.
- TTL: 5 minutes.
- Topic invalidation removes only intersecting routes.
- Invalidation without topics clears the cache.
- The active URL is protected from eviction during `set` pruning.

The cache is not a normalized store. Components render from active route state,
not from long-lived client mirrors.

## Live Updates

### Tracking

A loader opts into live updates by tracking every topic it reads:

```ts
export async function page(req: Request) {
  req.track?.('admin:users')
  return { users: await listUsers() }
}
```

### Emitting

Mutations call `emit(topic | topic[])` after durable writes commit:

```ts
const id = await db().transaction().execute(async trx => {
  return createdId
})

emit(['admin:users', `user:${id}`])
```

`emit()` normalizes topics, increments topic versions, records action-local
emitted topics through `AsyncLocalStorage`, and schedules a debounced SSE
revalidation pass.

### SSE Revalidation

Each live connection stores:

- original request
- auth mode label
- tracked topics
- current route hash
- route revalidation function
- route-ware verification function
- send/close hooks

When topics change, affected connections are filtered by topic intersection and
revalidated with a small concurrency limit.

Before loaders run, the server re-runs the same route wares through a probe
response. Auth middleware clears stale `req.user`, `req.session`, and
`req.token` before validating the current credential. If wares fail, redirect,
throw, or stop before `next()`, the SSE stream closes and private loaders do not
run.

If loaders produce the same route hash, no live payload is sent. If the hash
changes, SSE sends one root route payload:

```json
{
  "data": [head, ...entries],
  "hash": "...",
  "topics": ["..."],
  "versions": { "...": 1 }
}
```

The client writes that payload into active route state, applies head updates,
refreshes active route cache metadata, and re-renders.

SSE uses browser reconnection behavior. Heartbeats are comments. The client does
not parse heartbeat comments or maintain a second raw data document.

## Actions

Route actions are browser/SPAs mutations scoped to the current route:

```ts
export const actions = {
  async name(req: Request) {
    return { ok: true }
  }
}
```

The client uses:

```tsx
import { action } from '@kit/client'

const form = action<{ ok: true }>('name')
```

`action('name')` posts JSON to:

```txt
POST /current/route?/name
```

No name uses the `default` action.

The `action()` helper:

- serializes form data to JSON, preserving repeated field names and known array
  fields
- sends `credentials: include`
- sends `Accept: application/json`
- aborts previous in-flight invocation for the same action state
- exposes `loading`, `data`, `error`, `submit`, `invoke`, and `reset`
- navigates on `{ redirect }`
- dispatches `ajo:action` with returned metadata

JSON action success responses include returned body fields plus emitted
`topics` and current `versions` when topics were emitted. The client invalidates
matching cached URLs. If the action did not redirect and changed topics
intersect the active route topics, the client waits briefly for SSE when open;
if no SSE update lands, it refreshes the active route via JSON.

Actions are cookie-session browser flows. Bearer tokens do not authenticate
route-action URLs.

## API Handlers

`handler.ts` default exports define `/api/*` method handlers:

```ts
export default {
  async get(req: Request, res: Response) {},
  async post(req: Request, res: Response) {},
}
```

Supported keys:

- `get`
- `post`
- `put`
- `patch`
- `delete`
- `options`
- `head`

A file route such as `src/(app)/tokens/handler.ts` maps to `/api/tokens`.
API handlers own their response and should use `send(res, status, payload)` from
`@kit/server`.

API handlers and actions both receive `req.user` after auth middleware, but they
have different credential policy:

- Actions are browser route flows: cookie session plus CSRF.
- `/api/*` supports bearer tokens for external clients.
- If an `/api/*` request has both session cookies and an explicit Bearer token,
  the Bearer credential wins.
- Bearer token requests bypass CSRF because browsers do not attach bearer tokens
  automatically.
- Cookie-auth unsafe requests require CSRF, including `/api/*`.
- Unauthenticated public API requests can skip CSRF and return their intended
  auth/public response.

Protected API methods enforce abilities close to the method they protect.
`ability(...)` and `authorize(...)` require matching account abilities. Bearer
requests must also carry the required abilities on the presented token, so the
effective permission is account grants intersected with token grants.

Abilities are function-level gates. They do not replace object ownership or
field-level authorization; constrain self-owned queries by `req.user.id`, use
explicit selects, and keep admin response objects limited to fields the UI
needs.

Current app ability vocabulary is resource-action based:

- `profile:*`
- `sessions:*`
- `tokens:*`
- `chats:*`
- `admin:*`

Bearer token creation cannot request abilities outside the account grants or,
when the caller is a bearer token, outside the caller token's coverage. A full
access request from a non-admin account expands to that account's grantable
abilities instead of minting literal `*`.

## Auth and Security

### Middleware Stack

Root wares configure auth:

```ts
import { configure, wares } from '@kit/auth'
import { db } from '/src/data'

configure(() => db())

export default [wares.session(), wares.csrf]
```

`session()` clears prior request auth state, then validates:

1. Bearer token only for `/api/*` requests with `Authorization: Bearer ...`.
2. Cookie session for browser requests.

Default user resolution loads `id`, `name`, `email`, `verified`, `roles`, and
compact effective `abilities` from role ability bundles.

Roles are assignment and display labels backed by ability bundles. Application
code authorizes abilities, not role names. The built-in `admin` bundle grants
`["*"]`; the app `user` bundle grants the standard non-admin abilities from
`src/abilities.ts`. Keep role labels for admin/account UI only.

`csrf` allows:

- bearer-token requests
- safe methods: `GET`, `HEAD`, `OPTIONS`
- unauthenticated `/api/*` requests

All other unsafe cookie-auth requests need either same-origin proof or a
double-submit XSRF token. Double-submit tokens are HMAC signed with `APP_SECRET`
and bound to `req.session.id`; naive matching cookie/header values are rejected.

### Cookies and Secret Storage

Session cookies store plaintext random values. The database stores only
`sha256(cookiePlain)` in `sessions.id`. A database-only leak cannot be reused as
a cookie value.

Session validation enforces both absolute expiry and a 30-minute server-side
idle timeout. Expired session rows are deleted during validation. Active
sessions update `last` at most once every 5 minutes, so session/account/admin UI
shows real activity without writing on every request. Background credential
checks such as SSE freshness validate without renewing activity. Session list
and admin/dashboard loaders call `session.prune()` before counting/listing so
expired rows that are no longer presented by a browser cookie do not appear as
active sessions.

API tokens, reset tokens, and invitation tokens are stored hashed. Plaintext API
tokens and invitation tokens are shown or sent only once at creation.

Cookies are exact-parsed by name. Duplicate same-name cookies are rejected. The
session cookie is `HttpOnly`, `SameSite=Lax`, path-scoped, and `Secure` in
production. CSRF cookies are also `Secure` in production.

### Trusted Origin and IP

`origin(req)` behavior:

- If `APP_URL` is set, it must be an `http` or `https` URL, and its origin wins.
- In production, non-local hosts require `APP_URL` and fail closed if missing.
- Local loopback production runs such as `localhost:5173` and `127.0.0.1:5173`
  can use the request host so `kit start` works locally without `APP_URL`.
- Development can fall back to `Host`.
- `X-Forwarded-Proto` is trusted only when `TRUST_PROXY` is enabled.

`ip(req)` uses `remoteAddress` by default. `X-Forwarded-For` is trusted only
when `TRUST_PROXY` is enabled, and then the first valid forwarded IP is used.
Loopback addresses normalize to `localhost` for IP helper purposes.

### Guards

`@kit/auth` reexports guard helpers:

- `redirect(to)`
- `when(condition, middleware, otherwise?)`
- `protect(to?)`
- `guest(to?)`
- `auth()`
- `ability(...required)`
- `confirmed(window?)`
- `verified()`

`redirect()` returns a JSON redirect envelope for AJAX requests and an HTTP 302
for normal page requests.

`confirmed()` checks password-confirmation state for the current credential.
Confirmation stamps are keyed by session hash or bearer token id, not by user
alone. Confirmation cannot be borrowed across sessions or token credentials.
Confirmation state is cleared on logout, password lifecycle changes, session
revocation, token revocation, and account deletion.

The confirm action is rate-limited by credential/IP.

### Credential Lifecycle

Password reset/change are credential boundaries:

- Invalid reset form input does not consume a reset token.
- Successful reset consumes the token in the password update transaction.
- Reset deletes sessions, API tokens, and other reset tokens for the user.
- Password change rotates the current session, deletes other sessions, and
  revokes API tokens.
- Confirmation state is cleared after reset/change/logout and credential
  revocation.

Login paths use dummy password verification where needed so missing users do not
create obvious timing differences.

Email verification signatures are HMAC-SHA256 tokens using `APP_SECRET`.
Development can use the local fallback. Production fails closed before signing
or validating when `APP_SECRET` is missing, shorter than 32 characters, or left
as a sample placeholder; the failure logs a server-side security message and
public responses mask it as a 500.

### Registration Policy And Invitations

User onboarding runs through the registration routes and data module.

The app stores a singleton `registration` row with `signup = 'open' | 'invite'`.
The default migrated state is `open`, preserving public self-service
registration. Public `/register` and `/login` loaders track
`registration:policy`; admin mode changes emit `registration:policy` so public
signup affordances update through normal route freshness.

`/register` enforces the policy server-side before parsing or writing. In
`invite` mode direct public registration fails with `403`; hiding links is only
UI, not the security boundary.

Invitations live in `invitations` and are managed through
`/admin/registration`. Admin reads require the admin subtree `admin:read`
boundary, and mutation actions call `authorize(req, 'admin:write')`. Invite
creation is rate-limited by inviter and invited email, revokes any previous
active invitation for the normalized email in the same transaction, stores only
`sha256(plainToken)`, emails the plaintext accept link once, and emits
`admin:registration` after the durable write.

`/register/[token]` is the accept flow. The loader returns only the invited
email/name when the token is active. The action validates the token again,
rejects existing user emails without consuming the invitation, hashes the
password, then accepts the invitation in the same transaction that creates the
verified user and assigns the standard `user` role. After commit it creates a
session cookie, emits user/session/admin topics plus `admin:registration`, and
redirects to `/dashboard`. Accepted, revoked, expired, missing, or reused
invites fail closed.

### Error Responses and Logging

`Failure` carries an HTTP status and public message. The JSON body parser is
wrapped so parser bugs or oversized bodies cannot call the route continuation
twice. `normalize()` preserves safe 400-599 statuses from middleware errors such
as JSON parser failures, so malformed JSON returns `422` and over-limit JSON
returns `413` instead of a server error. In production, 500+ messages serialize as
`Internal Server Error`. 4xx validation/auth/body messages stay public.
Development keeps detailed messages and stack where available.

Server `onError` logs non-`Failure` failures only after normalization and only
for 500+ responses. Production `APP_URL` misconfiguration logs server-side
before throwing a masked 500. SSE credential revalidation closures are logged
with reason, path, and auth mode.

## Database and Persistence

The app uses SQLite through `better-sqlite3` and Kysely.

The first supported production topology is a single `kit start` Node process
with one SQLite database file on persistent local disk. The following state is
process-local:

- topic versions in `freshness.ts`
- active SSE connections and pending fanout queues in `server.tsx`
- `ajo-auth` rate-limit buckets
- password confirmation stamps
- configured mail transport

This means multi-process or multi-instance deployments are not coherent by
default. A load-balanced deployment needs a shared topic bus, shared rate-limit
store, and explicit deployment semantics before it can be supported. Reverse
proxies and process managers are fine when they keep a single app process.

Runtime pragmas are set on connection:

- WAL journal mode
- foreign keys enabled
- busy timeout: 5000 ms
- `synchronous = NORMAL`

`kit migrate` combines app migrations from `db/migrations` with plugin
migrations discovered from installed `ajo-*` packages. Migration names are
global because Kysely orders and records migrations by name. Duplicate names
fail while collecting migrations, before any migration executes.

Use Kysely with explicit selected columns. Avoid `selectAll()` unless the full
row is needed.

Admin list pages are bounded through `src/data/pagination.ts`:

- page and size parsed from query params
- size bounded by a maximum
- queries request `limit + 1`
- `rows()` trims the extra row
- `info()` exposes prev/next links without total counts

Indexes currently cover confirmed hot paths:

- `sessions(user, created)`
- `sessions(created)`
- `sessions(user, last)`
- `members(user)`
- `members(role)`
- `users(created)`
- `invitations(email)`
- `invitations(created)`
- `invitations(expiry)`

Avoid more indexes or denormalized state until realistic data measurements show
a need.

Multi-step logical writes use transactions. Emit topics only after the
transaction commits.

## Topics

Topic names are explicit stable domains:

- `user:<id>`: app shell and user-owned state
- `dashboard:<id>`: dashboard summaries
- `profile:<id>`: account profile data
- `sessions:<id>`: account sessions page
- `tokens:<id>`: account tokens page
- `registration:policy`: public login/register policy reads
- `admin:users`: admin users list
- `admin:sessions`: admin sessions list
- `admin:tokens`: admin tokens list
- `admin:stats`: admin overview counters
- `admin:registration`: admin registration mode and invitation list

Emit every topic whose readers observe a mutation. Prefer a few precise topics
over one broad catch-all.

Common mutation topics:

| Mutation | Topics |
|---|---|
| Profile update | `profile:<id>`, `dashboard:<id>`, `user:<id>`, `admin:users` |
| Session create/revoke | `sessions:<id>`, `dashboard:<id>`, `user:<id>`, `admin:sessions`, `admin:stats` |
| Token create/revoke | `tokens:<id>`, `dashboard:<id>`, `user:<id>`, `admin:tokens`, `admin:stats` |
| Signup mode change | `admin:registration`, `registration:policy` |
| Invitation create/revoke | `admin:registration` |
| Invitation accept | `sessions:<id>`, `dashboard:<id>`, `user:<id>`, `admin:sessions`, `admin:users`, `admin:stats`, `admin:registration` |

## Head Management

`head.tsx` owns server rendering and client application of document head state.

`merge(...heads)` deduplicates keyed `meta` and `link` entries, with later heads
winning. `render(head)` produces SSR tags. `apply(head)` diffs before mutating
`document.head` and `document.title`.

The head payload is compact: use `title`, `meta[]`, and `link[]`.

## Mail and Outbound URLs

Email flows such as reset, register, verify, and invitations build links from
`origin(req)`. Production non-local deployments must configure `APP_URL`;
local loopback `kit start` runs can use the request host.

Do not construct email links directly from arbitrary `Host` or forwarded headers.

## Validation

`@kit/validate` re-exports common Valibot helpers and provides `parse(schema,
data)`. Validation failures throw `Invalid`, which serializes field errors
and is surfaced by `action()` as `form.error`.

Validate input before writes. Keep schemas route-local unless repeated shapes
make a shared helper clearly simpler.

## Measurement

Set `AJO_TIMING=1` to enable route timing:

- `Server-Timing`
- `X-Ajo-Bytes`
- `X-Ajo-Cache`
- route timing logs

The timing module is an internal framework helper; apps use the flag and route
headers/logs rather than importing timing internals.

## Component Data Rules

- Components render durable data from `args.data`.
- Keep only UI-local state in components: input state, modal state, scroll
  anchors, temporary optimistic windows.
- Do not mirror server arrays into long-lived client stores unless a feature
  explicitly needs a bounded local window.
- Stateful Ajo components use generator components and `this.next()` for local
  updates.
- Use `this.signal` for cleanup-aware async/listener work.
- Do not import React or use React event/attribute casing.

## Dev, Test, and Seed Reliability

E2E startup uses strict port binding. Test server HMR host/protocol are
deterministic. E2E owns `.tmp/e2e.sqlite`; unit DB tests own temp DB paths and
restore `DATABASE_PATH`.

The sample seed fetches remote DummyJSON data before deleting local tables so a
network failure does not destroy existing local data.

Dev route reload watches handler, wares, page, and layout add/change/unlink
events. Page/layout changes trigger full reload.

Production smoke uses `playwright.production.config.ts`. It runs the built
runtime through `tests/production-server.ts` with a migrated temporary SQLite
database, then probes SSR, static asset headers, route JSON, and malformed JSON
action error mapping.

UI component stories live under `tests/stories/*.stories.tsx` and run through
the Ajo-native stories harness. `tests/stories-server.ts` owns the Sade-powered Node
CLI, Vite server, and Playwright runner. `tests/stories/app.tsx` owns the browser
manager, canvas, controls, story index, theme toggle, and shared story types.
`tests/stories/index.html` is the served shell. The stories harness uses Vite, Ajo, UnoCSS,
and Playwright without Storybook. It is intentionally client-only and limited to
`ajo-ui-playa` components plus pure fixtures. It exposes a manager UI through
`pnpm stories`, a smoke runner through `pnpm stories:test`, and opt-in screenshots in
`.tmp/stories-screenshots` through `pnpm stories:test:visual`.

The manager smoke enters through the real manager, waits for the preview iframe,
changes a control across `postMessage`, resets the initial args, exercises a
search URL, and navigates to a second story before canvas stories run. Live arg
changes rerender the same story instance; only a story-id change remounts it.

## Verification

For framework, security, data-flow, or runtime changes run:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm test:prod
```

Use focused e2e coverage for browser-visible flows and full e2e before closing
cross-stack changes.

Manual checks that exercise the system:

- SSR logged-out page load.
- SSR logged-in page load.
- Login, logout, register, verify, forgot, reset.
- Create/revoke API token from UI.
- Limited bearer token against forbidden API mutation.
- Password change/reset invalidating old sessions and tokens.
- Two sessions open, revoke one, verify live closure/update.
- `/admin/users -> /admin/sessions -> /admin/users` route freshness.
- Topic emit/revalidation on a route that tracks changed data.
- Production-like run with `APP_URL`, secure cookies, generic 500 responses.
- Local `kit start` on Windows without `APP_URL` using `localhost`.

## Non-Goals

- No normalized client store.
- No implicit table tracking, `tracker.ts`, `deps`, `events`, sums, or seals.
- No `devalue` for route JSON, actions, SSE, or public API responses.
- No GraphQL-style cache.
- No broad route data abstraction before repeated concrete use proves need.
- No arbitrary rich non-JSON route/action/API payloads outside SSR boot.
- No distributed rate limiting while the app is single-process/local.
- No domain-specific denormalized state before realistic measurement.
- No complex public route caching policy until a measured need exists.
- No large security framework abstraction while route-local checks stay clearer.
