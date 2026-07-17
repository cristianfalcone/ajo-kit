# UI System Technical Reference

This document defines the implemented UI system in `ajo-kit`.

It covers reusable behavior, unstyled component interfaces, the Playa theme,
and the executable stories harness. Source, public types, and tests win if this
reference ever drifts.

## Layering And Ownership

The dependency direction is strict:

```text
ajo-cloves  ->  ajo-ui  ->  ajo-ui-playa  ->  application routes and stories
behavior        unstyled    Playa package    product composition
and lifecycle   families    and preset       and content
```

- `ajo-cloves` owns general Ajo behavior, lifecycle, sensors, state primitives,
  and host/spatial utilities. It owns no floating geometry engine.
- `ajo-ui` owns unstyled component behavior, semantic markup, accessibility,
  composition, and component-domain engines.
- `ajo-ui-playa` owns Playa classes, visual defaults, component recipes,
  component icon recipes, theme-level composition, and the build-time UnoCSS
  preset.
- Application code owns product content, route-specific layout, business
  state, product-only shortcuts, and product icon tokens or safelists.

Logic moves downward only when it is useful below its current layer.

A general behavior may become a public clove when its semantics are useful
outside one component family and a real consumer proves the interface.

Component-specific engines remain in `ajo-ui`. Ownership follows generality
and evidence, not the number of packages that currently consume the behavior.

### Public Package Surfaces

`ajo-cloves` exposes one root entrypoint. Its source-internal lifecycle helpers
are not public contracts.

`ajo-ui` exposes:

- the root barrel with every public family;
- one explicit `ajo-ui/<family>` subpath per public `.tsx` family module;
- the deliberate `ajo-ui/utils` helper subpath.

There is no wildcard export. Pure `.ts` engines plus
`data-table-contract.ts` and `data-table-model.ts` are package-internal.

`@floating-ui/dom@1.8.0` is an exact regular dependency of `ajo-ui`. It is an
implementation detail of positioned component families; applications and
`ajo-ui-playa` do not declare or import it directly.

`ajo-ui` declares its modules side-effect-free. Selecting another family from
the root barrel does not retain `VirtualList`, `DataTable`, or their TanStack
dependencies. Importing DataTable through the root or its explicit subpath
produces the same graph. The reproducible `pnpm test:bundle` gate lives in
`tests/package-bundle.ts` and is part of `pnpm test:unit`.

`ajo-ui-playa` exposes two deliberately separate surfaces:

- the package root exports only `playa()`, the build-time UnoCSS preset;
- 62 explicit `ajo-ui-playa/<family>` runtime subpaths expose the public
  themed families.

There is no themed runtime root barrel, wildcard export, or `./uno` subpath.
Private sibling recipes, modal tokens, and scroll-area helpers have no package
subpath.

`ajo-ui`, `clsx`, and `@iconify-json/lucide` are package dependencies. The
unstyled base remains transitive for themed consumers and templates; they
never declare or import it.

The monorepo root keeps `ajo-ui` only as a devDependency for direct base-package
tests. It is not part of the themed application dependency contract.

`ajo >=0.1.35` and exact UnoCSS `66.7.2` are peers. A Playa application
declares its Ajo host, `ajo-ui-playa`, and UnoCSS. UnoCSS is build tooling, not
a browser dependency.

The unscoped package name is covered by Ajo Kit's
`ssr.noExternal: [/^ajo-/]` rule.

All three UI packages target Ajo `>= 0.1.35`.

## Cross-Layer Component Contracts

### Stateful Ownership

Stateful roots own mutable state, browser effects, lifecycle, and Context
writes.

Stateless wrappers and parts may:

- map ordinary args onto a Stateful root;
- read a Context view;
- invoke callbacks exposed by the Stateful owner;
- render semantic parts around that view.

They must not set an ancestor Context. A write from a Stateless part mutates
the active Stateful provider and can leak after that part disappears.

When a root uses Ajo's configured default host, declare `Stateful<Args>` and
do not set `.is = 'div'`.

Specify a host only when the tag carries real semantics, such as `details`,
`fieldset`, `nav`, `li`, `span`, or `button`.

Plain DOM args on a Stateful root pass through `statefulRootAttrs` from
`ajo-cloves`.

Contexts stay module-private unless real cross-family composition, a Playa
adapter, or a public consumer needs their view. `ToggleGroupContext` is public
for composition; `CheckboxGroupContext` and `RadioGroupContext` remain private.

Public contexts use a `*Context` name. Playa re-exports the exact base Context
instance when consumers need the same view; it does not add `use*` wrappers.

Public Context values contain only consumer state and controls. Carousel and
MessageScroller keep DOM-part registration in separate private Contexts; Chart
exposes only `ChartIdContext` while its full state stays private.

`DirectionContext` and `ResizableContext` have `ltr` and horizontal fallbacks.
Provider-bound Carousel, Sidebar, MessageScroller, and Chart identity Contexts
return `null` outside their owner.

### Controlled State

Families use the same controlled and uncontrolled vocabulary:

- `value`, `defaultValue`, `onValueChange(value, event)`;
- `open`, `defaultOpen`, `onOpenChange(open, event)`;
- `checked`, `defaultChecked`, `onCheckedChange(checked, event)`.

`undefined` means uncontrolled.

Families whose empty public value is `null` keep `null` controlled. Arrays use
`[]` as their controlled empty value.

Consumer handlers compose through `callHandler`. Consumer refs compose through
`callRef`. Internal behavior runs first when later logic depends on it.

### Slots And State Attributes

`data-slot` is the stable vocabulary for composition, theme selectors, stories,
and tests.

Boolean state markers render as `data-x="true"` or remain absent. ARIA values
that require an explicit negative render as `'true' | 'false'`.

`data-state` is used only when a family exposes a real named state:

- `open/closed` for disclosure and popup families;
- `checked/indeterminate/unchecked` for Checkbox;
- `checked/unchecked` for binary native choice controls;
- `active/inactive` for tabs;
- `on/off` for toggles;
- `complete/incomplete` for OTP;
- `loading/complete/indeterminate` for progress;
- `selected/unselected` for Calendar day buttons;
- `expanded/collapsed` for desktop Sidebar.

Native state remains authoritative where the platform already provides it.

### DOM Identity

Public string values that mint DOM ids preserve their exact identity.

Use `encodeURIComponent` inside a family prefix. Do not slug, lowercase, or
strip punctuation from identity values.

This keeps case, punctuation, and non-Latin values distinct in Tabs, Select,
Command, Chart, and similar families.

### Accessibility And Direction

Prefer native semantics before emulating them:

- `<dialog>` for modal conversations;
- Popover API for top-layer non-modal surfaces;
- `<details>` for disclosure;
- native inputs for form ownership and checked state;
- real buttons and links for activation and navigation.

Every user-visible or assistive string has an English default and an override
arg.

`DirectionProvider` supplies inherited `ltr` or `rtl`. A local `dir` arg wins
when a family needs an explicit override.

Focus movement follows rendered semantics. Hidden, disabled, or detached items
do not participate in roving, grid, or collection navigation.

## The `ajo-cloves` Behavior Layer

A clove binds one reusable concern to an Ajo host and returns a live view.

The canonical shape is:

```ts
const behavior = (host: Host, options?: Options): View => {
	// setup
	return view
}
```

Values that must remain live are supplied as closures and read when a view
method executes, rather than snapshotted during setup.

### Clove Contract

