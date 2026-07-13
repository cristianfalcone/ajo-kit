# UI System Technical Reference

This document defines the implemented UI system in `ajo-kit`.

It covers reusable behavior, unstyled component interfaces, the Playa theme,
and the executable stories harness. Source, public types, and tests win if this
reference ever drifts.

## Layering And Ownership

The dependency direction is strict:

```text
ajo-cloves  ->  ajo-ui  ->  src/ui  ->  application routes and stories
behavior        unstyled    Playa       product composition
and lifecycle   families    theme       and content
```

- `ajo-cloves` owns general Ajo behavior, lifecycle, sensors, positioning,
  state primitives, and host utilities.
- `ajo-ui` owns unstyled component behavior, semantic markup, accessibility,
  composition, and component-domain engines.
- `src/ui` owns Playa classes, visual defaults, recipes, icons, and theme-level
  composition.
- Application code owns product content, route-specific layout, and business
  state.

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

`ajo-ui` declares its modules side-effect-free. Selecting another family from
the root barrel does not retain `VirtualList` or its Virtual Core dependency;
the reproducible `pnpm test:bundle` gate lives in
`tests/virtual-list-bundle.ts` and is part of `pnpm test:unit`.

`src/ui/index.ts` is the source of truth for the themed public catalog. Theme
token modules used only by siblings stay out of that barrel.

Both packages target Ajo `>= 0.1.35`.

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
- `selection`, `restore`, `move`, `grid`, `spin`, and `follow`;
- `label`, `hotkey`, and `announce`.

Positioning:

- `anchor` for element-anchored fixed positioning with flip, shift, and size
  variables;
- `indicator` for stamping a marked child's box as `--indicator-*` variables
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
| `floating.ts` | Controlled popup state, ids, native Popover synchronization, placement, hover intent, dismissal, and attr bags. |
| `collection.ts` | Item discovery, identity, DOM order, filtering, grouping, separators, highlight, and focus. |
| `bar.ts` | Open value, roving, typeahead, and follow policy for Menubar and NavigationMenu. |
| `segments.ts` | Locale-derived date/time segments, editing, ISO serialization, validation, and messages. |
| `availability.ts` | Compiled day, instant, serialized-value, and range-crossing availability checks. |
| `data-table-contract.ts` | Private vocabulary re-exported only through the public DataTable family. |
| `data-table-model.ts` | Exact TanStack v9 feature profile, row models, state policy, and Ajo lifecycle bridge. |

These are deep internal modules. Public families expose their behavior
without exposing the engines as importable subpaths.

### Composition Map

- Popover, Tooltip, Menu, Select, NavigationMenu, and InputDate use the
  floating engine.
- Menu submenus use the lower-level floating surface because their parent
  owns the open cluster.
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

Popover is a consumer of the floating engine, not a superclass for every
floating family.

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

A positioned surface with an arrow keeps scrolling on an inner element so the
arrow remains aligned and unclipped.

The floating engine owns shared open state, native show/hide synchronization,
placement, ids, hover intent, and dismissal. Families keep their role and
keyboard policy local.

#### Popover And Tooltip

Popover supports trigger or anchor composition, click or hover opening, and an
optional positioned arrow.

Tooltip inherits provider timing, uses hover/focus semantics, and remains a
non-interactive descriptive surface.

#### Menus And Command

Menu is the semantic action-menu substrate. It owns normal, checkbox, radio,
group, label, separator, shortcut, and submenu parts.

ContextMenu reuses that substrate and adds a pointer-positioned anchor plus
focus restoration.

Menubar reuses Menu content and adds a horizontal controlled trigger bar with
cross-menu keyboard movement.

NavigationMenu remains separate because it contains links and panels, not
`menuitem` actions. It uses per-item anchored content and has no public shared
Viewport or Indicator parts.

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

The popup anchors to the field group, not the icon button.

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

### Data, Layout, Media, And Messaging

DataTable consumes rows and columns with stable identity. It owns search,
facets, sorting, column visibility, selection, pagination, accessible labels,
and its Checkbox, Menu, Select, and Toolbar composition.

Private `data-table-model.ts` binds the explicit paginated profile from
`@tanstack/table-core@9.0.0-beta.47` to `@tanstack/store@0.11.0` and Ajo
lifecycle. TanStack types do not cross the public family.

