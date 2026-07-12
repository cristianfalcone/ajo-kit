# Ajo Kit Cohesion Series — Final Commit Record

Last updated: 2026-07-12

## Status

This is the final chronological record of the 46-commit cohesion series. The
first 45 entries use the exact short SHA and subject recorded by Git. D1 is this
documentation commit itself, so its SHA cannot be embedded in its own contents
without changing that SHA; it is identified as **this commit** and closes the
series at 46/46.

The range starts at `977154e`. The earlier `3732fc3 Add Ajo UI stories harness`
is the baseline on which this work began and is not one of the 46 commits.

Two boundary facts are deliberate:

- the workspace targets the already-published Ajo `0.1.35`; this series did not
  make or require a new Ajo release;
- `OmitArg` stays beside `FixedArgs` on `ajo-ui/utils`, because both express
  component-adapter ownership rather than general host behavior.

## F — Workspace and framework foundation

### 1/46 — F1 — `977154e chore(workspace): target published Ajo 0.1.35`

Used the published Ajo release that provides the Host contract required by the
component packages, removed obsolete classic JSX globals, and kept
compatibility floors explicit without sibling-checkout links or a new Ajo
release.

### 2/46 — F2 — `252c83e test(workspace): colocate package suites with their owners`

Moved framework, auth, backup, and freshness coverage next to the packages it
verifies, kept app-data tests at the root, and exposed equivalent package-local
test commands while retaining every suite in the root unit gate.

### 3/46 — F3 — `e630303 refactor(ajo-kit): clarify route component argument contracts`

Replaced generic `Props` and `Frame` names with explicit `PageArgs` and
`LayoutArgs` contracts across the framework and route consumers. The old names
were removed without compatibility aliases.

### 4/46 — F4 — `0a6778e fix(ajo-kit): bind actions to component lifecycles`

Gave each route action one in-flight owner, composed caller cancellation
without surrendering lifecycle control, aborted requests on replacement,
reset, or teardown, and prevented stale responses from mutating state or
dispatching effects.

### 5/46 — F5 — `92b1086 feat(ajo-auth): expose client-safe ability utilities`

Published pure ability matching through a client-safe auth subpath, reused it
in the app ability catalog, and admitted explicit `.client` modules through
ajo-kit's aliases and server-only guard without opening the rest of the
server-only package.

### 6/46 — F6 — `7a238d5 test(stories): harden filtered smoke and visual runs`

Added title, name, and id filtering, bounded readiness timeouts, one retry for
transient network changes, clean screenshot output, and the Playa first-paint
color so focused and full story verification remain deterministic.

## C — `ajo-cloves`

### 7/46 — C1 — `e1bedb0 feat(ajo-cloves): establish host lifecycle utilities`

Created the standalone cloves package and its canonical Ajo host interface.
Centralized SSR-safe realm and DOM gates, listener/ref/handler composition,
Stateful root forwarding, shared sources, frame coalescing, live-target
ownership, ids, bounded caches, and numeric normalization.

### 8/46 — C2 — `ae746be feat(ajo-cloves): add controlled interaction lifecycles`

Added reusable controlled state, one-shot timers, hover intent, Escape and
outside dismissal, and safe focus restoration for disclosure and popup
families.

### 9/46 — C3 — `92761e8 feat(ajo-cloves): add keyboard navigation and selection`

Added live-list roving navigation, leak-free typeahead buffering, and
normalized single and multiple string selection while leaving focus and
rendering effects to callers.

### 10/46 — C4 — `796aef5 feat(ajo-cloves): add reusable positioning and ambient behavior`

Added anchored and pointer-follow positioning with frame-coalesced updates,
viewport flip and shift, and live retargeting, plus shared announcements and
global hotkeys for overlay and command surfaces.

### 11/46 — C5 — `b922246 feat(ajo-cloves): add field wiring and spatial input`

Added presence-driven field labelling, normalized pointer-drag sessions,
semantic two-dimensional grid movement, and spinbutton key resolution for
fields, sliders, resizable surfaces, drawers, calendars, and segmented inputs.