1. The interface is `(host, options?) => view`; options use one object.
2. The returned view keeps stable identity.
3. Mutations that must invalidate the host occur inside `host.next(fn)`.
4. Host-owned work ends through `host.signal`.
5. Per-render inputs synchronize through explicit methods such as `sync`.
6. SSR returns the same view shape without requiring an Element host.

Cloves have no `use*` prefix and no special call-order rules. Composition is
ordinary JavaScript.

Abort always releases host-owned resources. Retained-view inertness is a
behavior-specific contract, not a property inferred for every clove.

Helpers such as `timer`, `storage`, and `live` additionally prevent retained
views from restarting work, mutating live state, or evaluating stale live
inputs after abort.

### Attr Bags

When behavior targets a rendered child, expose attr bags for JSX spread.

An attr bag contains plain HTML, ARIA, `data-*`, `id`, and `tabindex` values,
plus Ajo `set:on*` handlers.

Plain attributes render under `ajo/html`. Client handlers attach during
hydration and reapply safely when keyed children are reused.

### Lifecycle And Shared Sources

`browser()` checks for both Window and Document. `dom(host)` checks whether a
specific host is a real Element.

Use `listen` for host listeners. It is SSR-inert and stops when either the host
or an optional caller signal aborts.

Use `shared` for document, window, media-query, or observer sources. One real
source serves multiple subscribers and stops after the last unsubscribe.

Use `frame` to coalesce high-frequency work to one animation-frame callback.

The source-internal live-target harness owns retargeting for sensors such as
`scrolling` and `resize`. Each target generation receives its own abort scope.

`remember` bounds insertion-ordered caches. `timer` owns restartable one-shot
work and rejects restarts after teardown.

`storage` keeps key and value mutations inside `host.next(fn)`. Retained reads,
writes, and removals become inert after lifecycle teardown.

### Public Catalog

Interaction primitives:

- `controlled`, `dismiss`, `hover`, `timer`, `roving`, and `typeahead`;
- `selection`, `restore`, `move`, `grid`, and `spin`;
- `label`, `hotkey`, and `announce`.

Spatial measurement:

- `indicator` stamps a marked child's box as `--indicator-*` variables
  plus `data-indicator` on its container, so themes glide an active marker
  between children (tabs).

Sensors:

- `media`, `scheme`, `storage`, and `visibility`;
- `scrolling`, `resize`, and `overflow`.

Infrastructure:

- `Host`, `browser`, `dom`, `listen`, and `statefulRootAttrs`;
- `callHandler`, `callRef`, `clamp`, `remember`, `id`, `shared`, and `frame`.

`on` and the live-target harness are source internals, not root exports.

## The `ajo-ui` Component Layer

`ajo-ui` supplies behavior and semantics without a visual recipe.

A family owns its root state, part relationships, ARIA contract, slots, and
state attributes. It accepts ordinary DOM args without baking in theme classes.

### Component-System Utilities

`ajo-ui/utils` owns helpers that are specific to component adapters:

- `OmitArg` removes named args without collapsing Ajo's open Args index;
- `FixedArgs` prevents adapter-owned args from returning as `unknown`;
- `withSlot` reexports a part with a fixed family slot;
- `clx` and `stlx` compose class and inline-style values;
- state, string, text, and filter normalization stays in the same module.

General host, lifecycle, callback, ref, cache, and numeric helpers remain in
`ajo-cloves`.

### Internal Modules

| Engine | Responsibility |
|---|---|
| `position.ts` | Sole `@floating-ui/dom` Adapter, profile policy, real/virtual references, observation, stale-work rejection, geometry outputs, and rollback. |
| `popup.ts` | Controlled popup state, ids, references/sources, native Popover synchronization, hover/focus interaction, dismissal, focus intents, and attr bags. |
| `native.ts` | Capability-safe native Popover open/close/open-state leaf. |
| `menu-cluster.ts` | Private Menu hierarchy, invocation, composition, direct-child registration, sibling pruning, and focus routing. |
| `collection.ts` | Item discovery, identity, DOM order, filtering, grouping, separators, highlight, and focus. |
| `bar.ts` | Open value, roving, typeahead, and adjacent-trigger entry policy for Menubar and NavigationMenu. |
| `segments.ts` | Locale-derived date/time segments, editing, ISO serialization, validation, and messages. |
| `availability.ts` | Compiled day, instant, serialized-value, and range-crossing availability checks. |
| `data-table-contract.ts` | Private vocabulary re-exported only through the public DataTable family. |
| `data-table-model.ts` | Exact TanStack v9 feature profile, row models, state policy, and Ajo lifecycle bridge. |
| `virtual.ts` | Vertical range calculation, keyed measurement, focus pinning, SSR range, scrolling, and lifecycle bridge. |

These are deep internal modules. Public families expose their behavior
without exposing the engines as importable subpaths.

### Composition Map

- Popover, Tooltip, Menu/Submenu, Menubar, Select, InputDate/InputDateTime,
  NavigationMenu, and ContextMenu compose `popup.ts` with a private
  `position.ts` profile.
- ContextMenu supplies a mutable virtual point whose current invoker is the
  native source and `contextElement`.
- Chart consumes `position.ts` directly with an SVG-backed virtual point; it
  does not use native Popover or popup interaction state.
- Menus, Select, and Command use the collection protocol.
- Menubar and NavigationMenu use the bar engine.
- ContextMenu and Menubar compose Menu.
- Drawer and CommandDialog compose Dialog.
- InputDate composes Calendar.
- Accordion composes Collapsible.
- ToggleGroup composes Toggle.
- CheckboxGroup composes Checkbox.
- SelectInput composes InputGroup.
- DataTable composes Checkbox, Menu, Select, and Toolbar.
- Mobile Sidebar composes Drawer.

Popover is one consumer of the popup Module, not a superclass for every
positioned family.

### Positioning And Native Popup Stack

`position.ts` is the single runtime import owner of `@floating-ui/dom`. It is
a private deep Module, not a package subpath. Families select named profiles;
they cannot pass middleware, strategy, Platform objects, collision padding,
boundaries, or upstream Floating UI types through public component APIs.

Public popup roots expose only:

- `placement`: `top`, `right`, `bottom`, or `left`, with optional `-start` /
  `-end`, plus `auto`;
- `gap`: a finite CSS-pixel distance from reference to surface.

Raw geometry names are sealed from component args through the private
`ReservedPositionArg` type in `position.ts`. `PopupPlacement` and
`PopupPosition` remain public through `ajo-ui/utils` and the positioned family
subpaths.

The Adapter has one lifecycle Interface:

```ts
type PositionView = {
  start(): Promise<boolean>
  update(): Promise<boolean>
  stop(): void
}
```

`start()` creates exactly one `autoUpdate` scope and performs a current first
commit. `update()` coalesces requests while reading the latest elements and
point. `stop()` synchronously invalidates pending calculations, disposes the
scope, rolls back partial size work, and clears Chart's transient transform
writer. Popup output remains committed across close/reopen so exit motion does
not jump; replacing the floating or arrow tuple clears every Adapter-owned
output from the previous elements. Host abort calls the same idempotent stop
path. Generation, request, identity, connection, and host-abort checks prevent
stale `computePosition()` results from committing to a closed, replaced, or
detached surface.

DOM activation is structural: `dom(host)` rejects protocol-only `ajo/html`
hosts before reading element suppliers, even when an ambient document exists.
Document services, computed direction, listeners, node guards, and device-pixel
rounding come from the owning `ownerDocument` / `defaultView`, so popups and
dismissal remain correct across same-origin realms.

