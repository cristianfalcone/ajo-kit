# ajo-ui + ajo-cloves consolidation — closed historical snapshot

> **CLOSED AND SUPERSEDED.** This file preserves the pre-publication audit,
> plan, decisions, and completion evidence closed on 2026-07-11.

> Findings and slices below describe the tree observed at that time. Current
> architecture lives in `ai/architecture.md` and the package READMEs.

Current baseline: the repository uses Ajo `0.1.35`. General protocol,
lifecycle, callback/ref, cache, environment, and numeric primitives belong to
`ajo-cloves`.

Component-system helpers belong to `ajo-ui/utils`. This includes
`OmitArg`, `FixedArgs`, `withSlot`, boolean normalization, string
normalization, and filter policy.

`src/ui` is only the themed Playa adapter. The removed `menu-slots.tsx` and
`slots.tsx` modules are not current seams.

Combobox was folded into Select. DatePicker was folded into InputDate.
Historical mentions below preserve migration evidence; neither is a current
module or public family.

The original goal was to make `ajo-cloves` and `ajo-ui` read as one designed
system rather than islands accumulated across iterations.

Read the closure record in `ai/cloves.md` when interpreting the historical
deferrals and native-first verdicts below.

## Historical verdict summary

- `ajo-cloves` is in excellent shape: micro, evidence-driven, tested (24 files,
  ~280 unit tests), documented. Only polish items (§C).
- `ajo-ui` is functionally rich but visibly layered in generations:
  - **Gen A (pre-`floating`)**: dropdown-menu, select, navigation-menu,
    combobox — each re-implements the popup engine inline.
  - **Gen B (`floating`)**: popover, tooltip — the intended architecture
    (`ai/architecture.md` documents `floating.ts` as THE composition point).
  - **Composition layer (the model to generalize)**: context-menu and menubar
    over dropdown-menu; drawer and command-dialog over dialog; date-picker over
    popover + calendar; accordion over collapsible; toggle-group over toggle;
    combobox-input over input-group.
  - **Islands**: data-table (uses zero cloves and zero sibling components),
    chart, toast, sidebar, message-scroller (partial).
- The single biggest win is finishing the `floating` migration (§B1): one popup
  engine instead of six, which erases the largest duplicated-subtlety surface
  in the package.

## A. Historical layering constraint

`src/ui/*` imports from `ajo-ui`; `ajo-ui` imports from `ajo-cloves`;
`ajo-cloves` imports only `ajo`. This layering remains current.

At the snapshot, `floating.ts` and `menu-slots.tsx` were internal seams.
The slot modules were later removed; `withSlot` now lives in
`ajo-ui/utils`.

## B. Historical ajo-ui findings

### B1. The popup engine exists 6× (HIGH — do first)

`floating.ts` composes `controlled` + `anchor` + `dismiss` + native Popover
show/hide + `toggle`-event echo (WeakSet `watched` + `syncingPopover` flag).
Only popover and tooltip consume it. Meanwhile:

| Re-implementation | File | Divergences (= bug surface) |
|---|---|---|
| DropdownMenuRoot | dropdown-menu.tsx | own watched/syncing/toggle echo, own sync(), focus edge on open |
| DropdownMenuSubRoot | dropdown-menu.tsx | manual `hidden` + `zIndex '60'`, no dismiss, parent-coupled reset |
| SelectRoot | select.tsx | toggle echo WITHOUT the `syncing` guard; own sync/focus logic |
| NavigationMenuItemRoot | navigation-menu.tsx | toggle echo routes through root value; no dismiss |
| ComboboxRoot | combobox.tsx | `popover="manual"` + `dismiss` clove instead of toggle echo; manual `data-state` |

Concrete divergences worth fixing exactly once:

- Only floating-based content resets the UA popover stylesheet
  (`inset:auto;margin:0` via `contentStyle`, itself duplicated ×3 in popover /
  tooltip / navigation-menu). Dropdown/select/combobox content does not reset
  `inset`/`margin`; with the UA `[popover]` rules (`inset:0; margin:auto;
  width:fit-content`) plus `anchor()` writing only `left/top`, auto margins can
  re-center the box between the written `left` and the UA `right:0`. Stories
  pass today (wrapper CSS likely masks it), but this is a latent positioning
  divergence — the reset belongs in ONE place.