### 12/46 — C6 — `7987329 feat(ajo-cloves): add reactive browser sensors`

Added leak-proof media, color-scheme, storage, scrolling, resize, and
document-visibility views. Browser sources are shared where appropriate and
live elements retarget through one abort-owned lifecycle.

### 13/46 — C7 — `bc38b34 feat(ajo-cloves): derive overflow state from live sensors`

Composed scrolling and resize views into one overflow clove that owns the
public `start`, `end`, and `both` edge vocabulary consumed by Tabs and
MessageScroller.

## A — Application integration

### 14/46 — A1 — `a2a52ee refactor(app): share theme preference behavior through cloves`

Replaced direct `matchMedia` and `localStorage` wiring with scheme and storage
cloves so system-theme changes, persistence, cleanup, and rerenders follow the
same lifecycle as the component system.

### 15/46 — A2 — `e35002c fix(chat): isolate frame work by active conversation`

Coalesced scroll and visibility work through lifecycle cloves, cancelled
queued jobs on teardown, reset action state when the room changes, and
discarded asynchronous completions owned by an old conversation.

## U — `ajo-ui`

### 16/46 — U1 — `e3a6994 feat(ajo-ui): establish unstyled field and control primitives`

Created the unstyled component-system package and its shared utility owner.
Kept `OmitArg` beside `FixedArgs` on the deliberate `ajo-ui/utils` seam, then
added field labelling, native choice controls, input grouping, OTP, progress,
avatar, and status foundations with SSR-safe live-state synchronization.

### 17/46 — U2 — `63e4dd9 feat(ajo-ui): add disclosure and grouped selection families`

Composed Accordion from Collapsible, ToggleGroup from Toggle, and CheckboxGroup
from Checkbox. Normalized controlled state, native details behavior, roving
navigation, and multi-value coercion while retaining each family's semantics.

### 18/46 — U3 — `271a2da feat(ajo-ui): add inherited direction and accessible tabs`

Added a Stateful-owned DirectionProvider with read-only consumers, then built
Tabs with raw value identity, controlled activation, roving focus, inherited
RTL behavior, and state-driven overflow.

### 19/46 — U4 — `90b290a feat(ajo-ui): add spatial interaction families`

Added Slider, Resizable, and Carousel over shared movement, controlled state,
scrolling, and resize cloves while preserving native inputs, scroll snap, and
composed consumer callbacks.

### 20/46 — U5 — `40954e1 feat(ajo-ui): add message scrolling behavior`

Added MessageScroller with auto-follow, prepend preservation, message-id jumps,
visibility state, fallback timers, overflow ownership, and callback-ref
composition.

### 21/46 — U6 — `508aad7 feat(ajo-ui): centralize anchored popup behavior`

Introduced one internal popup engine for controlled state, native Popover
synchronization, ids, positioning, hover intent, dismissal, arrows, and shared
trigger/content attr bags. Popover and Tooltip became family policies over that
seam.

### 22/46 — U7 — `7c13571 feat(ajo-ui): add native dialog, drawer, and toast surfaces`

Added native Dialog ownership, Drawer movement and composition, and Toast
top-layer behavior. Modality and dismissal remain platform-owned while refs,
callbacks, labels, and re-exported slots compose cleanly.

### 23/46 — U8 — `f8830f1 feat(ajo-ui): establish the shared menu substrate`

Added the internal collection protocol, made DropdownMenu the reusable menu
substrate, and built ContextMenu on the same collection, focus, submenu,
anchor, and popup contracts instead of maintaining a fork.

### 24/46 — U9 — `36080b6 feat(ajo-ui): add bar navigation and toolbar behavior`

Added one internal bar machine for controlled open value, roving focus,
typeahead, and follow policy. Menubar and NavigationMenu compose it, while
Toolbar implements APG-style behavior for arbitrary nested controls.

