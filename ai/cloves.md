# Ajo Kit Cloves — closed implementation record

> **CLOSED AND SUPERSEDED.** This file preserves the implementation plan,
> evidence, deferrals, and acceptance record completed on 2026-07-07.

> For current architecture use `ai/architecture.md`,
> `packages/ajo-cloves/README.md`, and `packages/ajo-ui/README.md`.

Current baseline: the repository uses Ajo `0.1.35`. General reusable behavior
belongs to `ajo-cloves`; component-system helpers belong to
`ajo-ui/utils`; theme-only adapters belong to `src/ui`.

`OmitArg`, `FixedArgs`, and `withSlot` are owned by the deliberate
`ajo-ui/utils` subpath. They are not cloves and are not Ajo root exports.

Historical Combobox references describe the family later folded into Select.
Historical DatePicker references describe the surface now named InputDate.
Neither name is a current module or public family.

Last updated: 2026-07-12

## Historical goals

1. Extract interaction logic duplicated across `packages/ajo-ui/src/*.tsx`
   into cloves, then refactor those components to consume it.
2. Provide the behavior layer for the next wave of UI components, which take
   inspiration from React Aria's component behaviors — with APIs re-designed
   for Ajo's idiom, not ported.
3. Ship a standalone logic library for app developers, in the spirit of VueUse
   (breadth of sensors/state/async), native-first like the existing UI code.
4. Keep every clove micro, tree-shakeable, dependency-free, SSR-safe, and
   leak-free by construction.

## The pattern is canonical in Ajo

In Ajo `0.1.35` the clove pattern is defined by Ajo itself — do not
restate or fork it here:

- `readme.md` § "Cloves: Sharing Logic" — human spec, 6 rules.
- `LLMs.md` § "Cloves — Reusable Logic" — agent spec, 6 rules + anti-patterns.
- `types.ts` exports `Host<TElement = HTMLElement, TArgs = Args>` — the host
  protocol (`signal`, `next`, `throw`, `return`, `Symbol.iterator`) plus the
  element surface. It is THE type for clove authors; `StatefulElement` no
  longer exists. Import it: `import type { Host } from 'ajo'`.
- Terminology: the wrapper DOM element of a stateful component is called the
  **host** everywhere (repo-wide convention in ajo; follow it here).
- Terminology: Ajo has **no "props" concept**. What components receive is
  **args**; `set:` sets DOM properties on an element; `attr:` sets host
  attributes on a stateful component. Never write "props" in kit code, types,
  tests, or docs (ajo's own types use `PropertySetter` for the `set:` family
  and the JSX runtime parameter is `args`).

Summary for orientation only (the ajo docs above are authoritative): a clove is
`(host: Host, options?) => live view`; cleanup only via `host.signal`;
invalidation via `host.next(fn)`; the view is a stable mutated reference;
per-render input is an explicit method call in the render loop; SSR-inert by
shape; no `use*` prefix; no ordering rules — conditionals and composition are
plain JavaScript.

## Adapting React Aria to Ajo: the attr-bag convention

React Aria hooks return `*Props` objects to spread onto JSX, and split state
into react-stately. The Ajo adaptation (in ajo vocabulary: these are bags of
JSX attributes, so they are **attr bags** — "props" does not exist here):

- **No react-stately layer.** The generator closure is the state manager.
  Cloves hold only the state that belongs to the behavior itself.
- **Attr bags, Ajo-flavored.** When a behavior must wire many attributes and
  handlers, the view exposes bag getters meant for JSX spread. Bags contain
  plain HTML attributes (`role`, `aria-*`, `tabindex`, `id`, `data-*` state
  attrs) plus `set:on*` handlers:

  ```tsx
  const p = press(this, { onPress })
  // ...
  yield <div {...p.attrs}>Pay</div>
  // p.attrs = { role: 'button', tabindex: 0, 'data-pressed': ..., 'set:onpointerdown': ..., 'set:onkeydown': ... }
  ```

  This is SSR-correct by construction: `ajo/html` renders the plain attributes
  (ARIA arrives in server HTML) and skips `set:*`; on the client the same bag
  attaches the handlers. Per-item bags are methods: `roving.item(i)`,
  `tabs.tab(id)`, `tabs.panel(id)`.
- **Events through bags, not through `host.addEventListener`,** whenever the
  behavior targets a rendered element rather than the host itself — keyed
  reconciliation may reuse elements, and bags re-apply cleanly on every render
  while manual listeners on children do not.
- **Native-first beats aria-emulation.** Where React Aria re-implements
  platform behavior for old browsers, prefer the platform: `<dialog>` (focus
  trap + inert background), Popover API (top layer + light dismiss), CSS
  Anchor Positioning, `inert` attribute, `<details>`, form constraint
  validation API. A clove exists only for what the platform does not give.

When implementing a clove listed below, read the referenced React Aria hook
docs/source (`@react-aria/*`) and VueUse function first — for edge-case
inventory (pointer cancellation, iOS quirks, interaction modality), not for
API shape. The API must read like Ajo.

## Package location and layout

```
packages/ajo-cloves/src/
	core.ts        # protocol, lifecycle, callback/ref, cache, numeric, and source helpers
	<name>.ts      # one clove per file, named export equals file name
	index.ts       # re-exports everything
```