- The `toggle` echo (light-dismiss ↔ state sync) has three variants: with
  syncing flag (floating, dropdown), without (select), absent (combobox).
- `anchor()` placement options read from `content.dataset.*` in four files with
  slightly different defaults (sideOffset 4 / 6 / 8, padding 4 / 8).

**Plan:** finish the migration — move select, dropdown-menu (root and sub),
navigation-menu item, and combobox onto the one engine. Parameterize
`floating()` with what the holdouts need: popover mode (`auto`/`manual`),
optional toggle echo, `onSync(open)` hook for focus side-effects, and the
existing `reference`/`dismiss` options (already there). Fold the hover
machinery in as an option (§B2) so the engine covers all trigger modes. THEN,
with six consumers as evidence, promote the DOM-only core to `ajo-cloves` as a
`popup` clove (it is host + element closures, no JSX — fits the clove shape the
same way `label` does); `ajo-ui` keeps only per-family attr wiring. Promotion
is step 2, not step 1: land the migration inside `ajo-ui` first.

### B2. PopoverHoverRoot ≈ TooltipRoot (HIGH, pairs with B1)

`popover.tsx` contains two full root implementations (click/hover) and
`tooltip.tsx` a third that is ~90% the hover one: same `floating()` config
shape, same `hover` zones (trigger/content/focus-trigger/focus-content), same
register* callbacks, same trigger event wiring. Tooltip adds only skip-delay
(provider) and `role=tooltip`. Extract one internal hover-surface builder (or
an `openOn: 'click' | 'hover'` option on the engine with
`openDelay`/`closeDelay`); Popover and Tooltip become thin roles over it.

### B3. Four item/collection protocols (HIGH)

Menus, select, combobox, and command each define their own item protocol:

| Family | marker attr | highlight model | label source | discovery |
|---|---|---|---|---|
| dropdown/context/menubar | `data-menu-item` | `data-highlighted` + focus | `data-label` | querySelectorAll + offsetParent |
| select | `data-slot="select-item"` | context `highlighted` + focus | `data-label` | querySelectorAll + data-disabled |
| combobox | `data-combobox-item` | virtual (`aria-activedescendant`) | stringValue/slug | querySelectorAll + hidden |
| command | `data-command-item` | value-as-selection (`data-selected`) | `data-value` | querySelectorAll + hidden + offsetParent |

The *strategies* legitimately differ (focus vs virtual vs value); the
*mechanics* do not: query visible items, filter disabled, resolve one, mark it,
clear the rest, scrollIntoView. Duplicated helpers: `items()`, `focusItem()`,
`clearHighlight()`, `edge()`, `pointerHighlight()` (dropdown-menu), plus
context-menu's ContextMenuRoot re-implements `focusFirst` with its own
querySelector chain instead of reusing dropdown's.

**Plan:** one internal `collection.ts` module in `ajo-ui`: a single item attr
protocol (`data-item`, `data-value`, `data-label`, `data-disabled`) plus
`items(root)`, `focusItem`/`highlightItem` (focus and virtual strategies), and
`edge()`. All four families and `roving`/`typeahead` calls feed from it. Keep
it `ajo-ui`-internal (no external consumer → not a clove yet, per doctrine).
Fixes command's `__commandSelect` element expando too (§B10).

### B4. Trigger/content attr bags (MEDIUM)

Every family hand-writes the same trigger wiring: `aria-controls`,
`aria-expanded`, `aria-haspopup`, `data-state`, id adoption
(`id ?? view.triggerId`), `setTrigger` + `callRef` composition, click toggle
with `defaultPrevented` guard. Same story for content (`id`, `popover` mode,
`data-state`, `aria-labelledby`, `tabindex="-1"`, style reset). The cloves plan
already names the idiom: **attr bags**. Add `triggerAttrs(view, opts)` and
`contentAttrs(view, opts)` builders (internal, or as part of the `popup` view)
and spread them; per-family components keep only their deltas.

### B5. Micro-utils duplicated (LOW effort, HIGH consistency payoff)

Verified by grep:

- `text()` (children → string): 7 copies (dropdown-menu, menubar, select,
  combobox, command, navigation-menu, chart — combobox/chart variants differ
  slightly). → one `utils.ts` export.