### 25/46 — U10 — `0004dd5 feat(ajo-ui): add a filterable command surface`

Added Command and CommandDialog over the collection and Dialog seams.
Centralized token filtering, result labels, visible-item commit behavior,
announcements, and single-writer highlight state.

### 26/46 — U11 — `73d2c62 feat(ajo-ui): unify selection, search, and tagging`

Added one Select family for single, multiple, searchable, editable, chip, and
tagging modes. Focus strategy derives from composition and reuses InputGroup,
collection, floating, roving, typeahead, announcements, and native form
mirrors.

### 27/46 — U12 — `fb2bc2f feat(ajo-ui): add responsive sidebar behavior`

Added responsive Sidebar with controlled desktop and mobile state, media-query
switching, hotkey gating, persistence policy, and mobile Drawer composition.

### 28/46 — U13 — `1848fc8 feat(ajo-ui): add composable data table behavior`

Added DataTable sorting, filtering, facets, selection, pagination,
announcements, and renderer injection. It reuses Checkbox and Toolbar while
preserving renderer injection as the theme composition seam.

### 29/46 — U14 — `de58e60 feat(ajo-ui): add native SVG chart behavior`

Added context-owned chart identity, native SVG plot families, geometry,
legends, tooltips, accessibility text, and pointer-follow behavior without the
theme reaching around the package seam.

### 30/46 — U15 — `0db4eec feat(ajo-ui): add calendar views and shared date engines`

Added locale-aware segment and availability engines and one Calendar root for
day, month, and year views. Disabled and unavailable policy compiles once,
timezone and literal-year behavior are preserved, and one semantic grid serves
all scales.

### 31/46 — U16 — `a52de6a feat(ajo-ui): add segmented date and time fields`

Added InputDate, InputTime, and InputDateTime over the same FieldView model,
with optional Calendar composition, range semantics, hidden form values,
reason-coded validation, shared availability, and the secondary datetime time
surface.

## P — Cross-package contracts

### 32/46 — P1 — `bfb5f9e test(packages): pin public ownership and export boundaries`

Locked the final seams: general host utilities remain in `ajo-cloves`;
`OmitArg` and `FixedArgs` remain on `ajo-ui/utils`; internal modules do not
leak; adapter-owned args reject caller overrides; and component subpaths
resolve through the intended wildcard on published Ajo `0.1.35`.

## T — Playa theme, application, and story catalog

### 33/46 — T1 — `ef95a8f refactor(ui): cut the application over to the composed Playa theme`

Replaced legacy in-place component interfaces with typed themed adapters,
migrated affected app and story consumers atomically, and removed superseded
wrappers instead of preserving aliases. Card, Field, Item, Table, Sidebar,
Select, Tooltip, Toast, and messaging surfaces compose `ajo-ui`. Select and
`tests/stories/select.stories.tsx` both landed in this cutover.

### 34/46 — T2 — `2678ea3 feat(ui): add the remaining themed display primitives`

Completed the stateless Playa catalog with AspectRatio, Breadcrumb,
ButtonGroup, Kbd, Skeleton, and Typography plus twelve independently valid
display/composition story families. Breadcrumb's DropdownMenu composition was
left for T5, and Item's Avatar composition for T8.

### 35/46 — T3 — `148fb96 feat(ui): complete fields and choice controls`

Themed base field and choice behavior without reimplementing it, preserved
native checked state and SSR contracts, and shared geometry across
CheckboxGroup, InputOTP, Progress, RadioGroup, Slider, Switch, and toggles.

### 36/46 — T4 — `b7e4700 feat(ui): add disclosure and navigation families`

Added themed Accordion, Carousel, Direction, NavigationMenu, Tabs, and Toolbar
adapters while preserving inherited RTL, stable focus identity, roving
behavior, and base-owned interaction. The shared `data-overflow-x/y` edge-mask
preflight landed here because Tabs is its first themed consumer;
MessageScroller later reused it.

### 37/46 — T5 — `f42e44c feat(ui): add dialogs and floating menu surfaces`

