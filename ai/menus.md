# Menu families consolidation

Design record for menubar, navigation-menu, command, sidebar, context-menu,
and dropdown-menu: integration gaps, duplication, and repair. Produced from
seven parallel code maps (one per family + a cross-themed token audit) plus a
live Playwright probe of navigation-menu. Status: **implemented**
(2026-07-09), all ten slices. Implementation deviations worth knowing
(each live-probe-verified):

- **`bar.follow()` focus-restoration bounce fix** (not in the map): hiding a
  native popover restores focus to its invoker, which re-runs the follow
  policy and bounces the open value back — follow() moves focus onto the
  followed trigger when focus sits inside the closing surface.
- **Chromium light-dismisses on the source click** regardless of
  `showPopover({source})` and pointerdown preventDefault — navigation-menu
  needed an item-level toggle-echo guard (500ms trigger-press window) on top
  of the engine's intent zones for the hover→click race.
- **Toast/`showModal()` premise corrected empirically**: Chromium does NOT
  hide `popover="manual"` elements on showModal ("hide all popovers" pops the
  auto stack only) — the real failure is stale top-layer ORDER. Fix is
  epoch-gated re-promotion (hide+show in one task, no repaint between) on a
  document-captured modal toggle; pixel-probe verified (dimmed 152,0,0 under
  the backdrop → pure 255,0,0 above it).
- Dropdown trigger modality uses `event.detail === 0` to detect
  keyboard/AT clicks; arrows also ENTER an already-pointer-opened menu
  (otherwise pointer-open would strand keyboard users).
- Toolbar's text-input rule refined per APG: arrows escape a text control
  only from a collapsed caret at the matching edge (dir-aware); skip-always
  would have dead-ended data-table's toolbar behind its search input. A
  4-line guard in toggle-group makes nested group items join the toolbar
  roving (Base UI model).
- Sidebar mobile `data-state` now uses the Dialog vocabulary
  (`open`/`closed`) instead of mirroring desktop `expanded`/`collapsed`;
  themed Sidebar separator/input carry the composed parts' `data-slot` with
  `data-sidebar` as the family handle. Drawer gaps found and worked around
  (content pins data-slot after spread; in-flow root wrappers) — candidates
  for a Drawer touch-up.
- Menubar's ArrowLeft/Right-to-adjacent-menu shipped (~15 lines on top of
  bar()); the shared trigger-row query helper was skipped (three queries
  differ in selector/element type — extraction added indirection without
  deleting duplication).
- **Menu group labels keep `text-sm font-medium`** (the cascading menus'
  own design) — the "text-xs muted" dialect decision applies to the
  select/command heading form only; the `menuLabel` token records this.
- CommandDialog's themed surface re-declares the dialog surface cluster
  (dialog.tsx exports no token yet) — extracting a shared dialog surface
  token belongs to the broader theming session, with command as its second
  consumer.

## Verdict

The composition architecture is sound where it was consolidated: dropdown-menu
is a real substrate (menubar and context-menu re-export its parts via
`withSlot` and inherit panels, items, submenus, dismissal wholesale), command
deliberately sits off `floating()` (dialog-hosted), and everything rides
`collection()` + cloves. The problems cluster in five specific places, in
descending severity:

1. **navigation-menu is functionally broken** — the one family that fails its
   own purpose.
2. **The menu substrate hoards its internals** — context-menu forked
   machinery it should reach.
3. **menubar and navigation-menu hand-roll the same root "bar" machine** —
   already drifting apart.
4. **command predates the unified Select's idioms** — same bug classes select
   already fixed live there.
5. **sidebar hand-rolls what cloves own** and ships two live visual bugs —
   the "island" feeling is real but shallow: ~105 of 575 base LOC are
   behavior, and most of that behavior duplicates `controlled`/`hotkey`
   contracts.

Plus one cross-cutting deliverable: the themed menu tokens are triplicated
byte-for-byte, and two of the three copies carry a dead CSS var that silently
removed their max-height cap.

## navigation-menu (probe-confirmed defects)