Real elements, Range-style multi-rect virtual references, and zero-area virtual
points share `PositionReference`. A virtual reference retains a real
`contextElement`; a point reference has stable identity and reads its current
coordinates lazily. Retargeting that element restarts observation. ContextMenu
uses its real invoker. Chart uses its current SVG plot.

Profiles own defaults and middleware policy:

| Profile | Default | Gap | Padding | Extra policy |
|---|---:|---:|---:|---|
| `popover` | `bottom` | 4 | 8 | inline reference, size, arrow, hide |
| `tooltip` | `top` | 8 | 8 | inline reference, width size, arrow, hide |
| `menu` | `bottom-start` | 4 | 4 | size, arrow, hide |
| `submenu` | `right-start` | 4 | 4 | explicit `left-start` fallback, size, arrow, hide |
| `select` | `bottom-start` | 6 | 8 | size, hide |
| `date` | `bottom-start` | 6 | 8 | size, hide |
| `navigation` | `bottom` | 8 | 8 | size, hide |
| `context` | `bottom-start` | 2 | 4 | size, hide |
| `menubar` | `bottom-start` | 8 | 4 | -4 cross-axis correction, size, hide |
| `chart` | `right` | 12 | 8 | flip before shift, bounded transform writer |

`inline()` precedes `offset()` so a multiline reference reset preserves the
family gap. `auto` uses `autoPlacement()` then limited `shift()`. Preferred
aligned placements and Chart use `flip()` then `shift()`; other unaligned
placements use `shift()` then `flip()`. `size()`, `arrow()`, and the two
`hide()` strategies follow only when the profile enables them. Size-aware
profiles always constrain `max-width` to the available clipping width; popup
surfaces also constrain `max-height`, while Tooltip leaves height to its
caller. Collision and size use the family boundary; reference-hidden detection
may use a separate ancestor clip boundary.

Popup surfaces are the single semantic, native-Popover, and positioned node.
They use fixed `left`/`top`; positioning never writes their transform, so Playa
entry/exit transforms remain visual-only. Chart alone uses absolute
`translate(x, y)`, rounded to device pixels. Its first commit snaps and performs
one layout read before stamping `data-positioned="true"`; later commits remain
direct geometry endpoints. Playa applies `transform 200ms ease-out` only to
that stamped tooltip under `prefers-reduced-motion:no-preference`. Stop removes
the stamp before clearing `transform` and `will-change`. `autoUpdate` uses its
event/observer defaults; there is no permanent animation-frame loop or
engine-side smoothing state.

Committed output is `data-placement`, `data-side`, and `data-align`, plus
`--reference-width`, `--reference-height`, `--available-width`, and
`--available-height`, `box-sizing:border-box`, and the applicable maximum size
for size-aware profiles. Reference-hidden and escaped state are output-only
markers. Popup coordinates, datasets, variables, arrow coordinates, and
transform origin remain stable while closed and are fully reset when their
floating or arrow tuple is replaced.

`popup.ts` owns everything that is not geometry: controlled/uncontrolled open
state, generated/adopted ids, ARIA relations, real trigger/reference/source
registration, hover timing, topmost dismissal, focus intent, native manual
Popover synchronization, owned arrow lifecycle, and conceal/reveal. `native.ts`
is the isolated capability leaf around `showPopover`, `hidePopover`, and
`:popover-open`. Dialog and Toast use their own native/modal lifecycles and do
not import the positioning graph.

## Family Contracts

### Fields And Visible Choices

Field owns label, control, description, and error ids through the `label`
clove. Description and error presence update the live `aria-describedby` bag.

Checkbox and RadioGroup use native inputs as the interaction surface. Their
visual companions mirror native checked state without replacing it.

CheckboxGroup coordinates multiple Checkbox values. RadioGroup coordinates a
single native radio value and roving focus.

Switch remains a checkbox-backed binary control. Toggle and ToggleGroup model
pressed button choices rather than form checkboxes.

InputOTP keeps one native input and renders its visual slots from that value.
Slider uses native range inputs and shared spatial helpers for multiple thumbs.

### Select

Select is one family for single, multiple, searchable, editable, chips, and
taggable selection.

Exactly one closed-state field is supported:

- `SelectTrigger` for button selection;
- `SelectInput` for editable autocomplete;
- `SelectChips` with `SelectChipsInput` for multiple values.

An input inside `SelectContent` is search for a trigger-based Select. It uses
`role="searchbox"`; the trigger remains the combobox.

Every valid composition contains one `SelectList`. It is the listbox, the
single scroller, and the target of `aria-controls` through its own id.

`SelectRoot` creates option ids from item identity. Each `SelectItem` applies
its resolved id to the option element.

#### Values And Filtering

- Single clear emits `null`.
- Multiple clear emits `[]`.
- `undefined` keeps the value uncontrolled.
- Omitting `filter` uses built-in token matching.
- A filter function replaces that matcher.
- `filter={null}` means the consumer owns external filtering.

`itemToStringValue` supplies the stable string view used by display, filtering,
identity, and hidden form serialization.

The identity string remains literal. DOM ids encode it with
`encodeURIComponent`.

String items and explicit `textValue` may register richer display labels. The
private label map is pruned to mounted or selected identities.

#### Focus And Interaction

Button mode uses real option focus. Input modes keep DOM focus in the input and
use `aria-activedescendant` for the highlighted option.

Chips use real focus among chip elements. They are not listbox descendants and
must not be referenced by `aria-activedescendant`.

Single selection closes after commit. Multiple selection stays open and
toggles the item.

Selecting the current single value clears it unless the root is `required`.

Tab closes the popup. Escape closes only an open Select and prevents an
ancestor modal from consuming the same key.

Closing restores focus to the field.

`SelectCreate` lives inside `SelectList`. The consumer owns item creation and
updates both `items` and the selected value.

`SelectStatus` is the polite async status region. Mounting it suppresses the
built-in result-count announcement.

With an input, `SelectEmpty` requires a non-empty search with no results.
Without an input, it may represent an initially empty item collection.

When `name` is present, hidden inputs serialize one single value or repeated
names for multiple values.

### Floating, Modal, Menu, And Navigation Families

Use `<dialog>` for modal conversations and the Popover API for non-modal
floating surfaces.

Native popover content must not receive unconditional author `display`, which
would override the user agent's closed `display: none`. Layout activates only
under `:popover-open`; Playa Select uses `[&:popover-open]:flex`.

A positioned content with an arrow renders sibling internal
`[data-slot="popup-surface"]` and `[data-slot="popup-arrow"]` nodes. The arrow
node is a transparent Floating UI marker; the surface is the only painted
geometry. Under `@supports`, Playa builds its side-aware silhouette with
`clip-path: shape()`: it consumes `data-side` and `--popup-arrow-center` from
the content and extends 7px toward the anchor, so the caret and bordered box
form one uninterrupted shape. Engines without `shape()` support keep that same
surface as a rounded box without a caret; the fallback never paints a second
surface. Scrolling stays on an inner element so the integrated surface remains
aligned and unclipped.

The popup Module owns shared open state, native show/hide synchronization, ids,
references, hover intent, and dismissal. It delegates only geometry to the
position Adapter. Families keep role, selection, and keyboard policy local.

#### Popover And Tooltip

Popover supports trigger or explicit reference composition and click or hover
opening. `<PopoverContent arrow>` enables its family-owned arrow; there is no
public arrow part or independently styled arrow geometry.