`packages/ajo-cloves/package.json` exports the package root directly to
`./src/index.ts` for both types and default source resolution. Zero external
dependencies. This snapshot and the current repository use Ajo `0.1.35`.

### `core.ts` infrastructure (keep cohesive; export selectively)

- `browser()` realm gate: both `window` and `document` must exist.
- `dom(host)` guard: `typeof document != 'undefined' && host.nodeType == 1`.
  Cloves call it once at setup and return the inert view when false.
- `listen(host, type, fn, opts?)`: public, SSR-inert host listener whose
  lifetime ends when either the host or optional caller signal aborts.
- `on(target, type, fn, host, opts?)`: sugar for `addEventListener` with
  a host-composed signal for arbitrary source-internal targets.
- `shared(key, start)`: multiplexer for document/window-level sources
  (mousemove, scroll, resize, ResizeObserver, IntersectionObserver,
  matchMedia). One real listener/observer per source, `Set` of subscribers,
  lazy start, stop on last unsubscribe. High-frequency cloves must use it.
- `frame(fn)`: rAF coalescer — at most one callback per frame per subscriber.
- `id(prefix)`: monotonic unique id factory (replaces the `let nextId = 0`
  copies). Deterministic (no randomness) so SSR/client stay stable per pass.
- `statefulRootAttrs`, `callHandler`, and `callRef`: public Ajo protocol and
  composition adapters shared by component libraries.
- `remember` and `clamp`: public general cache and numeric primitives.
- Re-export `Host` from `'ajo'` for consumer convenience.

## Historical catalog

Per entry: name — view sketch — references (RA = React Aria hook, VU = VueUse).
References are edge-case reading, not API templates.

### P0 — interaction core (historically consumed by `packages/ajo-ui`)

- `identity(host, prefix?)` → `{ id, ref(suffix) }` — aria id wiring.
  RA: `useId`/`useSlotId`. Consumers: dialog, field, tabs, select, combobox,
  accordion, radio-group.
- `controlled(host, { value?, fallback, onChange? })` → `{ value, set(v, e?) }`
  — controlled/uncontrolled unification. RA: `@react-stately/utils`
  `useControlledState`. Consumers: dialog, popover, select, tabs, collapsible,
  switch, toggle, combobox, accordion.
- `press(host, opts)` → `{ pressed, attrs }` — unified activation: pointer
  down/up with cancellation on leave/scroll, keyboard Enter/Space for
  non-native buttons, `data-pressed`. Optional `long` (ms) for long-press.
  RA: `usePress`, `useLongPress` (read for pointer-cancel edge cases).
  Consumers: non-`<button>` interactive items in menus/toggles.
- `hover(host, { openDelay?, closeDelay?, onChange })` → `{ open, attrs }` —
  hover intent with shared timers; ignores touch-emulated hover.
  RA: `useHover`; VU: `useElementHover`. Consumers: tooltip, hover-card,
  navigation-menu.
- `dismiss(host, { onDismiss, outside?, escape? })` — Escape + pointerdown
  outside the given elements, one shared document listener. RA:
  `useOverlay`/`useInteractOutside`; VU: `onClickOutside`. Consumers: popover,
  menus, combobox, hover-card, context-menu.
- `focusing(host)` → `{ within, visible }` — focus-within + focus-visible
  modality tracking (keyboard vs pointer). RA: `useFocusRing`,
  `useFocusWithin`, `useFocusVisible`. Consumers: input-group, field,
  navigation-menu, command, all roving items.
- `restore(host)` → `{ capture(), restore() }` — capture/return focus across
  open/close. RA: `FocusScope` restoreFocus. Consumers: dialog, drawer, sheet,
  menus.
- `roving(host, { items, orientation?, loop?, rtl?, virtual? })` →
  `{ active, move(dir), first(), last(), handle(e), item(i) }` — list keyboard
  navigation in both strategies: roving tabindex (menus, tabs, toolbars) and
  `virtual: true` for `aria-activedescendant` (combobox/select listbox where
  real focus stays on the input). `item(i)` returns the per-item bag
  (tabindex or id + `data-active`). RA: `useSelectableCollection`/
  `useSelectableItem` (focus strategy, shouldUseVirtualFocus). Consumers:
  dropdown-menu, context-menu, menubar, select, tabs, toggle-group,
  radio-group, command, combobox, navigation-menu.
- `typeahead(host, { items, text?, onMatch })` — printable-char buffer with
  timeout. RA: `useTypeSelect`. Consumers: select, menus, combobox.
- `selection(host, { multiple?, required?, selected? })` →
  `{ has(v), toggle(v), set(v[]), values }` — single/multi selection
  semantics. RA: `@react-stately/selection` SelectionManager (subset: no
  ranges until a consumer needs them). Consumers: toggle-group, select,
  combobox, data-table, command.
- `anchor(host, { reference, placement?, offset?, flip? })` →
  `{ x, y, placement, sync() }` — floating position. Native-first: CSS Anchor
  Positioning when supported, rect math fallback, updates via shared
  scroll/resize + rAF. RA: `useOverlayPosition`; also read Floating UI's
  flip/shift docs for collision vocabulary. Consumers: popover, menus,
  hover-card, combobox, tooltip, navigation-menu.