- `slug()`: 3 copies (tabs, command, combobox). → utils.
- `join()` class combiner: 4 copies (drawer, slider, toast, data-table); we
  ship `stlx` for styles but no class counterpart. → export `clx()` (or reuse
  `stlx` naming family) from utils.
- `clamp()`: 4 copies in ajo-ui + 2 in cloves (anchor, follow). → utils (and
  cloves `core.ts` keeps its own; cross-package sharing not worth a dependency).
- `number()`/`numberValue()` coercion: slider, progress, toast, chart. → utils.
- `bool()`: checkbox + radio-group. → utils.
- `let nextId = 0`: combobox and navigation-menu missed the `id()` migration
  that ai/cloves.md explicitly records as replacing these copies. → `id()`.
- `callHandler` exists in utils but 33 inline `typeof onX === 'function'`
  checks remain across 9 files. → adopt `callHandler` (and `callRef`)
  everywhere.
- Boolean data-attr conventions: three styles coexist —
  `x ? 'true' : undefined`, `x || undefined`, `truthyAttr(x)` (which yields
  boolean `true`, a fourth serialization). → pick ONE (`'true'`/absent is the
  most common), provide a `flag()` helper, and reserve `'true'/'false'` strings
  for ARIA attrs that need explicit false.

### B6. Cloves that exist but are not used where they should be (MEDIUM)

- **accordion.tsx** re-implements arrow/Home/End navigation (`focusTrigger`)
  — exactly `roving` with `orientation: vertical`. Migrate.
- **message-scroller.tsx** hand-rolls two rAF handles (`frame`,
  `initialFrame`) despite public `frame()`; the app-side rAF sites were already
  migrated per ai/cloves.md, this file was missed. Migrate the coalescible one;
  the one-shot initial-scroll rAF can stay if `frame()` doesn't fit.