Tooltip inherits provider timing, uses hover/focus semantics, and remains a
non-interactive descriptive surface. `TooltipContent` always generates its
family-owned arrow.

#### Menus And Command

Menu is the semantic action-menu substrate. It owns normal, checkbox, radio,
group, label, separator, shortcut, and submenu parts.

ContextMenu reuses that substrate and adds a mutable virtual point with the
real invoker as native source/context, plus focus restoration.

Menubar reuses Menu content and adds a horizontal controlled trigger bar with
cross-menu keyboard movement.

NavigationMenu remains separate because it contains links and panels, not
`menuitem` actions. It uses per-item referenced content through the shared
Adapter and has no public shared Viewport or Indicator parts.

NavigationMenu uses hover intent across trigger and content zones, with open
and close delays. Click toggles a panel; keyboard opening moves focus inside
it. Tab traverses panel content, and focus leaving the menu closes it.

Command models highlight and execution, not persistent selection. It shares
collection, filtering, identity, and announcement patterns with Select.

CommandDialog composes the Command surface inside Dialog.

#### Toolbar And Sidebar

Toolbar exposes `role="toolbar"` and one tab stop across arbitrary controls.

Text inputs retain arrow keys while their caret can move. Descendant popovers
and dialogs do not join the toolbar row.

Sidebar owns desktop controlled state, structural slots, keyboard shortcut,
and injected persistence. Its `open` contract controls only the desktop branch.

The mobile Drawer keeps its own open state but reports changes through the same
`onOpenChange`. Default persistence writes `sidebar_state`; `false` disables
it, while a persistence function replaces the default.

`data-sidebar` is the stable family marker when a composed child must preserve
its own `data-slot`.

#### Dialog, Drawer, And Toast

Dialog owns modal state, focus lifecycle, labelled title/description wiring,
and a portal outlet.

Drawer composes Dialog and adds side geometry. `DrawerContent handle` opts into
the handle and pointer drag-to-close; neither exists by default.

Toast uses `popover="manual"` for top-layer rendering. Toaster moves into the
top modal portal that exposes `data-slot="dialog-portal"`, keeping toasts in the
non-inert subtree.

If the top modal has no such outlet, Toaster keeps its root viewport as the
fallback.

### Calendar

Calendar exposes `single`, `multiple`, and `range` selection modes.

Empty values are:

- `null` for single;
- `[]` for multiple;
- `null` for range.

Selection, visible month, and view each support controlled and uncontrolled
state.

#### Views And Navigation

`CalendarView` is `day | month | year`.

The default caption is a button that drills from day to month to year. Static
label and dropdown caption layouts do not add the same drill trigger.

`minView` decides the commit grain:

- `day` commits a date;
- `month` commits the first day of a month;
- `year` commits January 1 of a year.

`view` and `defaultView` values below `minView` clamp to `minView`. When
`minView` changes, an uncontrolled view persists the new clamp.

`startMonth`, `endMonth`, `fromYear`, and `toYear` bound navigation. With
`minView="year"`, a year commits only when both January and December are
navigable.

Month ranges emit the first day of the start month through the last day of the
end month. Year ranges emit January 1 through December 31.

Month and year views are one 3-by-4 grid. `numberOfMonths` applies only to the
day view.

One `grid` clove handles arrows, row movement, Home, End, PageUp, PageDown,
RTL, and edge movement at every scale.

Escape drills down one view. At `minView`, it propagates so an owning popup may
close.

View changes recreate keyed subtrees and relocate focus to the corresponding
month, year, or day control.

`timeZone` governs date parts, labels, `data-day`, matcher interpretation, and
the emitted `Date` values.

#### Disabled And Unavailable

Calendar has two distinct policy channels:

- `disabled` is a hard native block, skipped by focus and selection;
- `unavailable` remains focusable and selectable, then reports invalid state
  through an owning field.

These matchers apply only to day cells. Month and year cells are disabled only
by navigation bounds; they do not aggregate disabled or unavailable days.

`CalendarMatcher` accepts:

- a `Date`;
- an array of dates;
- a date predicate;
- an object with `before`, `after`, `from`, `to`, or `dayOfWeek`.

Fields in one object intersect. Top-level matcher arrays are alternatives.

`before` and `after` are strict. A paired `{ from, to }` is an inclusive range.
A lone `from` or lone `to` matches exactly that day. Weekdays use `0 = Sunday`.

`AvailabilityMatcher` adds a half-open wall-time window:

```ts
type TimeWindow = { from?: string; to?: string }
```

A time window uses `[from, to)`. A matcher with a time window never marks an
entire Calendar day unavailable.

For `Availability.value` checks of an InputTime value, day-dependent matchers
graft the serialized time onto the current local day. Omitted window bounds
mean the start or end of day. Empty or inverted intervals never match.

The compiled availability view exposes day, instant, serialized-value, and
exclusive-interior range checks.

Static matcher dates, bounds, windows, and time-zone options compile once per
source change. Each candidate is decoded lazily at most once.

Standalone Calendar stamps day state and emits selections. It does not report
validation reasons or messages.

`InputDateRoot` reports an unavailable endpoint as `unavailable` and an
unavailable interior as `unavailableRange`. `allowNonContiguous` suppresses
only the interior error.

Calendar uses the same flag to remove unavailable interior days from the
selected band. It never splits the emitted range.

### Segmented Date And Time Fields

The family contains `InputDate`, `InputTime`, and `InputDateTime`.

Public values are strict, timezone-free ISO strings:

| Family | Value |
|---|---|
| `InputDate` | `YYYY-MM-DD` |
| `InputTime` | `HH:mm` or `HH:mm:ss` |
| `InputDateTime` | `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss` |

Range mode uses:

```ts
type RangeValue = {
	from: string | null
	to: string | null
} | null
```

Range emission is progressive. One completed side emits `{ from, to: null }`
or `{ from: null, to }`; only two empty sides collapse to `null`.

Do not use `Date.parse` or `toISOString` for these values. Years `0001` through
`9999` preserve their literal form.

#### Engine And Composition

`segments.ts` owns one editable `FieldView` per range side. Units are nullable
and remain authoritative while the user edits.

The visual order comes from `Intl.DateTimeFormat.formatToParts` over a fixed
probe date. Editable segments are keyed by unit so locale reordering preserves
their identity and focus.

Locale resolution is:

1. explicit `locale` arg;
2. `<html lang>` in a browser document;
3. `en-US`.

The engine never reads `navigator`.

A bare root renders a field-only composition. Passing `calendar` adds trigger,
dialog, and Calendar parts.

InputDateTime with a Calendar also renders a time surface in the popup.
`InputDateTimeField` uses the same `FieldView`; it is not a second editor.

Time entered before an InputDateTime date remains staged without emission. It
survives completing the date through Calendar and then joins the emitted value.

Range mode renders from and to field groups with one shared popup.

Field and popup segments have separate ids and navigation scopes. Hidden
popover segments do not join the field's roving order.

#### Editing And Commit

Digit and name buffers edit one unit at a time. Month names and day periods use
locale-aware prefix matching.

Segments support auto-advance, Left and Right navigation, spin steps,
PageUp/PageDown, Home/End, and dynamic day bounds. Enter advances to the next
segment; `+` and `-` spin the focused unit.

Spin never carries into a neighboring unit. On minute segments, `step` controls
Arrow and `+`/`-` increments. PageUp and PageDown keep a fixed 15-minute jump.

Backspace and Delete work through both keyboard and `beforeinput` paths. IME
composition restores DOM text and commits after `compositionend`.