- `lock(host)` → `{ lock(), unlock() }` — reference-counted body scroll lock.
  RA: `usePreventScroll` (read for iOS quirks); VU: `useScrollLock`.
  Consumers: drawer, sheet, modeless overlays (native modal `<dialog>` does
  not need it).
- `timer(host)` → `{ start(ms, fn), stop(), pause(), resume(), remaining }` —
  managed timeout with pause/resume. VU: `useTimeoutFn`. Consumers: toast
  (hover pause), tooltip, hover-card, carousel autoplay.
- `announce(host)` → `{ polite(msg), assertive(msg) }` — lazy singleton
  `aria-live` region. RA: `@react-aria/live-announcer`. Consumers: combobox,
  toast, data-table.
- `hotkey(host, keys, fn, opts?)` — global single-chord shortcuts.
  RA: `useKeyboard`; VU: `useMagicKeys` (scope: one chord, no sequences).
  Consumers: command palette, sidebar toggle.

### P0.5 — React Aria component-parity additions (needed for the next wave)

- `label(host, opts?)` → `{ label, field, description, error }` bags — field
  labelling: wires `id`/`for`/`aria-labelledby`/`aria-describedby`/
  `aria-errormessage` across a field's parts. RA: `useLabel`, `useField`.
  Consumers: field, input, textarea, checkbox, radio-group, select, slider,
  date-picker.
- `move(host, { onMove, onEnd? })` → `{ attrs, moving }` — normalized
  pointer-drag deltas with capture, keyboard arrows included (accessibility of
  drag interactions). RA: `useMove` (read for pointer capture + escape-cancel).
  Consumers: slider, resizable; later: color picker, split panes.
- `spin(host, { value, min?, max?, step?, onChange })` → `{ attrs, increment,
  decrement }` — spinbutton semantics: arrows, Page Up/Down, Home/End,
  `aria-valuenow/valuetext`, press-and-hold repeat via `timer`. RA:
  `useSpinButton`, `useNumberField` (subset — formatting stays out; use
  `Intl.NumberFormat` as a plain utility). Consumers: number input,
  input-otp segments, date field segments, slider (keyboard path).
  **SUPERSEDED by ai/date.md (2026-07-10)**: the shape lands as a stateless
  keydown resolver in the `grid.ts` style — `ArrowUp/Down → {step:±1}`,
  `PageUp/Down → {page:±1}`, `Home/End → {edge:'min'|'max'}` — with aria
  ownership staying in the consumer's engine and press-and-hold repeat as a
  recorded extension (same evidence-correction `grid` went through). Future
  consumers (number input) build on the resolver shape, not this sketch.
- `grid(host, { rows, cols, cell })` → `{ handle(e), item(r, c) }` — 2D
  keyboard navigation (arrows in both axes, Home/End, Ctrl+Home/End). RA:
  `useGrid`, `useCalendarGrid`. Consumers: calendar, date-picker,
  data-table.
- `inert(host, { except })` → `{ apply(), release() }` — makes the rest of the
  document inert while a non-native modal surface is open, using the native
  `inert` attribute with reference counting. RA: `ariaHideOutside` (theirs
  walks aria-hidden; ours is the platform attribute). Consumers: drawer,
  sheet, any modal overlay not built on `<dialog>`.
- `swipe(host, { onSwipe, threshold?, axis? })` — touch/pointer swipe
  recognition. VU: `useSwipe`/`usePointerSwipe`. Consumers: carousel, drawer,
  sheet, toast (swipe to dismiss).

Intentionally NOT cloves (native-first / plain utilities):

- Text fields, checkboxes, switches: native elements + `label` clove cover
  RA's `useTextField`/`useCheckbox`/`useSwitch`.
- Focus trap: native `<dialog>`; non-dialog modals compose `inert` + `restore`.
- Number/date formatting (`useNumberFormatter`, `useDateFormatter`): plain
  `Intl` utilities, no host, so not cloves — put in `src/ui/utils.ts` or a
  kit module if shared.
- `VisuallyHidden`: a CSS class (uno shortcut), not behavior.
- Disclosure: `controlled` + native `<details>` or a button with
  `aria-expanded` — no dedicated clove.

### P1 — VueUse-parity (build after P0 migration is green)

Sensors: `media(host, query)` (VU `useMediaQuery`), `scheme(host)`
(VU `usePreferredDark`/`useColorMode`), `motion(host)`
(VU `usePreferredReducedMotion`), `viewport(host)` (VU `useWindowSize`),
`scrolling(host, target?)` (VU `useScroll`), `resize(host, target)`
(VU `useResizeObserver`/`useElementSize`), `visible(host, target, opts?)`
(VU `useIntersectionObserver`), `pointer(host, target?)` (VU `useMouse`),
`idle(host, ms)` (VU `useIdle`), `online(host)` (VU `useNetwork`),
`visibility(host)` (VU `useDocumentVisibility`), `active(host)`
(VU `useActiveElement`).

State: `storage(host, key, fallback, opts?)` (VU `useStorage`, cross-tab sync),
`store(init)` (VU `createGlobalState` — module factory returning a clove),
`history(host, opts?)` (VU `useRefHistory` idea, closure-based),
`previous(host, get)`, `debounced(host, get, ms)` / `throttled(host, get, ms)`
(VU `refDebounced`/`useThrottleFn` — explicit-call idiom, no reactivity graph).