Shared modal, menu, and popup recipes across AlertDialog, Command, ContextMenu,
Dialog, Drawer, DropdownMenu, Menubar, Popover, Tooltip, and Toast while
retaining family-specific semantics in `ajo-ui`. The Breadcrumb story landed
here with its real DropdownMenu composition.

### 38/46 — T6 — `a23af8e feat(ui): add selectable data and chart surfaces`

Added themed DataTable orchestration and stable native-SVG Chart identity,
palette scoping, filtering, sorting, facets, selection, legends, and tooltips
behind `ajo-ui` interfaces. Select was already complete in T1; this commit
contained only the Chart/DataTable feature and its durable contracts.

### 39/46 — T7 — `a07f617 feat(ui): add calendar and segmented date-time fields`

Exposed one themed Calendar and one segmented InputDate, InputTime, and
InputDateTime family over the shared engines, including compiled availability,
non-contiguous range policy, secondary time surfaces, and day/month/year views.
The cross-popup theme contract landed here because it includes InputDate.

### 40/46 — T8 — `654b593 feat(ui): add media and message-scroller surfaces`

Added Attachment, Avatar, Marker, and themed MessageScroller surfaces while
keeping frame, visibility, overflow, prepend preservation, and scrolling
behavior in cloves and `ajo-ui`. The Item story landed here with its Avatar
composition. Attachment/Marker shimmer styling landed here; shared overflow
masks were already owned by T4.

### 41/46 — T9 — `b5c0789 test(ui): consolidate public adapter and SSR contracts`

Locked deliberate fixed args, variant helpers, polymorphic hosts, nested
assistive-technology labels, chart identity, Toast surface, and the complete
SSR-safe root inventory. Audit-number fixture names were replaced by durable
capability-oriented contracts.

## R — Independent review hardening

### 42/46 — R1 — `e9a8489 refactor(ajo-cloves): normalize public option contracts`

Moved reactive label and media inputs into one options object so every public
clove keeps the canonical `host + options` interface. Updated package
consumers and lifecycle tests without compatibility aliases.

### 43/46 — R2 — `0b13f5e perf(ajo-ui): precompile availability expressions`

Normalized fixed dates, bounds, time windows, and time-zone options once per
matcher source. Each candidate is decoded lazily at most once while function
matchers and invalid-date semantics remain intact.

### 44/46 — R3 — `0114f59 docs(ajo-ui): describe the public component surface`

Added concise import-facing descriptions to every exported type, component,
and alias across the unstyled families. The public graph remains unchanged at
runtime and in TypeScript while editor discovery now covers all 554 exports.

### 45/46 — R4 — `ba52ca4 fix(ajo-cloves): freeze storage views after teardown`

Moved live storage key and value mutations into `host.next(fn)` and made
retained reads, writes, and removals inert after lifecycle teardown. The
regression test changes keys after unmount and proves the view and both storage
slots remain unchanged.

## D — Canonical documentation

### 46/46 — D1 — **this commit** — `docs: describe the cohesive Ajo Kit architecture`

Documents the final `ajo-cloves -> ajo-ui -> src/ui` layering, package-local
test ownership, deep internal modules, component interfaces, app-building
guidance, completed feature decisions, and real demand-driven deferrals. It
reduces `ai/plan.md` to active orientation and leaves this file as the final
implementation record rather than a future commit plan.

## Final snapshot

Current recorded counts for the completed implementation are:

- root unit suite: **527 tests**;
- `ajo-ui`: **144 tests**;
- `ajo-cloves`: **241 tests**;
- stories: **468 stories**;
- e2e: **47 tests**.

The documentation-only D1 battery passed on the clean `ba52ca4`
implementation snapshot: unit 527; `ajo-ui` 144; `ajo-cloves` 241; stories
468; e2e 47; production smoke 1. TypeScript, client build, and SSR build also
passed. One initial unit flake did not recur in 50 focused runs or 10
complete-suite runs.