`data-table.tsx` owns the only native renderer and stable `data-slot` theme
contract. Playa is a Stateless adapter that adds the private
`playa-data-table` recipe; it receives no structural callbacks or class map.
Menu and Select visual policy lives in named `playa-menu-*` and
`playa-select-*` Uno shortcuts. Their direct adapters and DataTable's base
descendants consume the same shortcuts, including popup motion, scrollbars,
focus/highlight/disabled states, and coarse-pointer sizing.
DataTable and the manual Table primitive reuse the same cell/header padding
recipes. Sort triggers fill the header cell without adding horizontal padding,
so start, center, and end headers remain geometrically aligned with row data.

`VirtualDataTable` is deliberately deferred until its geometry, AT, browser,
and performance gates pass. The paginated profile does not register a virtual
strategy or import `virtual.ts`.

Chart renders native area, bar, line, and pie plots from config, series, and
data. Its container owns the accessible label and description, tooltip, legend,
and active coordinate payload.

Chart keeps its full context private. `ChartIdContext` is its narrow public seam,
used by Playa to isolate CSS variables between nested charts. Native SVG roots
set their namespace.

Carousel, Resizable, Slider, Tabs, and Toolbar use shared spatial cloves while
keeping family-specific semantics in `ajo-ui`.

`overflow` owns `data-overflow-x` and `data-overflow-y` edge state. Themes turn
those attributes into masks or controls without remeasuring geometry.

VirtualList is a vertical, data-driven `ul`/`li` family and owns its native
scrollport. Its public surface is `items`, stable `getItemKey`, positive
`estimateSize`, `renderItem`, `overscan`, `prerender`, and one `scrollTo`
controller. Defaults are `overscan=4` and `prerender=20`.

Private `virtual.ts` is the only range and measurement authority. It adapts the
exact `@tanstack/virtual-core@3.17.4` dependency to Ajo post-commit lifecycle,
frame-coalesced invalidation through the existing `frame()` export from
`ajo-cloves`, dynamic
keyed sizes, zero-measure fallback, structural snapshot validation,
deterministic SSR, focus pinning, and abort cleanup.
No TanStack type, option, instance, measurement ref, or index marker is public.

Reusing an `items` array means stable membership, order, and identity; content
fields may change. Append, prepend, delete, or reorder require a new snapshot.
Keys are unique strings or finite numbers. Virtualized rows expose
`aria-posinset` and `aria-setsize`, but offscreen content remains absent from
find-in-page, printing, sequential tabbing, and assistive-technology traversal.
Use ordinary DOM or `content-visibility` when those capabilities dominate.

Playa VirtualList is a Stateless adapter. It does not nest ScrollArea: both
components are sibling scroll owners using the private
`scrollAreaRootVariants` recipe for scrollbar, gutter, overscroll, radius, and
focus treatment. The shared WebKit thumb fill is inset from its transparent
border so overlay scrollbars remain inside rounded viewport corners.

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

`src/ui` is a thin adapter over `ajo-ui`.

It declares no Stateful roots, writes no Context, and owns no retained
lifecycle. Its event glue is Stateless and adapts only visual composition.

It may add:

- classes and visual defaults;
- icons and subpart class hooks;
- public variant recipes;
- composition of existing base parts;
- minimal focus or event glue required by that visual composition.

It must not copy a base engine, own reusable interaction state, or import
`ajo-cloves` directly.

Resizable keeps its layout separator at one CSS pixel while a centered 24px
pseudo-element owns pointer hit testing. Browser stories verify both sides of
the invisible target in horizontal and vertical groups.

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

Public recipes use the `xxxVariants` suffix. Tokens shared only by themed
siblings remain direct imports and stay out of `src/ui/index.ts`.

`src/ui/modal.tsx` is an internal token seam. `src/ui/menu.tsx` is a public
themed family and owns the shared menu tokens consumed by ContextMenu and
Menubar.

`src/ui/input-group.tsx` is also a public themed family that shares tokens with
related adapters; it is not merely an internal token module.

## Executable Stories Harness

The stories harness is the executable catalog for `src/ui`.

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
from `/src/ui/<family>`.

Use args for serializable state, `render` for composed JSX, `setArg` for
controlled interactions, and `play` for durable behavior contracts.

## Implementation Checklist

Before adding UI behavior, decide its owner:

1. General host or interaction behavior belongs in `ajo-cloves`.
2. Component semantics or shared family policy belongs in `ajo-ui`.
3. Classes, icons, and visual composition belong in `src/ui`.
4. Product-only composition stays in the application.

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
pnpm test:unit
pnpm stories:test --port <free-port>
pnpm test:e2e
pnpm build
pnpm test:prod
```