Async: `loader(host)` — the canonical keyed async clove from ajo's LLMs.md,
extended with per-load `AbortController` chained to `host.signal`
(VU `useFetch` scope, without interceptors). `socket(host, url, opts?)`
(VU `useWebSocket`: reconnection/backoff/heartbeat), `source(host, url)`
(VU `useEventSource`), `clock(host, ms?)` (VU `useNow`/`useInterval`, shared
ticker), `raf(host, fn)` (VU `useRafFn`).

### P2 — demand-driven parking lot (do NOT build without a real consumer)

`draggable`/`dropzone` (RA `useDrag`/`useDrop`; VU `useDropZone`), `virtualize`
(RA Virtualizer; VU `useVirtualList` — evaluate against `message-scroller.tsx`
first), `tree` (RA `useTree`) for sidebar/nav trees, `clipboard`
(VU `useClipboard`), `fullscreen`, `wakelock`, `permissions`, `geolocation`,
`battery`, `speech`, `fps`, `textselection`, `infinite` (VU
`useInfiniteScroll`), `form` (native constraint validation bridge; RA
`useFormValidation`), calendar/date-segment engine (RA `useDateField` — only
if date-picker outgrows native `<input type="date">` + current calendar).

## Cross-cutting requirements

### Performance

- Shared sources mandatory for document/window/observer-backed cloves.
  Budget: N subscribers → 1 listener + ≤1 rAF per frame.
- Passive listeners by default; layout reads inside rAF; no allocations in
  per-event hot paths (mutate the view; bags may be rebuilt per render — that
  is reconciliation input, not a hot path).
- A clove never called costs zero: no module-level side effects; announcer
  region and shared listeners are lazy.
- Target 30–60 lines per clove; `anchor` and `roving` may run larger.

### Reliability

- Leak-freedom is structural (rule: cleanup only via `host.signal`); tests
  verify unmount AND reset (`return()`+`next()` → fresh signal →
  re-subscription works, old subscriptions gone).
- Handlers mutate through `host.next(fn)`; never synchronously mutate another
  host mid-render.
- SSR: every clove returns an inert, correctly-shaped view server-side; attr
  bags must still contain the ARIA attributes so server HTML is accessible.
  `ajo/html` smoke test renders a component per clove and asserts attrs.
- Strict TS, no `any` in public signatures. Import `Host` from `'ajo'`.

### Testing

- Unit: vitest + happy-dom per file (`// @vitest-environment happy-dom`; the
  root unit config stays node). Location: `packages/ajo-cloves/tests/<name>.test.ts`.
  Contract tests per clove: shape, react-to-source, invalidation via mounted
  component, unmount teardown, reset re-subscription, SSR inertness + SSR bag
  attrs.
- Shared-source tests: two hosts, one unmounts, source still feeds the other;
  last unsubscribe stops the real listener.
- Focus order, `:focus-visible` modality, popover/top-layer, anchor
  positioning: cover via stories harness + `pnpm stories:test` per migration
  slice — happy-dom cannot represent these.
- Test the contract, not implementation trivia (AGENTS.md).

### Documentation

- TSDoc on every export: one-line summary + a minimal generator example.
- `packages/ajo-kit/README.md`: Cloves section — link to ajo's canonical
  pattern docs, the attr-bag convention, catalog table.
- `ai/LLMs.md`: short "sharing logic with cloves" pointer.
- `ai/architecture.md`: after slice 1, document shared-source design and the
  attr-bag convention as implemented truth.

## Historical implementation slices

Each slice ends with typecheck + unit + stories green and consumers actually
migrated (an unconsumed clove is dead code — do not land it).

1. **Core + first blood**: `core.ts`, `identity`, `controlled`, `hover`,
   `dismiss`, `timer`. Migrate tooltip, hover-card, popover, dialog, toast.
   Wire `./cloves` export + test scaffolding. Record resolved decisions here.
2. **Keyboard & lists**: `roving` (both strategies), `typeahead`, `selection`,
   `restore`, `focusing`, `press`. Migrate dropdown-menu, context-menu,
   menubar, select, tabs, toggle-group, radio-group, command.
3. **Position & overlay polish**: `anchor`, `lock`, `announce`, `hotkey`,
   `inert`. Migrate combobox, navigation-menu, drawer, sheet.
4. **React Aria parity wave**: `label`, `move`, `spin`, `grid`, `swipe`.
   Migrate field/input/slider/resizable/calendar/carousel; unblock the next
   wave of RA-inspired components.
5. **VueUse-parity sensors + state** (P1): shared sources; consumers: sidebar
   (media), carousel (visible/resize), scroll-area, message-scroller
   (scrolling), theming (`scheme`, `motion`).
6. **Async batch**: `loader`, `clock`, `raf`, plus `socket`/`source` if the
   app consumes them. Migrate inline fetch patterns in `src/**`.
7. **Docs & release pass**: README, LLMs.md, architecture.md, TSDoc audit,
   export audit, final leak sweep.

Per-slice acceptance checklist:

- [ ] Inline copies of extracted logic removed from every listed consumer.
- [ ] `pnpm exec tsc --noEmit`, `pnpm test:unit`, `pnpm stories:test` green.
- [ ] Every new clove has the seven contract tests (shape, react, invalidate,
      teardown, reset, SSR inert, SSR bag attrs).