- **data-table.tsx** uses zero cloves: row selection is `selection`'s exact
  contract (multi over string ids — would make it the clove's second consumer),
  result-count/filter changes are an `announce` use case, header ids an `id()`
  use case. See §B9.
- **dialog.tsx** close-echo (`watched` WeakSet + `syncing` flag around native
  `close`) is the same echo shape as floating's toggle echo — if B1 lands an
  `echo` helper, dialog should share it.

### B7. Theming/i18n leaks in the unstyled package (MEDIUM)

- **drawer.tsx** hardcodes `class="i-lucide-x block size-4"` (UnoCSS icon) and
  literal `Close` / `Drag to close` strings — the only file in the package that
  bakes in icon classes instead of taking `iconClass`/children args.
- **sidebar.tsx** hardcodes theme dimensions (`--sidebar-width:16rem` etc.), a
  persistence policy (`document.cookie sidebar_state`, 7-day max-age), and a
  breakpoint (`max-width: 767px`). Make them args (`style` vars already
  mergeable; `persist?: (open: boolean) => void`; `mobileQuery?: string`).
- Hardcoded English AT/UI strings without an override arg (inventory):
  calendar (`Previous month`, `Next month`, `Month`, `Year`), combobox
  (`Select...`, `Clear selection`, `Remove`, the `N results` announce format),
  command (`Command Palette`, `Search for a command to run...`, `Type a command
  or search...`), data-table (`Filter rows...`, `No results.`, `Rows per
  page`, `Page N of M`, `N of M row(s) selected.`, `Select row`, ...), toast
  (`Notifications (F8)`, `Close`), carousel (`Previous slide`, `Next slide`),
  message-scroller (`Messages`, `Scroll to end/start`), slider (`Slider`,
  `Slider thumb N`), input-otp (`One-time password`), sidebar
  (`Toggle Sidebar`). **Policy decision needed:** every user-visible or
  AT-visible string must be overridable via an arg (keep the English default).
  Prefer flat args (`labels`-style bags only where a family has many, e.g.
  data-table).

### B8. Sidebar composition (MEDIUM)

The mobile branch renders a raw `<dialog>` with its own open/close/backdrop
wiring instead of composing Dialog (or Drawer, which already has the
edge-panel semantics + drag-to-close). The `tooltip` arg on SidebarMenuButton
renders a `title` attribute, not Tooltip. Both are "islands" the user's goal
statement targets: compose Drawer for mobile; either wire Tooltip or rename the
arg (`title`) so it doesn't promise a component it doesn't use.

### B9. DataTable is the biggest island (MEDIUM-HIGH, design decision)

data-table.tsx is a 700-line monolith: no cloves, no sibling components, its
own renderer-injection protocol (`renderers.checkbox/facet/pageSize/...`), its
own `join`/`asText`, default renderers that emit raw `<details>`, checkboxes
and selects, and a `classes` bag with 30+ keys that mirrors what every other
family solves with compound components + `*Class` args.

Two coherent options; pick one and commit:

1. **Compound refactor (recommended):** `DataTable` root becomes a state
   provider (context) using `selection` (rows), `announce` (filter results),
   `id()`; structural slots (`DataTableToolbar/Search/Facet/ColumnToggle/
   Table/Pagination/...`) render through the same slot conventions as the rest
   of the package, defaults composing Checkbox and Select. Renderer-injection
   disappears; theming happens where it happens everywhere else.
2. **Headless engine:** keep the renderer protocol but then strip the default
   renderers to nothing (they are neither accessible nor consistent today) and
   document it as a state engine, not a component family.

Option 1 matches the package's design language; the theme layer (src/ui) is
already the only real consumer and can absorb the API change.

### B10. Command polish (LOW)

- `__commandSelect` expando stores the `onSelect` callback on the DOM element.
  Replace with the collection protocol (§B3) — e.g. resolve the item and call
  a context-registered handler map keyed by value, or dispatch from the item's
  own `set:onclick` (items already have one).
- Command duplicates the empty/group hiding sweep that combobox also does
  (hidden bookkeeping in microtasks) — the collection module can host one
  `syncVisibility(root)` used by both.

### B11. Native-input trio consistency (MEDIUM)

Checkbox, Switch, and RadioGroup are three different architectures for the same
"native input + indicator slots" idea:

- Switch: `controlled` clove, `onCheckedChange(checked, event)` ✓.
- Checkbox: no state clove, DOM-sync via `stateFromInput`, and NO change
  callback (consumers must use `set:onchange`) — asymmetric with Switch and
  with DropdownMenuCheckboxItem (which does have `onCheckedChange`).
- RadioGroup: context + querySelectorAll DOM-sync sweep, `onValueChange` ✓.

Native-first is right (recorded decision), but the public API should be
symmetric: give Checkbox `checked/defaultChecked/onCheckedChange` (thin over
the native input, no behavior change), and align the internal sync idiom
(one `syncInput` helper serving checkbox + radio).

### B12. API consistency sweep (LOW each, do as one pass)

- Event parameter: `onOpenChange(open)` in Toast and Sidebar lacks the `event`
  every other family passes. InputOTP uses `onChange(value)`/`onComplete` —
  rename to `onValueChange(value, event)` (+ keep `onComplete`) for symmetry.
- DataTable `onRowSelectionChange(rows, ids)` — fine, but add `event` if the
  compound refactor (§B9) touches it anyway.
- Context export policy: `RadioGroupContext`, `ToggleGroupContext`,
  `CollapsibleContext` are exported; Select/Menu/Combobox/Dialog contexts are
  not. Decide: export none except where cross-family composition requires it
  (accordion→collapsible is the precedent), and document that rule.
- `withSlot` is used by context-menu/menubar; drawer hand-writes the identical
  wrapper pattern for its 6 dialog re-exports. Use `withSlot` (and consider
  renaming the module `slots.tsx` since it is no longer menu-specific).
- data-state vocabulary is per-family (`open/closed`, `checked/unchecked`,
  `active/inactive`, `on/off`, `complete/incomplete`...). Fine — but write the
  vocabulary down in the README so themes can rely on it.
- `DirectionProvider`/`useDirection` has ZERO consumers; tabs/roving/grid take
  `dir` args instead. Either wire `useDirection()` as the default for those
  args (fits the parked repo-wide RTL pass) or delete the module until that
  pass happens. Do not ship a dead provider.
- `emptyChildren` in utils has no consumer in the package (only theme-side
  potential). Verify src/ui uses it or drop it.

### B13. Robustness notes (LOW, opportunistic)

- `anchor()` observes anchor/target elements captured at `watch()` time; a
  content ref change while watching leaves the observer on the stale node.
  `resize`'s leak-proof retarget contract already solves this shape — reuse it
  or re-observe in `place()`.
- Toaster measures item heights with a per-render microtask sweep; a `resize`
  observation on the viewport would be cheaper and less chatty. (Module store
  design itself is a recorded decision — do not touch.)
- Popover/tooltip/nav-menu `contentStyle` (§B1) unifies into the engine.

## C. Historical ajo-cloves findings

- `grid()` accepts `host` and voids it — fine for signature uniformity, but
  say so in its TSDoc.
- `dismiss`'s outside channel binds one `document` pointerdown per instance;
  the plan text aspired to a shared listener. At current scale per-instance is
  fine — record the deviation in the README/architecture doc instead of
  changing code.
- `selection` has one consumer (toggle-group); DataTable's row selection (§B9)
  is its natural second consumer — keeps the no-consumer-no-clove rule happy.
- Candidate promotions FROM ajo-ui (in order of evidence):
  1. `popup` — the floating engine core after B1 lands (6 consumers).
  2. `collection` — only if a non-ajo-ui consumer appears; otherwise stays
     internal.
  3. Nothing else: `text`/`slug`/`clx` are hostless utilities (doctrine says
     utils, not cloves); carousel snap-tracking and message-scroller's
     follow-bottom engine stay single-consumer (parking lot).
- Respect the recorded deferrals: `press`, `spin`, `swipe`, `lock`, `inert`,
  `focusing` stay parked; toast module store stays; dropdown submenu's
  parent-coupled reset stays inline unless the `popup` engine absorbs it
  without contorting `controlled`.

## D. Historical proposed slices

Each slice ends with `pnpm exec tsc --noEmit`, unit tests, and stories smoke
green, consumers actually migrated (house rule).

1. **Utils + mechanical consistency** (§B5, parts of §B12): shared
   `text`/`slug`/`clx`/`toNumber`/`clamp`/`flag`; `callHandler`/`callRef`
   adoption; `nextId` → `id()`; accordion → `roving`; message-scroller →
   `frame()`; boolean-attr convention; event params (toast/sidebar/input-otp);
   Checkbox `onCheckedChange`. Pure refactor, no behavior change intended;
   stories are the guard.
2. **Popup engine unification** (§B1, §B2, §B4): extend `floating()` (popover
   mode, toggle-echo switch, hover mode, onSync hook, attr bags); migrate
   select → dropdown-menu (root+sub) → navigation-menu → combobox, one
   component per task; collapse PopoverHover/Tooltip onto the hover mode; one
   `contentStyle` reset. Then evaluate promotion to `ajo-cloves` as `popup`.
3. **Collection module** (§B3, §B10): single item protocol + focus/virtual
   highlight strategies; migrate menus, select, combobox, command; kill the
   `__commandSelect` expando; share the visibility sweep.
4. **Island composition** (§B7, §B8, §B9): drawer args for icon/strings;
   sidebar (drawer composition, persistence/breakpoint/vars args); data-table
   compound refactor with `selection`/`announce`/Checkbox/Select; string
   override args per the i18n policy.
5. **Docs + polish** (§B12 rest, §C): README conventions (data-state
   vocabulary, slot/`*Class` arg conventions, attr bags, context export
   policy); DirectionProvider wire-or-drop; cloves TSDoc/architecture notes;
   `anchor` retarget fix.

Slices 1–3 are ordered by dependency (3 builds on 2's engine landing in the
menus). Slice 4 can run in parallel with 3 except data-table (independent).
Codex task sizing: each migration bullet inside a slice is one closed spec.

## Historical completion record

- Phase: COMPLETE (2026-07-08) — all five slices implemented and verified.
  Per-slice acceptance: `pnpm exec tsc --noEmit` clean, 280 unit tests, and
  the full stories smoke (381) green after slices 1, 2, 3, and 4. Final
  acceptance after slice 5: tsc clean, 281 unit tests (the `anchor` observer
  retarget landed with a new regression test that first caught a
  disconnect-count contract break in the initial cut), 381 stories, and the
  full e2e suite (47) green.
- Slice 1 shipped: shared `text`/`slug`/`clx`/`toNumber`/`clamp`/`flag`/`bool`
  in `ajo-ui/utils` (all grep-verified duplicates removed); `callHandler`/
  `callRef` adopted at every remaining inline handler check (33 sites);
  `nextId` counters in combobox/navigation-menu → `id()`; accordion →
  `roving`; message-scroller rAF sites → `frame()`; boolean state attrs
  unified on `flag()`; event params added (Sidebar `onOpenChange`, InputOTP);
  InputOTP `onChange` → `onValueChange(value, event)`; Checkbox gained
  `onCheckedChange`; Toast's never-called `onOpenChange` deleted;
  `truthyAttr` removed (last consumer migrated).
- Slice 2 shipped: `floating.ts` rewritten as the two-layer popup engine —
  `surface()` (positioning + native-popover show/hide, stateless) and
  `floating()` (controlled + ids + toggle echo with syncing guard + optional
  hover intent + dismiss + `onSync` hook + `init()` silent seed). Migrated:
  popover (click and hover roots collapsed into one shared generator body,
  thin per-mode shells preserve remount-on-mode-change), tooltip, select,
  dropdown-menu root, dropdown submenu (open cluster stays custom per the
  recorded decision; positioning through `surface()`), navigation-menu item
  (fully root-controlled through the engine), combobox (engine dismiss
  replaces its inline `dismiss` call). `popupStyle()` applies the UA popover
  reset for ALL six families (dropdown/select/combobox previously relied on
  the theme's CSS reset). Trigger-id adoption now invalidates inside the
  engine. BUG found and fixed during migration: the first engine cut created
  `anchor()` eagerly, and `anchor` evaluates placement closures at setup —
  consumers whose closures dereference their own view binding crashed at
  mount and looped the stories app (microtask starvation); `surface()` now
  creates the positioner lazily, restoring the original contract.
  Promotion to `ajo-cloves` as a `popup` clove EVALUATED AND DEFERRED: all
  six consumers are inside `ajo-ui` (one consuming package) — the
  no-consumer-no-clove rule keeps the engine internal until an external
  consumer appears.
- Slice 2 follow-up shipped (2026-07-11): §B4 is now closed. Internal
  `datasetPlacement`, `contentAttrs`, and `triggerAttrs` builders in
  `floating.ts` single-source the shared placement/DOM protocol across
  Popover, Tooltip, Select, DropdownMenu, InputDate, and DialogTrigger.
  The bags compose internal registration before caller refs, and the engine
  adopts explicit content ids so trigger relationships stay coherent.
  Family-specific ARIA, tabindex, state timing, native-popover mode, constant
  Dropdown padding, roles, markers, and event policy remain explicit at each
  caller.
- Slice 3 shipped: `collection.ts` — `data-item="<kind>"` item protocol
  (kind prevents cross-matching in nested families) with `items()` filter
  options preserving each family's exact semantics (menus keep disabled items
  focusable per APG; combobox/select skip layout checks), `focusItem`/
  `highlight`/`clearHighlight`/`edge`/`item(event)`/`attrs()` bags, and
  `sweep()` for group/empty hiding (force-mount aware). Migrated menus
  (dropdown + context-menu's focusFirst), select, combobox, command; killed
  command's `__commandSelect` element expando (WeakMap registry via
  `registerItem` context method); story selectors updated. Menubar and
  navigation-menu TRIGGER rows (different disabled mechanism, roving over
  buttons) intentionally stay on their own queries.
- Slice 4 shipped: drawer close button icon/labels are args
  (`closeIconClass`/`closeLabel`/`handleLabel`; the lucide class moved to the
  theme); sidebar gained `persist` (default keeps the cookie; `false`
  disables) and `mobileQuery` args, label overrides on Trigger/Rail, and the
  `tooltip` arg is documented as a native title hint; calendar gained
  `previousMonthLabel`/`nextMonthLabel`/`monthSelectLabel`/`yearSelectLabel`;
  combobox gained `resultsLabel` (announce format), `clearLabel`,
  `removeLabel`. DataTable: adopted `selection` (second consumer of the
  clove; selection events now carry the DOM event) and `announce` (filter
  result counts), added the `labels` bag for every built-in string, and the
  default renderers now compose the base Checkbox. VERDICT recorded (revises
  §B9): the renderer-injection protocol STAYS — it is the composition seam
  through which the theme supplies its styled compound components (theme
  DropdownMenu/Select/Checkbox/Table already flow through it); a base-level
  compound split would weaken that. Native `<details>`/`<select>` defaults
  stay per native-first. Sidebar mobile-Drawer composition DEFERRED to the
  theming pass (it would switch the mobile panel to top-layer modal — a
  visual-contract change to decide with the theme).
- Slice 5 shipped: `DirectionProvider` is now consumed — tabs and calendar
  resolve `dir` from `useDirection()` when the arg is absent; `anchor` clove
  got the leak-proof observer retarget (re-observes the live anchor/target
  pair on `place()`, same contract as `resize`); `grid` documents its unused
  host param; `menu-slots.tsx` → `slots.tsx` with drawer's six re-exported
  parts on `withSlot`; ajo-ui README rewritten with the system architecture
  and conventions (data-state vocabulary, `*Class` args, labels policy,
  context export policy, boolean-attr convention); architecture.md updated to
  the implemented truth. `dismiss`'s per-instance document listener recorded
  as accepted (shared-listener aspiration dropped at current scale).
- Post-consolidation fix round (2026-07-09), all Playwright-verified against
  live stories plus tsc/281 unit/381 stories green:
  - Menus: keyboard movement now stays inside the surface that owns focus
    (`surfaceItems`/`focusEdge` over the collection) — an open submenu cycles
    only its own items at any nesting depth; ArrowRight on a
    pointer-opened submenu now enters it instead of no-opping.
  - Sidebar: the theme's desktop styles are `lg:`-gated while the base
    flipped to mobile at 767px, leaving a broken full-width band between the
    two — the themed SidebarProvider now passes
    `mobileQuery '(max-width: 1023.98px)'` (the slice-4 arg working as
    designed) and the mobile dialog is fixed-positioned.
  - CLASS-CONFLICT BUG CLASS (record): clsx does not resolve conflicting
    utilities and stylesheet order wins, so stacking `buttonVariants()` size
    output (h-9 px-4 py-2) under `p-0 size-[var(--cell-size)]` left calendar
    nav buttons with a ZERO content box — flex-shrink crushed the icon spans
    to 0px width (invisible icons, hover-only ghosts). Fixes: `size: 'none'`
    added to buttonVariants for compositions that own their dimensions
    (calendar nav uses it), and the same conflict removed from the
    date-picker content (`w-72 p-4` vs `w-auto p-0`). Grep for stacked
    size/padding utilities when porting shadcn recipes — tailwind-merge
    semantics do NOT carry over.
  - Calendar: nav icons follow the house `*Class` convention now
    (`previousIconClass`/`nextIconClass` render a fresh span; the old
    `previousIcon`/`nextIcon` Children args remain as overrides).
  - Calendar caption is a flat sibling row now: prev button / spacer,
    label-or-dropdowns (`min-w-0 flex-1`), next button / spacer — the
    absolute-positioned `calendar-nav` container is gone ('nav' removed from
    CalendarClassName; `navSpacerClass` added). A wide month select grows the
    whole calendar instead of colliding with the prev button; multi-month
    grids keep alignment via the spacers.
  - Calendar day grid grows with the calendar width: columns are
    `repeat(7, minmax(var(--cell-size), 1fr))` (week-number column stays
    fixed) and the themed day cell/button dropped `aspect-square`/fixed size
    for `h-[var(--cell-size)] w-full min-w-[var(--cell-size)]`, so days
    distribute evenly when the caption widens the month.
  - Carousel vertical story reserves the button overhang (`my-12`).
  - Stories harness: theme cycling now reaches canvas iframes. The iframe
    URL pins its creation-time theme and the cross-window storage event made
    the embedded App resync through `readTheme()` (URL-first), overriding
    the parent's render-story message. Resync now takes the stored value
    directly; the theme query param only seeds the first paint.
  - `collection.sweep` sweeps separators too (new `separator` option, wired
    in combobox and command): a separator survives only between visible
    items — leading/trailing/stacked separators hide as filtering empties
    groups. This also killed the empty-state horizontal scrollbar: orphan
    separators carry `-mx-1` and the empty state drops the list padding, so
    they overflowed the scrollport. Combobox listBase also gained
    `overflow-x-hidden` (command already had it). Regression play added to
    the combobox Groups story.