Paste is blocked because no locale-safe paste grammar is part of the public
contract.

Initial entry emits only after every rendered unit forms a real value. The
final keystroke constrains the day before emission.

Once complete, every edit constrains and emits immediately. A complete value
made incomplete emits `null`.

Controlled echoes preserve the unit record and typing buffer. A rejected or
genuinely different external value rederives the editor.

Values carrying seconds retain second granularity even when the owner echoes
them through a minute-default field.

`min`, `max`, and `unavailable` never mutate or block a typed value. They stamp
reason-coded invalid state and a message.

When composed into Calendar, min/max and `calendar.disabled` also define the
hard-disabled day cells. `unavailable` remains the soft channel.

#### Popup, Forms, Accessibility, And SSR

The popup reference is the complete themed field root, including every segment
group and trigger addon. The icon button is only the native invocation source.

Alt+ArrowDown opens only when popup parts exist. Escape closes without clearing
the value.

Alt+ArrowDown captures and restores the opening segment. InputDateTrigger
captures and restores the trigger for both pointer and keyboard activation.

In day view, Calendar autofocus prefers the selected day, then today, then the
first enabled day. Month and year views fall back to the dialog itself.

InputDateTime keeps the popup open after a day pick while a mounted time surface
exists.

Clear emits `null` and focuses the first segment. Presets commit through the
same ISO model and close the popup.

Hidden form fields use `name` for single mode and `name[from]` plus `name[to]`
for range mode. Disabled fields do not submit. Form reset restores defaults
only for uncontrolled fields.

`required` maps to `aria-required`. The hidden input does not participate in
native required validation.

Field and time surfaces use `role="group"`. Editable segments use spinbutton
semantics with dynamic bounds and localized value text.

Empty segments omit `aria-valuenow`. Literals are `aria-hidden`.

On iOS, editable segments switch to textbox semantics without numeric
`aria-value*` attributes.

Segments are not `contenteditable` in server HTML. Client wiring enables text
editing only after a real DOM host exists.

Non-English SSR requires an explicit locale because the server has no
`<html lang>` document.

### DataTable

DataTable is a deep client-side data module. Its public Interface is only
`DataTable`, `DataTableArgs<T, Key>`, and `DataTableColumn<T>`; auxiliary label,
facet, selection, and pagination shapes remain structural details rather than
independent exports. TanStack types, instances, options, feature objects, and
state never cross the family boundary.

The model, renderer, and data semantics belong together in `ajo-ui` because
they are one component-domain policy. `ajo-cloves` contributes only general
lifecycle and host utilities; it owns no table engine or TanStack Adapter.

`label`, `rows`, `getRowKey`, and `columns` are required. `search` and
`selection` are enabled by presence. Pagination is enabled by default with
sizes `[10, 25, 50]`; `pagination={false}` renders every filtered row. `empty`
replaces the empty content and `labels` overrides individual UI strings.
Children, alternate ARIA naming, `data-slot`, structural render callbacks,
class maps, and engine escape hatches are not accepted. Ordinary DOM attrs,
including `class` and `style`, belong to the outer `div`; `label` names the
native table itself.

The Interface intentionally excludes server/manual data modes, grouping,
pinning, sizing, multi-sort, range selection, and spreadsheet navigation.
Those concerns require different ownership and must not return as dormant
configuration in this family.

#### Rows And Columns

`rows` and `columns` are immutable ordered snapshots. Any edit, insertion,
deletion, or reorder uses a new reference. `getRowKey` remains referentially
stable while its meaning is stable and returns one unique non-empty string or
finite number per source row. String and numeric keys remain distinct; there
is no index fallback. `sourceIndex` always means the row's position in the
source snapshot before filtering, sorting, or pagination.

A property value column derives its ID from `value`. Function accessors and
display columns require an explicit stable `id`; identity is never derived
from a visual header or function name. `label` is required plain text for
menus, sorting, and announcements, while `header` is optional visual content.
Value columns are searchable, sortable, and hideable by default. Display
columns require `cell` and do not participate in search, facets, or sorting.
`cell` receives the original row plus the raw `value`, stable `columnId`, and
original `sourceIndex`.

Schemas contain at least one uniquely identified column and at least one
initially visible column. A replacement schema reconciles visibility by ID,
removes incompatible sort and facet state, intersects selected facet options,
and makes a column visible when it becomes non-hideable. The last declared
visible column cannot be hidden.

Automatic search, sort, facet, and default rendering support strings, finite
numbers, booleans, `null`, and `undefined`. The default renderer also supports
`bigint` and renders nullish values empty. Dates, arrays, objects, mixed value
domains, and non-finite numbers require the relevant mapper, comparator, or
cell renderer instead of implicit coercion.

#### Data Pipeline And State

The canonical pipeline is:

```text
source rows -> global search -> column facets -> single-column sort
            -> pagination -> visible cells
```

Visibility changes only materialized cells. It does not change search,
facets, sorting, pagination, or selection. Global search trims the query and
performs lowercase substring matching across eligible value columns; it does
not imply fuzzy matching, diacritic folding, or locale collation. Facets use
OR within a column and AND across columns. Sorting is stable, owns one column,
and cycles `none -> ascending -> descending -> none`.

Changing search, a facet, sort, or page size returns to page one. Replacing
rows preserves a still-valid page and otherwise clamps it. Reset clears search
and every facet. Omitting an optional feature also clears its private state:
removing search clears the query, removing selection clears internal
selection, and disabling pagination clears page state.

Selection is key-first and survives filtering, sorting, and pagination.
Callbacks receive effective keys in source order, never row objects.
`defaultValue` initializes uncontrolled selection; a defined `value` is the
sole controlled authority and requires `onValueChange`. The originating DOM
event is supplied only for the synchronous user command that produced it.
Internal reconciliation never invents an event.

Header select-all targets the current page when pagination is active and all
filtered results when it is disabled. The selection summary counts effective
keys across the complete source snapshot, including selected rows outside the
current page or filter. `getRowLabel` is required when selection is present and
provides human-readable checkbox names. In controlled mode, native checkboxes
are immediately restored from the authoritative value after proposing a
change, so rejected or synchronously transformed values never leave optimistic
DOM state behind.

#### Model, Renderer, And Theme Seam

Private `data-table-model.ts` binds exact
`@tanstack/table-core@9.0.0-beta.47` and `@tanstack/store@0.11.0` to Ajo. Its
explicit profile registers only global and column filtering, visibility,
pagination, selection, sorting, and the required core, filtered, sorted, and
paginated row models. It does not use `stockFeatures`, column-faceting row
models, framework adapters, external atoms, or parallel Ajo state.

One Stateful host owns one table, Store subscription, and cleanup signal.
TanStack state is the single authority for uncontrolled slices; caller input
is the single authority for controlled selection. Live options synchronize on
each yield without reconstructing the feature graph. Store invalidations
coalesce by microtask, public callbacks remain synchronous, scheduled work is
abort-safe, and model setup does not access the DOM during SSR.

`data-table.tsx` owns the only renderer and the stable `data-slot` contract. It
uses a native `<table>`, `<th scope="col">`, real buttons and checkboxes, and
native keyboard behavior rather than `role="grid"`. Only the active sorted
header receives `aria-sort`; each sort button describes its next action.
Toolbar and pagination names derive from the table label. Pagination controls
remain mounted and disable impossible actions.