Live probe (`ui-navigation-menu--default`): panels open instantly on hover
and **never close on pointer leave**; moving from hover to click **toggles
the panel closed** (hover opened it, click closed it); the viewport measures
**0×0 with its sizing vars never set**, so the panel surface (background,
border, shadow) doesn't render — content floats washed-out over the page;
Escape and trigger roving work.

Code map confirms and extends:

- **Keyboard trap-out (worst bug)**: any Tab from a non-trigger target
  closes the panel (`navigation-menu.tsx:134`) — panels are DOM descendants
  of the nav, so Tab from the first panel link closes it. Every link after
  the first is keyboard-unreachable.
- **Hover has no intent and no close**: a raw `set:onmouseenter` opens
  (`:314-318`); there is no mouseleave path at all. `floating()`'s `hover`
  option (openDelay/closeDelay + hold/release zones, demonstrated in popover
  and tooltip) is unused — even though ai/cloves.md names navigation-menu as
  a hover-clove consumer.
- **No focus into panels**: keyboard open never moves focus in (no `onSync`
  pendingFocus like dropdown/select); combined with the Tab bug, panels are
  keyboard-inaccessible.
- **Viewport and Indicator are inert decoration**: contents render as
  per-item popovers, never into the viewport; no sizing vars exist anywhere;
  `RootContextValue.viewport` is read by nobody; the themed indicator sits at
  a fixed spot, never under the open trigger. The themed panel surface lives
  on the dead viewport — hence the washed-out rendering.