- [ ] No new dependencies; no module-level side effects; bundle diff reviewed.
- [ ] TSDoc present; catalog status updated in this file.

## Closure record

- Phase: COMPLETE (2026-07-07) — slice 7 docs & release pass is done and this
  plan is closed. Shipped `packages/ajo-cloves/README.md`, the `ai/LLMs.md`
  pointer, `ai/architecture.md` implemented-truth documentation for the
  extracted package, TSDoc option-field cleanup, export audit, and final leak
  sweep. Verification: `pnpm exec tsc --noEmit` clean, `pnpm test:unit` clean
  (34 files / 279 tests), and full stories smoke on port 5199 clean (381
  stories). Future clove work is demand-driven only: use the P2 parking lot and
  the recorded deferrals above/below instead of reopening broad catalog work.
- Phase: slice 6 RESOLVED AS EMPTY (2026-07-07) — the async-batch re-recon
  found ZERO app/component consumers: no inline `fetch(` anywhere in src/**
  (every page already uses the framework's `action()`), no
  EventSource/WebSocket/setInterval outside framework internals or
  by-design domain timers. Verdicts recorded so they are not relitigated:
  `loader` deferred (the chat page's `load` is route-action pagination
  with domain logic a generic loader would not remove), `clock` deferred
  (static time labels don't schedule updates — becomes relevant only if
  live-updating labels become a feature), `socket`/`source` deferred (the
  framework SSE wrapper is single-consumer and disciplined), `raf` is
  permanently covered by public core `frame()`. The slice's value was the
  bug it found: chat stale-action completions (below). Next: slice 7
  (docs & release pass).
- Chat stale-actions fix (2026-07-07, found by the slice-6 recon): the
  router keys pages by path, so same-route param changes (`/chats/1 →
  /chats/2`) reuse the host; in-flight `load`/`send` completions applied
  into the WRONG chat's timeline and stale `load.error` rendered across
  chats. Fixed in two layers: framework — `Action.reset()` now ABORTS the
  in-flight controller (stale completions controller-guarded; semantics
  documented; unit tests for reset-mid-flight incl. no stale
  data/error/invalidation and clean re-invoke); chat page — actions reset
  on id change + `activeChatId` captured at invoke time with bail guards
  in the page-level `.then` handlers. Verified: unit (279), e2e (47),
  production smoke.
- Slice-5 shipped: `media` (shared matchMedia per query string, `sync()`
  retarget, SSR fallback option), `scheme` (preset over the media
  machinery), `storage` (localStorage strings, try/catch everywhere,
  cross-tab `storage`-event sync, same-tab set invalidation), `scrolling`
  + `resize` (live-target sensors with the LEAK-PROOF RETARGET contract:
  per-target abort scope, N ref changes → exactly one bound target, tested;
  frame-coalesced callbacks; `resize` uses ONE lazy module-level
  ResizeObserver multiplexed via WeakMap registry that disconnects when
  empty), `visibility` (shared visibilitychange). Library: 23 files, 278
  unit tests.
- Slice-5 migrations (parallel fan-out ×3): sidebar → `media` (breakpoint
  now reactive through the clove); theming UNIFIED — `src/layout.tsx` +
  the stories app both on `scheme`+`storage` (fixes: unguarded localStorage
  read, no cross-tab sync; precedence and `theme.v1` key preserved
  exactly); carousel + message-scroller → `scrolling`+`resize` (fixes both
  components' listener/observer leaks on viewport ref changes; message-
  scroller's raw-event `atEnd()` layout read moved into the coalesced
  path; domain math untouched; content MutationObserver stays inline);
  chat page → `visibility` (fixes the stale mark-seen gate: returning to
  the tab now triggers marking) + five rAF sites → `frame()` with abort
  cancel; `action()` framework fix — per-call AbortController now chained
  to the component's `host.signal` (unmount aborts in-flight actions; unit
  test added).
- SSR crash class fixed (found by slice-5's prod-smoke run; PRE-EXISTING,
  verified against snapshots): the ajo/html host implements neither
  `setAttribute` nor `dataset` (probed empirically), and checkbox/toggle/
  input-otp wrote `this.dataset.state` in their render loops → any SSR
  page with them crashed (`/login` repro). Fix: the `dom` guard, now owned by
  `ajo-cloves`,
  imperative host writes are client-only, SSR state attrs come from the
  stateless wrappers' `attr:*` (OTP's was added); red-first regression
  test `tests/unit/ssr-host-writes.test.ts`; full sweep triaged (combobox/
  navigation-menu/floating content writes are ref-populated → SSR-safe);
  `pnpm test:prod` incl. `/login` green. DOCTRINE (record): imperative
  host writes in render loops must be `dom`-guarded; server attributes
  always come from render output.
- Slice-5 deferred with evidence (zero consumers): `motion` (CSS media
  queries cover it), `viewport`, `pointer` (chart's pointer math is
  domain interaction already paired with `follow`), `idle`, `online`,
  `active`, `store`, `previous`, `debounced`/`throttled`, `clock`,
  `socket`; `visible` (both candidates use domain-specific rect math —
  IntersectionObserver thresholds would change semantics); `history` (the
  catalog entry is VALUE history with zero consumers; URL pushState is
  router domain); `loader` (framework-level today; the `action()` bug was
  fixed directly); `raf` (= existing public `frame()`).
- Slice-5 acceptance: `tsc --noEmit` clean, 278 unit tests, full stories
  smoke (381) green, e2e (47) green, production smoke green.
- FIELD WIRING pass record (2026-07-06). Still parked:
  `spin`/`swipe`/`press` (no consumers), repo-wide RTL pass, exit-animation
  modernization beyond drawer (`@starting-style`/`allow-discrete` rollout to
  the other overlay wrappers — drawer landed it 2026-07-06 with the
  transition recipe, Chromium-probed exit, backdrop fade, drag spring-back).
- Field pass shipped: `label` clove (130 lines — stable ids from `id()`,
  presence-driven wiring: `describe()` registration with per-render
  `reset()` and microtask convergence BOTH directions, `sync(invalid)`
  arg-driven for SSR-safe error chains; bags: `labelAttrs`, `controlAttrs`,
  `buttonAttrs` (+aria-labelledby for button triggers — native label-for
  would fire the click; Base UI nativeLabel rationale), `groupAttrs`
  (fieldset/multi-input surfaces), `descriptionAttrs`, `errorAttrs`; errors
  wire conservatively: aria-invalid + error id in aria-describedby AND
  aria-errormessage). New `packages/ajo-ui/src/field.tsx`: stateful FieldRoot
  hosting the clove, providing FieldContext. Library: 17 files, 239 unit
  tests.
- Field consumers wired (context attrs merge UNDER caller attrs — every
  hand-rolled `for`/`id` in the 39 legacy stories keeps winning; null
  context = byte-identical standalone behavior): FieldLabel/Description/
  Error auto-wire; native controls Input, Textarea, InputGroup inputs,
  Checkbox, Switch, InputOTP (onto the sr-only real input, never the
  aria-hidden slots); composed controls SelectTrigger (buttonAttrs through
  the existing setTrigger id-adoption path), ComboboxInput (controlAttrs +
  FIXED the caller-id override bug: effective id = caller ?? internal,
  adopted via setInput), DatePickerTrigger (buttonAttrs), Slider
  (single-thumb controlAttrs through inputId; multi-thumb groupAttrs +
  role="group" on the root), RadioGroup (groupAttrs on the fieldset).
- Known limitation (documented): SSR single-pass HTML lacks
  aria-describedby for descriptions composed AFTER their control (label
  for/id and the invalid error chain ARE server-rendered; hydration
  completes describedby via the convergence microtask).
- Field pass acceptance: `tsc --noEmit` clean, 239 unit tests, full stories
  smoke (380) green.
- Slice-4 shipped: `move` (pointer-drag session lifecycle: button/isPrimary
  filter, capture on currentTarget, pointerId-filtered move/up/cancel +
  lostpointercapture + Escape-cancel, `canceled` flag, guaranteed release;
  keyboard semantics deliberately OUT — evidence: slider keyboard is native
  range, resizable is separator-pixels) and `grid` (state-free semantic 2D
  key resolver: `{cols}`/`{rows}` RTL-aware, `{edge, extent}` for
  Home/End/Ctrl, `{page, large}` for PageUp/Down/Shift — the plan's
  `{rows, cols, cell}` matrix sketch was evidence-corrected: calendar grids
  are date-based and unbounded). Library: 16 files, 229 unit tests.
- Slice-4 migrated: slider (drag → move; values → controlled<number[]> with
  `init` for the silent normalization write-back), resizable (drag → move;
  NEW separator `aria-valuemin/max/now`; `touch-none` on the styled handle),
  calendar (per-day inline keydown → one `grid` instance with origin-day
  resolution from `data-day`; NEW Home/End + Ctrl+Home/End per APG; NEW
  deterministic PageUp/Down no-op at navigation bounds — fixes the focus
  loss; all FOUR controlled clusters month/single/multiple/range migrated),
  date-picker (open+value → controlled; fixes the HIGH stale-controlled-
  render bug — regression story written first and verified failing against
  the old code), drawer (drag-to-close → move, hosted in DrawerRoot via
  context; non-primary buttons no longer start a close-drag;
  Escape/pointercancel now abandons without closing — micro-improvement),
  switch, collapsible, accordion (two controlled instances preserving the
  single/multiple shape), input-otp (controlled<string> via `accept`
  preserving internal-first order); collapsible/accordion module id
  counters → `id()`.
- Slice-4 deferred with evidence: `spin` (native range/text inputs own
  keyboard semantics — zero consumers), `swipe` (drawer is a tracked DRAG =
  move consumer; carousel is native scroll-snap; toast has no such feature —
  adding one would be new behavior, not extraction), `press` (single
  3-line consumer, the drawer handle Enter/Space — stays inline), `label`
  (see the Field pass note above), RTL for slider/resizable/carousel keys
  (belongs to a coherent repo-wide RTL pass; menubar/submenus skipped it in
  slice 2 for the same reason).
- Slice-4 acceptance: `tsc --noEmit` clean, 229 unit tests, full stories
  smoke (372) green. Story edits during migration audited: purely additive
  (synthetic PointerEvents gained isPrimary/button metadata the `move`
  filters legitimately require).
- Slice 3 record: COMPLETE 2026-07-06 (see the entries below).
- Post-slice-3 addition (2026-07-06): `follow` clove — pointer-anchored
  floating position, the sibling of `anchor` (anchor = element-anchored,
  follow = pointer-anchored). Transform-only writes (structurally immune to
  the padding-box/left-top offset bug class), rAF-lerped through `frame()`
  (`smooth` factor, exact-goal settle), container-clamped with edge flip,
  `move`/`snap`/`stop` API, padding-box-correct coordinates
  (`clientLeft/Top` compensation). Consumer: chart tooltips (content
  re-renders only on active-datum change; the box follows the pointer
  imperatively). Library: 14 files, 207 unit tests.
- Slice-3 shipped: `anchor` (THE positioning primitive), `shared` + `frame`
  in core (re-exported publicly), `hotkey`, `announce`, and the `dismiss`
  outside channel (`escape`/`outside` switches). Library now 13 files /
  780 lines, 193 unit tests.
- `anchor` design (from repo recon + web research, decision brief in the
  session records): JS-authoritative fixed-strategy core — CSS Anchor
  Positioning was rejected for v1 because no standard API exposes which
  `position-try` fallback won, and every wrapper animation keys off
  `data-side`; Radix/Base UI remain JS-first as of mid-2026. Algorithm:
  offset → symmetric flip (both axes) → shift clamping BOTH axes with size
  subtraction → side-aware size vars. Viewport = `visualViewport` when
  present. Writes canonical vars `--anchor-width/height`,
  `--available-width/height`; resolved `data-side`/`data-align`;
  transform-origin. ANIMATION CONTRACT: `place()` is synchronous — call it
  right after `show()` in the same task and all geometry/attrs are committed
  before first paint (no flash, no wrong-side animation, no pre-show
  position dance). Updates via `watch()`/`unwatch()`: shared window resize +
  document capture scroll + visualViewport, one ResizeObserver per instance
  on anchor AND target (content growth repositions automatically), all
  rAF-coalesced through `frame()`. All CSS Anchor Positioning seeding
  (position-anchor/area/try-fallbacks, anchorName plumbing) was REMOVED from
  popover/hover-card/combobox — a native fast path can return later behind
  the same clove API.
- Constrain policy (resolved after a Task-D review fix): `constrain` writes
  inline maxHeight/maxWidth ONLY for components whose base historically
  inlined it (tooltip, hover-card, popover, navigation-menu). Where the
  styled wrapper owns the cap (dropdown `max(96px,min(320px,...))`, select
  same, combobox `max(96px,min(24rem,...))`), the base passes no constrain
  and the wrapper composes `--available-height` — inline styles must never
  fight wrapper CSS (no `!important`).
- Migrated: tooltip, hover-card, popover (+date-picker by composition),
  dropdown-menu root+submenu (submenus gain flip at viewport edges),
  select, navigation-menu (also got its slice-2 debt: controlled + roving +
  typeahead), combobox (anchor + dismiss outside channel replacing its
  inline document pointerdown + roving virtual-focus + controlled ×3 +
  announce of filtered result counts), sidebar (`hotkey` 'mod+b'), toast
  (`hotkey` F8 gated by per-viewport `toasts.length` — fixes the
  six-viewport wrong-focus bug).
- Live bugs FIXED by the primitive: select right/bottom viewport overflow;
  dropdown bottom overflow (160px threshold gone); hover-card/popover/
  combobox left/right placements never flipped (data-side no longer lies);
  navigation-menu top clamp without height subtraction; stale positions on
  content/anchor resize (nobody had ResizeObserver); ~23 duplicated
  window/document listeners per typical page (now shared); toast F8 ×6.
- Deferred with reasons: `lock` + `inert` — drawer/sheet are native
  `<dialog showModal()>`, zero consumers today (sheet has no base file; it
  styles base/dialog directly). Exit-animation modernization
  (`@starting-style` + `transition-behavior: allow-discrete` + `overlay`
  rollout in wrappers/uno) is follow-up work: the clove contract
  (pre-paint data-side) unblocks it, but wrapper CSS overhaul is its own
  pass. RTL-aware alignment in `anchor` also deferred (no consumer passes
  dir; physical mapping preserved).
- Slice-3 acceptance: `tsc --noEmit` clean, 193 unit tests, full stories
  smoke (368) green.
- Slice-2 shipped cloves (record, 2026-07-05): `roving`, `typeahead`, `selection`, `restore`
  (library now 10 files / 391 lines), plus `controlled.init(value)` — seeds
  the uncontrolled value without notifying onChange (lazy defaults: tabs
  first-tab, command auto-select, select silent close). 148 unit tests total.
- Slice-2 migrated consumers: tabs, toggle-group (Task B, −76 lines), select,
  command incl. CommandDialog (Task C, −47), dropdown-menu, context-menu,
  menubar (Task D, −66). All open/value clusters repo-wide now go through
  `controlled`; radio-group intentionally NOT migrated (native radio inputs
  own keyboard/selection — native-first rule).
- Slice-2 design decisions (evidence-driven, from the pre-slice recon):
  - `roving` owns movement RESOLUTION only (key → step → target: orientation/
    dir/loop/Home/End, index from `current?.()` ?? activeElement); the
    consumer owns the EFFECT via `onMove` (focus in tabs/menus, highlight+
    focus in select, setValue+scrollIntoView in command). The planned
    `virtual` flag and per-item `item(i)` bags were dropped — virtual focus
    is just a `current`/`onMove` choice, and items are discovered by DOM
    query (house pattern: one host keydown listener + `querySelectorAll`),
    not registered.
  - Unified contract: `roving.handle` consumes (preventDefault + true) every
    recognized navigation key when items exist, even at a loopless boundary
    with no movement (APG behavior; tabs previously let the key fall through,
    toggle-group/command consumed it — divergence resolved toward consuming).
  - `typeahead` composes `timer` — fixes the real leak of never-cleared
    600 ms timers in dropdown-menu/menubar/select. It never preventDefaults;
    consumers keep their divergent policies (dropdown/select: prevent on any
    consumed printable via the return value; menubar: prevent only on match,
    inside `onMatch`).
  - `selection` normalizes to `string[]` over `controlled` (single = 0/1
    values); toggle-group maps single `''`/multiple array at its boundary.
  - `focusing` and `press` DEFERRED (plan rule: no consumer, no clove — no
    slice-2 component tracks focus modality, and menu keyboard activation is
    centralized at the root, so per-item press attrs would double-activate).
  - dropdown-menu's submenu open cluster stays inline by design: its silent
    parent-coupled reset (`if (!parentOpen && !openControlled) localOpen =
    false` during render, no invalidation) is outside `controlled`'s
    contract.
  - context-menu uses `restore` (capture arbitrary source element, microtask
    refocus, isConnected-guarded); select keeps its synchronous
    `trigger.focus()` (not a restore consumer). Select's Escape stays inline
    (fires even when closed — not `dismiss`'s contract).
- Accepted micro-deltas (verified against stories): command loopless boundary
  no longer re-applies a no-op setValue+scrollIntoView on the edge item;
  toggle-group's uncontrolled memory is one `string[]` (no separate
  single/multiple locals across a mid-session `type` flip); context-menu's
  equal-value setOpen no longer re-invalidates redundantly.
- Slice-2 acceptance run: `tsc --noEmit` clean, 148 unit tests, full stories
  smoke (368 stories) green.
- Slice 1 record (2026-07-05):
  - Shipped: `packages/ajo-kit/src/cloves/{core,controlled,timer,hover,dismiss,index}.ts`
    (226 lines total), subpath export `ajo-kit/cloves` (`@kit/cloves` in-repo),
    34 contract tests in `tests/unit/cloves/` (happy-dom per-file; `happy-dom`
    added as root devDependency — test infra, not a library dependency).
  - Migrated consumers: tooltip + hover-card (id, controlled, hover, dismiss;
    net −56 lines; fixes the pre-existing leak of pending hover timers on
    unmount), popover (id, controlled, dismiss with `prevent: false` + trigger
    refocus), dialog (id, controlled with `accept` for the native close echo;
    dismissal stays native-`<dialog>`-owned by design), toast (id only — the
    module-level record store and its timers are module-scoped by design and
    stay).
  - Scope notes: `dismiss` is Escape-only (no slice-1 consumer needed
    document-outside dismissal — native popover/dialog own it). [Superseded:
    slice-2 recon showed the menus also ride native popover light dismiss, so
    the outside extension and `shared()` moved to slice 3 with combobox/
    navigation-menu.] Known micro-delta: tooltip with `disableHoverableContent`
    now closes immediately on trigger leave instead of after the 80 ms grace
    (nothing to hover; stories pass).
  - Acceptance run: `tsc --noEmit` clean, 105 unit tests, full stories smoke
    (368 stories) green.
- Prerequisite: Ajo `0.1.35` published (exports `Host`; `StatefulElement`
  removed; pattern documented in ajo readme/LLMs.md). Owner: Cristian.
- Decisions locked: pattern lives in ajo (this plan only adds kit conventions);
  ajo terminology is inherent — args / `set:` DOM properties / `attr:` host
  attributes, never "props"; attr-bag convention (plain ARIA attrs +
  `set:on*`, SSR-correct by design);
  package location `packages/ajo-kit/src/cloves`; naming (no `use` prefix,
  one word); native-first before aria-emulation; RA/VU referenced for edge
  cases, never for API shape; P2 is demand-driven.
- Slice 1 decisions (resolved 2026-07-05):
  - `on` stays internal: exported from `core.ts` for clove modules, NOT
    re-exported from `index.ts`. It injects `signal: host.signal` and passes
    other options through — it does NOT force `passive: true` (that would
    break `preventDefault`; the passive-by-default perf rule applies to
    high-frequency sensor cloves, enforced per-clove).
  - `identity` is DROPPED as a clove; ids need no lifecycle, so the public
    surface is the plain utility `id(prefix)` (monotonic per-prefix counter).
    Suffixes are template literals (`` `${dialogId}-title` ``), no helper.
    Hydration story unchanged from today's `let nextId = 0` copies: SSR and
    client both count from zero in render order.
  - `direction.tsx` stays UI-side; cloves take `rtl`/`orientation` options
    (relevant from slice 2 `roving`).
  - `frame()` is deferred out of slice 1 — no slice-1 clove needs rAF
    coalescing; it lands with `anchor`/sensors (no dead code).
  - Bag caching (plain rebuilt-per-render vs cached getters): measure with
    the first real bag clove. [Update: slice 2 shipped no bag cloves — roving
    dropped `item(i)` bags in favor of DOM-query discovery; first candidates
    are now `press`/`label` in the RA-parity wave.]