Search result announcements report the filtered total before pagination.
Typing coalesces announcements for 200 ms, Enter, facet, and reset actions
announce immediately, and IME input waits for `compositionend`. Focus is
restored by row key and column ID when that target survives a transition. If
it disappears and no valid external control owns focus, focus returns to the
table at `tabindex="-1"` rather than falling to `body`.

Playa is a Stateless Adapter. It adds `playa-data-table` and the shared
`playa-table` recipe, while all state, semantics, and structure stay in the
base module. The manual Table wrapper carries the same `playa-table` recipe,
so typography, geometry, and row states have one source. Menu and Select
descendants consume the same named shortcuts as their standalone adapters.

Structural descendant selectors remain specificity-neutral with `:where(...)`;
checked and indeterminate Checkbox states use `:is(...)` so their state wins
independently of UnoCSS emission order. Stateful slot rules are variant-first
or one literal selector so a variant is attached to the intended slotted
element. Sort-trigger padding is symmetric and canceled by an equal negative
margin, keeping left, centered, and right headers aligned with their data
cells while retaining a useful hover target. The default executable story
allows at most one pixel of header/data edge drift and requires visible inset
between the sort label and its hover surface.

#### Failure And Performance Contracts

Invalid labels, schemas, IDs, keys, facets, selection, mutated snapshots, or
incompatible automatic values throw `TypeError`. Invalid pagination sizes or
defaults throw `RangeError`. Errors from accessors, mappers, comparators,
cells, and callbacks propagate to the normal Ajo boundary; the renderer does
not convert them into empty state.

Core materialization is linear in source rows, active filtering is linear in
rows times participating columns, sorting is `O(n log n)`, and rendering is
bounded by page size times visible columns. Stable row and column references
avoid model reconstruction; repeated renders, selection, and page changes do
not rematerialize every accessor.

`pnpm test:bundle` enforces a 15 KiB gzip ceiling for the private model/profile
bridge, a 30 KiB incremental gzip ceiling for the public component, identical
root and subpath graphs, and zero Virtual Core retention. The separate
`pnpm test:perf:data-table` gate verifies logical parity, bounded 10k-row
operations, non-rematerializing repeat/selection/page paths, frame counts,
search latency, and collectability after abort. It is a model/runtime gate,
not a painted-DOM benchmark.

No `VirtualDataTable` is public. The current paginated profile neither
registers a virtual strategy nor imports `virtual.ts`; manual semantic Table
remains a separate static primitive.

### Layout And Media

Chart renders native area, bar, line, and pie plots from config, series, and
data. Its container owns the accessible label and description, tooltip, legend,
and active coordinate payload.

Chart keeps its full context private. `ChartIdContext` is its narrow public seam,
used by Playa to isolate CSS variables between nested charts. Native SVG roots
set their namespace.

Each bar remains one SVG `rect`, so geometry updates keep native `x`, `y`,
`width`, and `height` transitions. `ajo-ui` stamps its numeric sign as
`data-chart-sign`; Playa uses a `fill-box` clip to round only the free end,
leaves the zero-axis end square, and flips the entry-animation origin for
negative values. Zero-value hairlines remain square.

An active mark is represented in SVG user coordinates plus its current SVG
identity. SVG-to-client projection uses `getScreenCTM()`, so viewBox
letterboxing, `preserveAspectRatio`, CSS/SVG transforms, and resize remain part
of browser geometry. Pointer hit-testing applies the inverse affine matrix;
Pie does not treat the full CSS viewport as its square user space.

The stable virtual reference reads that projection lazily and exposes the
current SVG as `contextElement`. Moving between SVG plots synchronously stops
the old observation scope and starts a new one. Each plot composes its caller
ref with an internal release ref: a genuinely disconnected active SVG stops
geometry immediately and clears the tooltip after reconciliation; ref churn on
a still-connected SVG restores the same point and scope.

The `chart` profile is bounded by the Chart root, prefers `right` with a 12px
gap, flips before limited shift, and writes one DPR-rounded absolute 2D
translation. Rapid Adapter updates coalesce to the latest endpoint without an
interpolation queue, smoothing state, or animation-frame loop. The first
endpoint snaps; Playa visually interpolates later transforms while motion is
allowed, and reduced-motion users keep direct snaps. Keyboard focus and pointer
activation share the same point/reference path. Closing or replacing the
tooltip clears the motion stamp and transform writer synchronously.
`ChartTooltip` renders only for a real active datum; synthetic `defaultIndex`
positioning is not an Interface.

Carousel, Resizable, Slider, Tabs, and Toolbar use shared spatial cloves while
keeping family-specific semantics in `ajo-ui`.

`overflow` owns `data-overflow-x` and `data-overflow-y` edge state. Themes turn
those attributes into masks or controls without remeasuring geometry.

### VirtualList

VirtualList is a vertical, single-lane, element-scrolling module with a bounded
DOM. Its public Interface consists of `VirtualList`, `VirtualListArgs`,
`VirtualListKey`, `VirtualListTarget`, `VirtualListScrollOptions`, and
`VirtualListApi`. No TanStack option, instance, type, measurement ref, virtual
index marker, or range extractor is public.

Its geometry stays in `ajo-ui` because range, native-list markup, focus, and
scroll semantics form one component-domain policy. `ajo-cloves` supplies only
general lifecycle and frame scheduling; it exposes no virtualization API.

`items`, `getItemKey`, `estimateSize`, and `renderItem` are required.
`estimateSize` is either one positive number or a pure function of item and
index. `overscan` and `prerender` are non-negative integers with defaults of
`4` and `20`. `setApi` receives one stable controller for a connected mount.
Native `ul` attrs are accepted except `children` and `role`, because the family
owns both. The viewport defaults to `tabindex="0"`; consumers provide an
accessible label when context does not already name it and a useful block size
through surrounding layout.

Horizontal or window scrolling, grids, masonry, sticky ranges, recycled DOM,
smooth-scroll behavior, and caller-owned list-item wrappers are outside this
Interface. They require different geometry or semantic ownership.

#### Snapshot And Geometry

Reusing the same `items` reference declares stable membership, order, and
identity; item content fields may change. Append, prepend, delete, and reorder
use a new snapshot. Keys are unique strings or finite numbers and remain stable
through content replacement and reorder. There is no index fallback.
`getItemKey` and functional estimates are pure and deterministic.

Measurements are cached by key, so a new snapshot with the same keys retains
confirmed geometry. A changed estimate updates unmeasured geometry without
discarding positive measured sizes. A temporary zero measurement preserves the
last positive size, or the estimate if no positive measurement exists. Truly
collapsed items leave the source snapshot instead of encoding zero-sized
membership.

The base module owns functional layout. The `ul` is the relative native
scrollport, resets list spacing, disables scroll anchoring, and hides horizontal
overflow. Materialized `li` elements are absolute, full-width, stay in source
order, and use `top` rather than transforms. An invisible
`data-slot="virtual-list-sizer"` item owns the total extent.

Padding, borders, and visual spacing belong inside `renderItem` content; `gap`
or margins on managed wrappers are not part of measured geometry. Because the
window and final sizer vary, `:first-child`, `:last-child`, and `:nth-child`
selectors are not contractual. The base functional styles win over caller
styles where geometry requires them.

#### Lifecycle, SSR, And Scrolling

Private `virtual.ts` is the sole range and measurement Implementation. It
adapts exact `@tanstack/virtual-core@3.17.4` to Ajo post-commit lifecycle,
`ResizeObserver`, passive scrolling, keyed sizes, and the existing `frame()`
clove. One virtualizer belongs to one Stateful host and all observers,
subscriptions, and scheduled frames are released by its abort signal.