- Smaller: unconditional Escape `preventDefault` even when closed (eats a
  dialog's Escape); `aria-haspopup="true"` announces menu semantics for a
  panel of links (should be expanded/controls only); focus-follow between
  triggers is a no-op wrapper while hover- and arrow-follow work; dead
  `--navigation-menu-side-offset` var; contentStyle wrapper duplicating
  `popupStyle`.

**Resolution — repair + simplify**: compose the engine's `hover` option
(delays + trigger/content hold zones), add `onSync` focus-into-panel, make
trigger focus follow like hover does, replace Tab-closes-everything with
close-on-focus-out (panel links become tabbable; tab past the last link
closes), gate Escape on open, fix `aria-haspopup`, and **delete the inert
Viewport and Indicator parts** — the per-item anchored panels are a complete
nav menu once the themed surface moves onto the content (where select/menu
surfaces already live). The Radix-style morphing viewport is recorded as an
extension point, not rebuilt speculatively (no consumer; no app page uses
this family yet). The hover/click race resolves through the engine's intent
zones (click on a hover-opened trigger holds instead of toggling).

## dropdown-menu substrate: export the reuse contract

- `MenuContext`, `focusEdge`/`surfaceItems`, the `collection('menu',
  { enabled: false })` instance, and `SURFACE_SELECTOR` are module-private.
  context-menu therefore forked a **second** `collection('menu')` with the
  default `enabled: true` — so opening a context menu whose first item is
  disabled skips it while subsequent roving focuses it: two focus policies in
  one menu. README already blesses the sharing precedent (CollapsibleContext
  for Accordion). Export the contract; delete context-menu's fork and its
  hand-rolled `focusFirst`.
- **No anchor part**: context-menu fakes a pointer anchor by rendering the
  composed DropdownMenuTrigger as an aria-hidden `tabindex="-1"` button moved
  with inline left/top — and the `position:fixed` that makes that meaningful
  lives in the THEME (`anchorClass`), so the unstyled base doesn't anchor at
  the pointer. Side effects: the menu is aria-labelledby an empty hidden
  button; close focuses an aria-hidden node transiently. `floating()` already
  has first-class anchor override (`setAnchor`/`reference`; PopoverAnchor is
  the precedent). Expose it through DropdownMenu; context-menu drops the fake
  button, the dead `defaultOpen` forward, and the `anchorClass` hack
  (positional style moves inline into the base; only invisibility stays
  themed).
- In-file dedup: CheckboxItem/RadioItem share ~40 near-identical lines; the
  `activate()` helper is used by only one of the three item kinds; `:201`
  re-inlines SURFACE_SELECTOR reversed.
- Pointer-click on a trigger opens with focus `'first'` — keyboard-focusing
  the first item for mouse users (menubar inherits this visibly). Focus
  intent should follow input modality.
- ContextMenuTrigger: focusable div with `aria-haspopup` but no role and no
  expanded/controls wiring — give it the relationship attrs the fake button
  currently strands.
- ContextMenu's second controlled-open layer stacked on the engine's is
  tolerable once the anchor/focus gaps close (it still owns point state and
  focus restore); revisit only if the anchor work makes it collapsible.

## The shared "bar" machine (menubar + navigation-menu)

`menubar.tsx:105-204` and `navigation-menu.tsx:100-165` implement the same
~60-line machine: `controlled<string>` value ('' = closed), roving over a
trigger DOM query, typeahead, open-follows-focus/hover policy, Tab/Escape
keydown skeleton. The copies already drift (nav's focus-follow is a dead
wrapper; menubar's is live but redundantly doubled through onfocus + onMove,
causing duplicate onValueChange calls to controlled consumers).

**Resolution**: an ajo-ui-internal `bar()` helper (floating.ts-style, not a
clove — one consuming package) owning value + trigger roving + typeahead +
follow policy + Tab-out close. Both families consume it; landing it fixes
menubar's smells in passing: the redundant onfocus path, the disabled
tab-stop trap, Map-insertion-order repair, setValue double-invalidation, the
null-context controlled-closed degradation, and Tab-on-open-trigger leaving
the menu open. The trigger-row discovery triple (`order()`/`triggers()`/
`tabs()` in tabs.tsx) collapses into one shared query helper without
touching the recorded off-collection decision. Menubar keeps its genuinely
unique pieces: the tab-stop register (required by ajo's render semantics)
and per-menu controlled DropdownMenus. APG gaps to include: ArrowLeft/Right
from inside an open menu moves to the adjacent menu (or record as
scoped-out).

## command: converge on the Select idioms

Same bug classes Select just fixed, still live here:

- **slug-based item ids** collide on case/punctuation/non-Latin →
  `encodeURIComponent` (the select fix).
- **Enter can commit a filtered-out item** (resolves via `all()`, hidden
  included, with a stale controlled value) → resolve via visible `items()`
  and let `item.click()` own activation — which also deletes the WeakMap
  handler registry.
- **Dual-writer highlight state**: sync() imperatively rewrites
  `data-selected`/`aria-selected` on every item while the render computes the
  same attrs — and they disagree under a controlled value that filtering
  hides. Single source (render) + microtask staleness cleanup only.
- **Vocabulary**: command marks its active row `data-selected` where the
  whole system uses `data-highlighted` — this blocks the shared row token.
  Adopt `data-highlighted` (keep `data-selected` if a real selected-state
  consumer appears; today it means highlight).
- **No announce**: the palette filters with zero SR feedback; compose
  `announce` + `resultsLabel` exactly like select (the visible count is
  already in hand in sync()).
- API: `shouldFilter: boolean` + score-returning filter → `filter:
  CommandFilter | null` (the house trio); the numeric score was never used.
- Themed CommandDialog re-implements base CommandDialog (drifting defaults,
  lost dialog open animation, forked centering) → themed wraps base; surface
  token comes from dialog's.
- Dead weight: `syncing` flag (cannot observe true), `data-keywords`
  (write-only), `data-command-group` (data-slot suffices), double pointer
  handlers (keep pointermove only).

Command stays a family (selection-follows-highlight has no committed
selection; rebuilding it over Select would force a model it doesn't have —
recorded verdict from the map).

## sidebar: de-island the behavior, keep the structure

The 19 structural slots and layout CSS are fine and family-specific. The
behavior layer is where the island shows:

- **Provider open state** hand-rolls the `controlled` clove contract,
  including a drifted dead write (`:162`). Adopt the clove (the one family
  left off it; ai/cloves.md claims all open clusters ride it).
- **Live bug — invisible themed SidebarSeparator**: the theme applies
  `mx-2 w-auto bg-border` to a height-less div; shadcn's `h-px` lived in the
  composed Separator and was lost in the copy. Themed SidebarSeparator
  composes `Separator`.
- **Hotkey**: hardcoded unconditional `mod+b` — both real app consumers
  mount `collapsible="none"`, so Ctrl/Cmd+B is intercepted app-wide to
  toggle invisible state and write a cookie. Add `shortcut?: string | false`
  + the clove's `active` gate (no-op when collapsible none).
- **Cookie persistence is write-only repo-wide** (no reader exists). The
  `persist` arg shape is a recorded decision and stays; record the read seam
  (kit SSR loader → `defaultOpen`) as the follow-up that makes it real.
- Mobile: `openMobile` changes bypass `onOpenChange` and drop the event
  (controlled consumers can't observe mobile state) — unify the notify path.
- **Mobile composes Drawer (promoted from the recorded deferral — user
  request)**: the hand-rolled non-modal `<dialog>` is demonstrably broken
  (dead backdrop CSS, unreachable light-dismiss, never-firing onclose, no
  Escape/focus-trap/scroll-lock, no accessible name). The base Sidebar's
  mobile branch renders the Drawer family instead — gaining modal backdrop,
  Escape, focus trap, scroll lock, drag-to-close, and the a11y name for
  free, with `side` following the sidebar's own side. The display-mode
  matrix is then complete and orthogonal: desktop `collapsible="offcanvas"`
  (hidden, trigger re-expands — today's default), `"icon"` (rail of icons),
  `"none"` (static), and mobile = Drawer regardless of desktop mode, all
  switched by `mobileQuery`.
- Structure nits: SidebarInput composes Input (near-copy today);
  button/anchor intersection type → discriminated union on `as`; breakpoint
  literal encoded three times (base default twice + themed override) — single
  source; SidebarTrigger/Rail identical click bodies.

## Themed tokens (the shared-token pass, scoped)

The audit verified byte-identical triplication across
dropdown-menu/context-menu/menubar for: menuItem (413 chars), choiceRow,
indicator, menuLabel, separator, shortcut, and all three icon strings; and a
near-identical menuContent whose two copies substitute
`max-h-[var(--dropdown-menu-content-max-height)]` — **a var defined nowhere,
so context-menu and menubar menus have NO height cap** (invalid at
computed-value time). Also: MenubarContent stacks `min-w-[12rem]` over the
base's `min-w-[8rem]` (the recorded class-conflict bug class).

**Deliverable**: one `src/ui` menu-token module (≈40 lines of constants
replacing ≈120 of triplication; min-width as a parameter, not an override),
consumed by the three cascading families — the dead-var bug and min-w stack
fix fall out for free. Plus:

- `scrollAreaVariants` adoption: dropdown/context/menubar content, command
  list, sidebar content (adds `overscroll-contain` — record as deliberate).
- Dialect decisions taken once: `data-[disabled=true]`/`data-[highlighted=true]`
  selector form (works for flag and explicit-false), group-label style
  (text-xs muted — the select/command form), separator/shortcut micro-drifts
  unified (keep `tabular-nums`).
- CommandDialog composes the dialog surface token (regains the lost open
  animation).
- Sidebar: `class` forwarded to both desktop and mobile elements is
  conflict-prone — separate `mobileClass` passthrough. Focus-ring `ring-2`
  drift → `ring-3`.
- Bare-display audit against the UA-popover rule: clean (select's
  `[&:popover-open]:flex` is the only display utility and carries the fix).

The nav-menu themed layer is rewritten as part of its repair (surface moves
from viewport to content). Popover/dialog/toast surface-token unification
beyond these six families stays with the broader theming session.

## New sibling: Toolbar

The bar trio completes the use cases (user request): **Menubar** (menus in a
bar), **NavigationMenu** (link panels in a bar), **Toolbar** (arbitrary
controls in a bar — APG toolbar pattern). Radix, Base UI, and React Aria all
ship one; shadcn does not, which is why the repo lacks it.

- `Toolbar` root: `role="toolbar"`, `orientation`, `aria-label` passthrough,
  single tab stop with arrow-key roving over the enabled focusable controls
  inside (the same `roving` clove + trigger-row query the bar helper owns —
  Toolbar becomes the third consumer of that machinery, minus the
  value/follow policy it doesn't need).
- `ToolbarSeparator` (role separator, orientation-aware). No Toolbar-specific
  button/link parts: Button, ToggleGroup, Select, Input compose inside —
  that is the point of the family. Nested ToggleGroup items join the toolbar
  roving (Base UI's model) rather than double-roving.
- Internal consumer candidate: data-table's facet/search/view-options row is
  a toolbar today in everything but role and keyboard.
- Themed layer: thin (flex row, gap, p-1, rounded, edge) + stories with a
  roving play.

## Popover as the floating base? The engine already is

Evaluated (user question): should Popover be the base component under the
floating menus, and under Tooltip?

- **Two things share the name.** The web primitive — the native `popover`
  attribute (top layer, `showPopover`/`hidePopover`, toggle events, light
  dismiss) — IS the base of everything, and the architecture already
  consumes it at the right layer: `surface()`/`floating()` are the wrapper
  around that native primitive (plus `popupStyle()` for the UA reset), so
  every floating family sits on the web primitive directly. The COMPONENT
  named Popover is just the sibling that exposes the primitive with generic
  semantics — a consumer of the engine, not the gateway to it.
- **The base the question wants already exists one level down**: `floating()`
  is the single implementation of anchored popups (open state, ids,
  placement, native popover show/hide, echo, hover intent, dismiss), and
  Popover-the-component is itself only a thin consumer of it — as are
  Tooltip, DropdownMenu, Select, and NavigationMenu. Component-level nesting
  (menus rendering Popover parts) would stack a second controlled-open layer
  and a second context on every family — precisely the smell this map found
  in context-menu — and force generic-surface semantics under roles
  (`menu`, `listbox`, `tooltip`) that must own their ARIA. The references
  land the same way: Radix and Base UI share a Positioner/Popper primitive
  across families, not a Popover component. So the reuse is real, and it is
  already captured; this plan pushes more INTO the engine (nav-menu's hover,
  the anchor override export) rather than lifting reuse to the component
  layer.
- **Tooltip stays a family**: a hover Popover (PopoverHoverRoot — the
  hover-card shape) is behaviorally close, but tooltip's contract is exactly
  the per-family layer: opens on focus as well as hover, `role="tooltip"` +
  `aria-describedby` on the trigger (not haspopup/expanded), non-interactive
  content, and provider-level shared delay windows. Both already share
  `floating()` + the hover clove; what remains distinct is semantics.

**The two native primitives, and which each family rides** (the decision
rule): `<dialog>` + `showModal()` = *modal conversation* — top layer,
`::backdrop`, focus trap, inert page; the user must respond. The `popover`
ATTRIBUTE (any element) = *non-modal overlay* — always top layer, page stays
interactive, no trap; `auto` adds light dismiss and closes sibling autos,
`manual` coexists. They compose the same top layer, so promotion order
decides stacking. Family map: Dialog/AlertDialog/Drawer/CommandDialog (and
Sidebar mobile once it composes Drawer) ride `<dialog>`; every anchored
floater (menus, select, tooltip, popover, nav-menu, date-picker) rides
`popover` through `floating()`.

**Toast rides the popover primitive too (adopted — user request)**: toasts
are the textbook `popover="manual"` case — non-modal, must not light-dismiss,
must not steal focus, and must render ABOVE open modal dialogs. Today the
toast viewport is `fixed z-100`, so a toast fired while a modal `<dialog>` is
open renders UNDER it (top layer beats any z-index) — a real stacking bug.
Fix: the ToastViewport carries `popover="manual"` and shows itself while
toasts exist (shown after the dialog → promoted above it). No `floating()`
involved — toasts don't anchor, so they consume the raw primitive directly,
which is itself a nice proof of the layering: primitive ≠ engine ≠
component. The toast module store and API are untouched (recorded decision).

**Post-rewrite regression #2 (2026-07-09, fixed)**: center positions
(`top-center`/`bottom-center`) rendered a full half-width off center. The
rewrite added the operative inline `transform:translateX(-50%)` to the base's
viewportInsets while the themed classes kept `-translate-x-1/2` — and that
utility compiles to the separate CSS `translate` property, which STACKS with
an inline `transform` instead of being overridden by it (computed:
`translate:-50%` + `transform:matrix(-210)` = double shift). New class-conflict
bug-class variant: translate/rotate/scale utilities may target the individual
transform properties, so an inline `transform` does not neutralize them.
Fixed by dropping the translate utility from the themed center positions (the
base inline is operative; `left-1/2` mirrors harmlessly); the Position story
play now asserts the viewport center within 2px of the window center.

**Post-rewrite regression (2026-07-09, fixed)**: the rewrite dropped the hover
continuity the 2026-07-04 stacking fix depended on. With a
`pointer-events-none` viewport, hover is carried by the toasts' hit areas
alone; the 8px expanded gaps and the closing toast's `pointer-events:none`
were hit-test holes that fired spurious pointerleave/enter pairs (stack
flicker on gap crossing and on closing the front toast). Re-fixed in the uno
preflight: per-toast `::after` gap bridges (sized by a `--toast-gap` var the
base writes) plus closing toasts staying hit-testable only while
`data-expanded=true`. The Stacked story play asserts both invariants.

**Visible-but-inert decision REVERSED (2026-07-09 — user report)**: painting
above the modal was not enough — everything outside a modal's subtree is
inert regardless of top-layer order (no platform opt-out; whatwg/html #9936
and #10811 are open, and the direction spec editors favor is exactly
"interactive above the topmost modal"). In practice the old behavior was
actively harmful: a click on an inert toast's close button fell through to
the `::backdrop` and light-dismissed the dialog, hover-pause never fired, and
the inert live region was pruned from the accessibility tree, so toasts fired
during a modal were never announced. Fix — the portal outlet: DialogContent
renders a last child `<div data-slot="dialog-portal" skip
style="display:contents">`, and while a modal exposing that outlet is open,
each Toaster re-homes its toasts into it through a second ajo render root
(`render(view, portalMount)` per emit, `render(null, portalMount)` on
teardown; `skip` keeps the dialog's own tree from reconciling the portal
DOM). The root viewport stays shown-but-empty as the persistent live region;
the portal viewport is still `popover="manual"` (nested top layer → paints
above the dialog, and interactive because it IS inside the dialog subtree).
Modals without an outlet (raw dialogs) keep the old visible-but-inert
fallback. Drawer and CommandDialog compose DialogContent, so they inherit the
outlet. No library does this automatically (Base UI ships a manual
`Toast.Portal container`; sonner calls the scenario an anti-pattern) — our
vertical integration of Dialog + Toaster is what makes automatic re-homing
safe. Verified with real-pointer probes (placement, hover-expand inside the
modal, close-click dismissal with the dialog staying open, backdrop
light-dismiss preserved, survivors re-homing to root) and the AboveModal play
now asserts placement, the elementFromPoint hit test, and both re-homes.
Review hardening: keyed outlet (unkeyed matching pairs by tag name, sibling
churn must never claim it), topmost-modal-only portal targeting (lower
outlets are inert under the top backdrop; outlet-less topmost → root
fallback), a modal-window MutationObserver for dialogs that leave the DOM
without a connected toggle, mount-time seeding of already-open modals,
two-phase portal mount (empty region first) so same-task-as-showModal toasts
announce, and root-only viewport `id`. Accepted tradeoffs: six
shown-but-empty portal regions per open modal, and one polite
re-announcement per surviving toast when the modal closes.

## Arrow / caret (adopted — user request)

Missing system-wide (grep: no arrow machinery anywhere) and standard in every
reference (Radix `Popper.Arrow`, Base UI's `Arrow` part on every positioned
family, with `data-side`/`data-uncentered`). Home per the architecture:

- **`anchor()` clove** grows an `arrow?: () => HTMLElement | null` option:
  after placement it positions the arrow at the anchor's center projected
  onto the content edge, clamped to the content bounds minus padding, and
  sets `data-uncentered` when clamped. Rotation comes free from the
  content's existing `data-side` via themed CSS. Unit tests beside
  anchor.test.ts.
- **`floating()`/`surface()`** thread arrow registration (`setArrow` on the
  view).
- **Parts**: `PopoverArrow` and `TooltipArrow` first (where carets are
  conventional); themed as a rotated square matching the glass-overlay/edge
  surface. Menus/select/nav-menu get the seam for free but no part until a
  consumer wants one (menus conventionally ship without carets).

## Recorded extension points / non-goals

- Radix-style morphing viewport + sliding indicator for navigation-menu
  (deleted as inert; rebuild only against a real consumer).
- Menubar ArrowLeft/Right from inside menus to adjacent menus — include in
  the bar helper if cheap, else record as scoped out.
- Sidebar cookie READ seam (kit SSR → defaultOpen).
- Do not re-litigate: submenu parent-coupled reset, trigger rows off
  collection(), native-title rail tooltip, persist arg shape, typeahead
  prevent-only-on-match (all recorded in ai/cloves.md / ai/consolidation.md).

## Migration plan

Each slice is independently landable; order minimizes rework:

1. **Substrate** (dropdown-menu): export MenuContext/focusEdge/collection
   instance; DropdownMenuAnchor (engine `reference`); modality-aware focus
   intent on trigger click; checkbox/radio item dedup; SURFACE_SELECTOR
   reuse. Migrate context-menu onto all of it (delete fork, fake button,
   anchorClass hack; add trigger relationship attrs; fix indentation).
2. **Bar helper**: internal `bar()`; menubar + navigation-menu consume;
   menubar smells fixed in passing; shared trigger-row query helper (also
   tabs.tsx).
3. **navigation-menu repair**: hover intent via engine, onSync focus,
   focus-follow, Tab/focus-out model, Escape gate, aria fix, delete
   Viewport/Indicator, themed surface onto content. New stories: hover
   open/close with delays, full keyboard walk through panel links, follow
   between triggers, Escape-in-dialog.
4. **command convergence**: ids, Enter guard, single-writer highlight +
   `data-highlighted`, announce, `filter: null` API, themed dialog wraps
   base, dead-code sweep. Stories: announce assertion, controlled+filtered
   Enter regression.
5. **sidebar**: controlled clove, hotkey arg+gate, mobile notify fix,
   **mobile branch composes Drawer**, Separator/Input composition,
   type/breakpoint cleanups. Stories: separator visibility assertion
   (computed height), hotkey gating, mobile drawer open/dismiss/Escape play.
6. **Toolbar**: base + themed + stories (roving play, ToggleGroup-inside
   play); data-table's toolbar row adopts it.
7. **Arrow**: anchor() clove geometry + unit tests; floating()/surface()
   threading; PopoverArrow + TooltipArrow parts + themed caret + stories
   (side flip keeps the arrow on the anchor side; clamped `data-uncentered`
   play).
7b. **Toast on the popover primitive**: ToastViewport gets
   `popover="manual"` + show-while-toasts-exist; drop `z-100` from the
   themed viewport (top layer replaces it). Two native nuances to handle:
   (a) `showModal()` runs "hide all popovers" — opening any modal dialog
   closes the shown viewport, so it must re-show (toggle-event listener or
   on the next store emit) while toasts exist; (b) while a modal is open,
   everything outside its subtree is inert — a toast above the modal is
   visible and announced but its buttons are not clickable until the modal
   closes (auto-dismiss timers are JS and keep running; this matches the
   platform's modality contract and other toast libraries). Story/play:
   toast fired while a Dialog is open renders above it (stacking assertion)
   and survives the showModal popover-hide (re-shown).
8. **Themed tokens**: menu-token module + scrollAreaVariants adoption +
   dialect unification. Stories: context-menu long-list scroll cap
   (regression for the dead var).
9. **Docs + verify**: architecture.md/README updates, this file's status
   flip; tsc, unit, stories (+new plays), e2e.
