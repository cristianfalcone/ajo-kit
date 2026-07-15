# ajo-ui

Unstyled base UI components for Ajo. Each module implements one component
family's behavior, accessibility contract, and slot structure on top of
[`ajo-cloves`](../ajo-cloves), leaving all visual styling to the consuming
theme.

`ajo-ui` is the private transitive base of `ajo-ui-playa`. Applications using
Playa install and import `ajo-ui-playa`, not this package. Direct installation
is for authors building an unstyled integration or another theme.

## Install

```bash
pnpm add ajo-ui ajo
```

`ajo-ui` has one peer dependency: `ajo >= 0.1.35`.

## Usage

Import per module to keep the graph explicit:

```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'ajo-ui/accordion'
import { Popover, PopoverContent, PopoverTrigger } from 'ajo-ui/popover'
```

The root export exposes every public component family:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'ajo-ui'
```

The package export map is explicit: only the root, `ajo-ui/utils`, and one
subpath per public family resolve. Source-internal helpers never become package
subpaths merely because a file exists.

General Ajo host/lifecycle helpers come from `ajo-cloves`; component-system
normalization, slot, class, and style helpers come from `ajo-ui/utils`:

```tsx
import { callHandler, callRef, dom, listen, statefulRootAttrs } from 'ajo-cloves'
import { clx, flag, stlx, text, withSlot } from 'ajo-ui/utils'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
```

## Architecture

The package is one system, not a set of islands. The dependency direction is
`ajo-cloves` (general behavior and lifecycle) -> `ajo-ui` (unstyled component
interfaces) -> `ajo-ui-playa` (theme-only adapters and build-time preset) ->
application. `ajo-ui-playa` declares this package as a regular dependency, so
it remains transitive and private to Playa applications.

The repository-level technical reference is [`ai/ui.md`](../../ai/ui.md).
Its main implementation seams are:

- **The popup engine** (`floating.ts`, internal) is the single implementation
  of anchored popups: controlled open state, generated ids, `anchor`
  positioning, native Popover show/hide with `toggle` echo, optional hover
  intent, and dismissal. Popover, Tooltip, Menu (root and submenus),
  Select, and NavigationMenu all run on it; per-family code is only
  role/ARIA wiring and behavior policy. `popupStyle()` applies the UA popover
  stylesheet reset exactly once.
- **The item collection** (`collection.ts`, internal) is the single item
  protocol for list-like families: items are marked `data-item="<kind>"` and
  carry `data-value`, `data-label`, and `data-disabled`; the kind keeps nested
  families from cross-matching. Menus, Select, and Command discover,
  focus, and highlight items through it, and `roving`/`typeahead` from
  ajo-cloves consume its item lists.
- **One Select**: single, multiple, searchable, editable, chips, and tagging
  are one family whose mode emerges from composition — the field part
  (SelectTrigger, SelectInput, or SelectChips) decides the focus model. See
  [`ai/ui.md`](../../ai/ui.md) for the complete interaction contract.
- **The bar machine** (`bar.ts`, internal) owns the open-value + roving +
  typeahead + follow policy under Menubar and NavigationMenu; Toolbar (APG
  toolbar) covers arbitrary controls in a bar with the same single-tab-stop
  discipline. Menu exports its substrate contract (MenuContext, the
  menu collection, focusEdge, MenuAnchor) for composing families —
  ContextMenu anchors at the pointer through it. The `anchor` clove also
  positions optional arrow parts (PopoverArrow, TooltipArrow). The toast
  viewport rides the raw `popover="manual"` primitive (top-layer stacking
  above modals), and while a modal Dialog is open the Toaster re-homes its
  toasts into the dialog's `data-slot="dialog-portal"` outlet through a
  second render root — everything outside a modal's subtree is inert, so
  only there do toasts stay clickable and announced; Sidebar's mobile branch
  composes Drawer.
- **The date-field engine** keeps one `FieldView` per range side in
  `segments.ts`. InputDate, InputTime, and InputDateTime render its
  locale-ordered segments; `InputDateTimeField` renders only the same view's
  time run inside the optional popup. Field and popup are separate focus/ARIA
  surfaces, not separate value models. The popup runs on `floating.ts` and
  composes the standalone Calendar family.
- **The availability engine** (`availability.ts`, internal) compiles the one
  matcher grammar once per source/time-zone change and serves Calendar days,
  date/time field validation, and range-crossing checks. `disabled` is the
  hard, skipped selection channel; `unavailable` remains focusable and
  committable, then stamps reason-coded invalid state in the field family.
- **One Calendar root** owns day, month, and year views. A single `grid` clove
  resolves keyboard navigation at every scale; `minView` decides whether a
  month/year cell drills down or commits a whole period. Month/year range
  values remain day-granular and inclusive at the public Date boundary.
- **VirtualList owns one scrollport**: `virtual-list.tsx` exposes the small
  generic `VirtualList<T, Key>` family, while private `virtual.ts` binds
  `@tanstack/virtual-core@3.17.4` to Ajo lifecycle, immutable snapshots,
  keyed measurement, SSR prerendering, focus pinning, and imperative
  targeting. TanStack types and options never cross the package surface.
- **DataTable owns one paginated model**: private top-level contract and model
  modules keep TanStack behind the public family. The model binds the explicit
  `@tanstack/table-core@9.0.0-beta.47` profile to
  `@tanstack/store@0.11.0` and Ajo lifecycle.
- **DataTable owns one renderer**: `data-table.tsx` emits native markup and
  stable slots. Playa's Menu, Select, and DataTable adapters consume the same
  named Uno shortcuts instead of copying composed-control recipes.
  `VirtualDataTable` remains deferred until its geometry, accessibility,
  browser, and performance gates pass.
- **Composition over reimplementation**: ContextMenu and Menubar are built on
  Menu; Drawer and CommandDialog on Dialog; the InputDate family's
  optional picker on Calendar; Accordion on Collapsible; ToggleGroup on
  Toggle; CheckboxGroup on Checkbox; SelectInput on InputGroup; DataTable's
  built-in parts on Checkbox, Menu, Select, and Toolbar. `withSlot` from
  `ajo-ui/utils` stamps the fixed part names used by re-exported parts.

## Conventions

- Components are unstyled: they render semantic markup, ARIA wiring, and data
  attributes for state; themes attach classes on top. A static singleton part
  uses a named `*Class` arg (`iconClass`, `indicatorClass`, ...), a themed
  collection uses its scoped `classNames` or `classes` map, and styling that
  depends on state uses a callback such as `dayClassName`. The base never bakes
  in visual classes.
- Theme adapters combine `OmitArg` with `FixedArgs` when they own a base
  composition hook. Both types live only in `ajo-ui/utils`, never in the
  package root or `ajo-cloves`: `OmitArg` preserves the remaining named types
  across Ajo's open Args index, while `FixedArgs` makes owned names reject
  caller values.
- Stateful roots accept plain DOM attrs and forward them through
  `statefulRootAttrs`; event handlers compose through `callHandler` and refs
  through `callRef`. Those general Ajo helpers are owned by `ajo-cloves`.
- Controlled/uncontrolled state always comes in the `value` / `defaultValue` /
  `onValueChange(value, event)` shape (or `open` / `defaultOpen` /
  `onOpenChange`, `checked` / `defaultChecked` / `onCheckedChange`).
- Boolean state attrs render as `data-x="true"` or are absent (the `flag`
  helper); ARIA attrs that need an explicit negative render `'true' | 'false'`
  strings.
- `data-state` vocabulary per family: `open/closed` (popups, disclosure),
  `checked/unchecked` (selection controls), `active/inactive` (tabs),
  `on/off` (toggles), `complete/incomplete` (OTP),
  `loading/complete/indeterminate` (progress), `selected/unselected`
  (Calendar day buttons), and `expanded/collapsed` (desktop Sidebar).
- Every user-visible or assistive-technology string has an English default and
  an override arg (`closeLabel`, `resultsLabel`, `labels`, ...).
- Contexts stay module-private unless another family, the themed layer, or a
  real public consumer needs their view.
  Public context views use the direct `XContext()` interface; do not wrap them
  in React-shaped `useX` accessors. When public consumers need less state than
  structural parts, the Stateful owner writes separate public and private
  contexts instead of leaking internal registrars.
  Mutable context ownership and writes belong to Stateful roots. Stateless
  parts may read the live view or invoke a callback exposed by the owner, but
  never set an Ajo Context.
- `DirectionProvider` supplies the default text direction; families with
  horizontal keyboard navigation accept a `dir` arg that overrides it.
- `availability.ts`, `bar.ts`, `collection.ts`, `floating.ts`, `segments.ts`,
  `virtual.ts`, `data-table-contract.ts`, and `data-table-model.ts` are
  deliberate internal modules with no public subpath. Shared UI normalization
  and composition live together in
  `ajo-ui/utils`; general realm, host, lifecycle, callback/ref, cache, and
  numeric primitives live in `ajo-cloves`.
- Package modules are side-effect-free. Root-barrel imports tree-shake to the
  selected families; `pnpm test:bundle` guards that property and the
  VirtualList incremental gzip budget as part of the standard unit gate.