SSR and the matching first client pass render exactly the first
`min(prerender, items.length)` items without reading DOM globals. The connected
post-commit pass then replaces that deterministic range with the viewport
range. `setApi` is not called during SSR or before the host is connected. A
retained controller becomes inert after unmount and its `scrollTo` returns
`false`.

`scrollTo` addresses exactly one current `key` or `index` and accepts `start`,
`center`, `end`, or `nearest` alignment. It scrolls immediately and may correct
its offset as real measurements arrive; there is no smooth-scrolling contract.
It returns `false` before connection, after unmount, for an absent key, or for
an out-of-range index. Malformed targets, non-integer indexes, and invalid keys
throw `TypeError`.

Positive row measurements work without per-row layout scans. If
`ResizeObserver` is unavailable, initial element measurement plus estimates
still produce a usable fixed-size path, but dynamic size changes are not
observed continuously.

#### Focus, State, And Accessibility

The focused row is pinned outside ordinary overscan. When its key leaves the
snapshot while focus remains inside it, focus moves to the viewport with
`preventScroll: true` before unmount. Rows outside the active range unmount and
are never recycled across keys. Durable row state and input values that must
survive scrolling therefore live in controlled props or an owner outside the
row.

Materialized rows expose `aria-posinset` and `aria-setsize`. Offscreen content
does not exist for find-in-page, printing, sequential tabbing, or assistive
technology traversal. Use a complete native list, pagination, or
`content-visibility` when those capabilities matter more than bounded DOM
work. The generic family does not switch to listbox, grid, or feed semantics;
those patterns require a higher-level component with their complete keyboard
and focus contract.

#### ScrollArea And Theme Seam

VirtualList owns its scrollport and must not be nested in ScrollArea. Playa
keeps the two families as sibling native viewports that share the private
`ScrollAreaFrame` and `scrollAreaViewportVariants` recipes. In the themed
Adapter, `class` and `style` target the frame; other native attrs, events,
`ref`, focus, gutter, and overscroll remain on the `ul`.

The frame owns radius, focus ring, and hard scrollbar-paint containment. Its
invariant `overflow: hidden` clips the shared full-width WebKit thumb to the
rounded frame without shrinking the handle. Popup and internal scrollers that
do not use the frame retain the inset `scrollbar-soft` fallback rather than a
global override.

#### Failure And Performance Contracts

Duplicate or non-finite keys and structural in-place mutation throw
`TypeError`. Non-positive or non-finite estimates and invalid count options
throw `RangeError`. An aborted host is inert. A structural reorder that keeps
the same reference is outside the contract even when edge validation cannot
detect every interior permutation without an `O(n)` scan.

Steady DOM is `O(visible + overscan + focus pins)`. Range lookup and rendered
offset work are logarithmic plus the materialized range; a structural snapshot
or invalidation may be linear, and keyed measurement cache is `O(items)`.
Scrolling does not scan all source rows, query all row elements, or call
`getBoundingClientRect()` per row in the scroll hot path. Observable range or
geometry changes coalesce to at most one Ajo render per frame; a frame is
canceled when geometry returns to the rendered state.

`pnpm test:bundle` enforces a 9 KiB incremental gzip ceiling, verifies that the
root barrel does not retain Virtual Core when another family is selected, and
verifies that VirtualList retains no Table or Store code.

### MessageScroller

MessageScroller exposes Provider, Root, Viewport, Content, Item, and Button
parts. Initial position is `start`, `end`, or `last-anchor`; item ids and anchors
drive visibility and imperative targeting.

The provider owns `autoScroll`, prepend preservation, and an imperative API for
scrolling to either edge or a message. `MessageScrollerContext` exposes that API,
including edge scrollability, visible ids, and the current reading anchor.

Playa gives the viewport labelled `region` semantics and the content `log`
semantics with a polite live region.

The engine derives visible ids, semantic anchors, prepend preservation, and
scroll buttons from one document-ordered geometry snapshot.

Prepend preservation survives mutation and resize settle work. Real or
imperative scrolling closes the preservation transaction.

The MessageScroller family owns transcript semantics. General frame, timer,
scroll, resize, and overflow lifecycles remain in cloves.

## The Playa Theme Layer

`ajo-ui-playa` is a thin package of adapters over its private transitive
`ajo-ui` base.

It declares no Stateful roots, writes no Context, and owns no retained
lifecycle. Its event glue is Stateless and adapts only visual composition.

It may add:

- classes and visual defaults;
- component icon recipes and subpart class hooks;
- public variant recipes;
- composition of existing base parts;
- minimal focus or event glue required by that visual composition.

It must not copy a base engine, own reusable interaction state, or import
`ajo-cloves` directly.

### Build And Consumer Contract

`playa()` is the optionless build-time Interface for the concrete Playa theme.
The private `src/styles.ts` owns:

- Wind4 and Icons configured with the Lucide collection;
- semantic tokens, root and dark variables, rules, and variants;
- design-system shortcuts, `playa-*` recipes, keyframes, and scrollbars;
- component preflights and package-wide visual invariants.

Product layout, route icons, product shortcuts, and product-owned dynamic
tokens stay in the application config. The root app currently owns
`site-container`.

The minimum UnoCSS configuration is:

```ts
import { playa } from 'ajo-ui-playa'
import { defineConfig } from 'unocss'

export default defineConfig({
	presets: [playa()],
})
```

The Ajo Vite host activates UnoCSS once and loads one virtual stylesheet:

```ts
import { kit, jsx } from 'ajo-kit/vite'
import { defineConfig } from 'vite'
import unocss from 'unocss/vite'

export default defineConfig({
	plugins: [
		...kit({ css: ['virtual:uno.css'] }),
		unocss(),
	],
	esbuild: jsx,
})
```

There is no `ajo-ui-playa/vite` wrapper. Runtime code imports explicit family
subpaths:

```tsx
import Button from 'ajo-ui-playa/button'

export default () => <Button class="w-full">Continue</Button>
```

The family source contributes component tokens, the application source
contributes `w-full`, and `playa()` gives those tokens their theme semantics.
UnoCSS emits the single stylesheet during the host build.

### UnoCSS Extraction And Distribution

Public family subpaths remain source `.tsx`. Imported family modules traverse
the host pipeline, so detected utilities and recipes are proportional to the
runtime module closure reached by the application.

The preset always emits its package-wide root and dark variables, global
selectors, keyframes, and preflights. Those fixed costs are not family-level
tree shaking.

Every finite class choice is a complete static literal or belongs to a map of
complete literals. Runtime interpolation must not construct utility fragments.

Files with runtime class literals remain `.tsx`, including private
`internal/recipes.tsx` and `internal/scroll-area.tsx`. `styles.ts` works because
UnoCSS executes it as config, not because the extractor scans plain `.ts`.

Caller classes are extracted from application source. Every current Playa
token is statically enumerable. Dynamic product tokens belong to the
application safelist.

The public contract does not use filesystem scans into `node_modules`, global
`.js` or `.ts` includes, `@unocss-include`, a complete safelist, experimental
per-module modes, or UnoCSS runtime.

The validated published-package path requires no `optimizeDeps.exclude`.

Playa does not publish precompiled CSS beside the preset. A second style path
would duplicate ownership of preflights, theme rules, and verification.

The graph is directional:

- the root reaches `styles.ts`, UnoCSS, Iconify, and the Lucide data only;
- family subpaths may reach Ajo, `ajo-ui`, `ajo-ui/utils`, `clsx`, and private
  runtime siblings;
- family subpaths never reach the root, `styles.ts`, UnoCSS, or Iconify;
- the root never reaches Ajo, `ajo-ui`, `clsx`, or a runtime family.

The manifest declares `sideEffects: false`. Runtime imports retain only their
allowed family closure, and the root remains isolated from the component
catalog.

UnoCSS, Iconify, Lucide JSON, and preset code remain outside client JavaScript.
Changing published family artifacts from `.tsx` to `.js` invalidates this
extraction contract and requires the consumer gate to be redesigned first.

### Adapter Types

Use a direct alias when the theme adds nothing.

Use an intersection when the theme adds a real arg such as `class?: string` or
a visual variant.

When the adapter owns a base arg, use:

```ts
type Args = OmitArg<BaseArgs, OwnedKey>
	& FixedArgs<OwnedKey>
	& ThemeArgs
```

`OmitArg` preserves remaining named types. `FixedArgs` prevents the owned key
from reappearing through Ajo's open Args index.

Do not copy host args or restate a base discriminated union.

`class` always styles the visible component root. Use a named `*Class` arg for
a static singleton part.

Use a scoped `classNames` or `classes` map for a themed collection. Use a
callback such as `dayClassName` when classes depend on live state.

Public recipes use the `xxxVariants` suffix. Only recipes intended for app
composition are exported by their family subpath.

Tokens shared solely by themed siblings live in
`packages/ajo-ui-playa/src/internal/recipes.tsx` and have no public subpath.

`packages/ajo-ui-playa/src/modal.tsx` is a private modal-token seam, and
`packages/ajo-ui-playa/src/internal/scroll-area.tsx` is the private frame seam
shared by ScrollArea and VirtualList.

`input-group.tsx` and `menu.tsx` remain public families. Their cross-family
recipes stay private in `internal`.

Resizable keeps its layout separator at one CSS pixel while a centered 24px
pseudo-element owns pointer hit testing. Browser stories verify both sides of
the invisible target in horizontal and vertical groups.

### Playa Packaging And Verification

Package-local tests cover the preset, public export map, runtime/build graph,
adapter contracts, visual-token protocol, and the real template client and SSR
builds.

`pnpm test:consumer:playa` publishes `ajo-cloves`, `ajo-ui`, and
`ajo-ui-playa` to an ephemeral registry. It installs versioned packages in a
fixture outside the workspace rather than relying on workspace links.

The fixture verifies:

- missing and incompatible peers, plus direct preset import without UnoCSS;
- transitive `ajo-ui`, one Ajo runtime identity, and no direct base dependency;
- TypeScript over published source, client build, SSR, and isolated HMR;
- CSS for every runtime token and absence of an unused-family sentinel;
- packlist, explicit exports, graph isolation, and compressed artifact budgets.

The minimum consumer budgets are executable acceptance limits:

| Artifact | Raw | Gzip | Brotli |
|---|---:|---:|---:|
| CSS | 48,000 B | 9,000 B | 8,000 B |
| JavaScript | 12,000 B | 4,500 B | 4,000 B |

The validated integration baseline is UnoCSS `66.7.2` and Vite `8.0.16`.
An UnoCSS upgrade changes the peer, preset, tarball fixture, CSS output, client
and SSR builds, stories, and budgets in one verified slice.

## Executable Stories Harness

The stories harness is the executable catalog for `ajo-ui-playa`.

```sh
pnpm stories
pnpm stories:test
pnpm stories:test --match <family>
pnpm stories:test:visual
```

`pnpm stories` defaults to `127.0.0.1:5182`. Use `--port <number>` when that
port is occupied.

`--match` filters the canvas smoke run by id, title, or name. Discovery and the
manager smoke still use the complete catalog.

### Discovery And Story Modules

`import.meta.glob('./*.stories.tsx')` is the only catalog index.

Each module exports a default `Meta` and named `Story` objects. The stable id
derives from the title and export name.

`parameters.layout` selects padded, centered, or fullscreen framing.
`parameters.docs.description` supplies the catalog description.

Render resolution is:

1. story `render`;
2. meta `render`;
3. meta `component` with merged args.

The story root is keyed only by story id. Updating args reconciles the mounted
tree instead of remounting it.

### Args And Controls

Args merge in this order:

1. meta defaults;
2. story defaults;
3. URL `args` JSON;
4. live manager overrides.

Supported controls are boolean, color, multi-select, number, object, radio,
range, select, and text.

`StoryContext.setArg` lets controlled stories synchronize the component,
manager controls, and args preview.

Reset removes live overrides and drafts without navigating or reloading the
iframe.

### Manager And Canvas

The manager keeps one same-origin iframe alive across story, args, and theme
changes.

Parent and iframe exchange validated `story-ready`, `render-story`, and
`set-arg` messages. Every message carries `source: 'ajo-stories'`.

The initial URL seeds first paint. Later state moves through `postMessage`.

Query parameters include `canvas`, `preview`, `theme`, `search`, `args`, and
`screenshot`.

`canvas=1` renders without the manager. `preview=1` suppresses `play` for the
manager iframe. `screenshot=1` freezes animations, transitions, and smooth
scrolling for deterministic capture.

### Play And Runner Contracts

A `play` function receives story identity, canvas root, and `setArg`.

It runs once per story id outside manager preview mode. Readiness is published
only after render and the eligible play finish.

The runner first executes a manager smoke against the complete index. It then
opens every selected story in an isolated canvas.

Browser errors, play errors, or an invisible root fail the run unless the story
declares `parameters.empty`.

Keep stories under `tests/stories/*.stories.tsx` and import themed components
from `ajo-ui-playa/<family>`. Never import runtime components from the package
root.

Use args for serializable state, `render` for composed JSX, `setArg` for
controlled interactions, and `play` for durable behavior contracts.

The DataTable matrix covers default composition, search and facets, sorting,
pagination, controlled and uncontrolled selection across transforms,
unpaginated and empty results, visibility, row actions, localization, and
immutable snapshot replacement. The VirtualList matrix covers empty, fixed,
variable, interactive, and dark surfaces while asserting one clipped scroll
owner, bounded DOM, logical positions, dynamic measurement, focus pinning, and
imperative key scrolling.

## Implementation Checklist

Before adding UI behavior, decide its owner:

1. General host or interaction behavior belongs in `ajo-cloves`.
2. Component semantics or shared family policy belongs in `ajo-ui`.
3. Playa classes, component icons, and visual composition belong in
   `ajo-ui-playa`.
4. Product-only composition, shortcuts, and icon tokens stay in the
   application.

For a new or changed family:

- keep Stateful ownership and Context writes together;
- preserve the default host unless a semantic tag is required;
- compose consumer handlers and refs;
- expose stable slots and state attributes;
- keep ids deterministic across SSR and hydration;
- provide English defaults for visible and assistive strings;
- add TSDoc to every public export;
- derive the Playa adapter from base types;
- add focused unit, SSR, type-surface, and story coverage.

Use these verification commands:

```sh
pnpm exec tsc --noEmit
pnpm --filter ajo-cloves test
pnpm --filter ajo-ui test
pnpm --filter ajo-ui-playa test
pnpm test:consumer:playa
pnpm test:unit
pnpm test:bundle
pnpm test:perf:data-table
pnpm stories:test --port <free-port>
pnpm stories:test:visual --port <free-port>
pnpm test:e2e
pnpm build
pnpm test:prod
```
