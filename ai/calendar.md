# Calendar capabilities — visual time selection, month-scale views, unified availability

Status: **SCHEDULED SLICES FULLY IMPLEMENTED** (2026-07-11). Design lineage: four research tracks (react-aria/Spectrum source-verified, Nuxt UI + Reka v2, VCalendar v3, and a comparative sweep of Ark/Mantine/MUI X/shadcn/Fluent/Carbon) folded against the implemented InputDate family record (`ai/date.md`) and the current seams in `packages/ajo-ui/src/{calendar.tsx,input-date.tsx,segments.ts}` and `packages/ajo-cloves/src/{grid,spin,roving,selection,controlled}.ts`. The scheduled A1–A3, T1–T3, and M1–M3 slices are complete; T4 and the explicitly recorded/rejected items remain outside the implementation scope exactly as listed below. No backwards-compatibility constraints applied.

House rules held by the implementation: smallest cohesive surface; composition over reimplementation (the segment engine, the `grid`/`spin`/`roving`/`controlled` cloves and `floating.ts` are the parts bin — no second copy was introduced); stamp-invalid-never-block is the family-wide validation philosophy (`ai/date.md` commit rule); values stay ISO strings / plain `Date` at the edges (no `@internationalized/date`).

## Implementation reconciliation

- **A1–A3:** `availability.ts` is the deep internal policy module. It compiles
  the shared date/time grammar once per source/time-zone change and replaced
  the retired Calendar/InputDate match helpers. Calendar now exposes distinct
  hard `disabled` and soft `unavailable` channels. InputDate owns the single
  availability source, endpoint/range messages, and `allowNonContiguous`;
  `InputDateCalendar` seals the policy/selection args it receives from root.
- **T1–T3:** visible segments are scoped to `field` or `popover`, filtered by
  rendered layout, and carry unique ids. `timeRun()` stays with the segment
  engine, while Stateless `InputDateTimeField` only reads the root context and
  renders that same side's `FieldView`. Mounted footer elements register with
  the Stateful owner by identity; day picks default to staying open only while
  a footer exists. Default and explicit single/range compositions, seconds,
  step, 12/24-hour shapes, staging, Escape, and focus restore are covered.
- **M1–M3:** Calendar has one controlled `CalendarView`, one `grid` clove, and
  day/month/year render branches. The default caption drills up; `minView`
  turns month/year cells into whole-period commitments with inclusive public
  Date endpoints. External view flips, dynamic clamps, partial bounds, page
  edges, and focus relocation are pinned. The theme consumes only the four new
  class-name hooks and stories demonstrate drill, month pickers, DOB, and
  application-owned presets.
- **Layering result:** no new clove was necessary. `ajo-cloves` already owned
  every general lifecycle/state/navigation primitive; all new policy remains
  inside the cohesive `ajo-ui` date/calendar module, and `src/ui` remains a
  class/icon/layout adapter. No aliases, compatibility branches, or retired
  matcher implementations remain.
- **Final verification:** `tsc`; 64 files / 527 unit tests; ajo-ui 144/144;
  ajo-cloves 241/241; 468/468 stories; 47/47 e2e; client and SSR builds; and
  1/1 production smoke. Independent Standards and Spec reviews have zero
  residual findings.

## Shared ground (what the three capabilities plug into)

- **One `FieldView` per range side** (`segments.field()`) is the value authority for the InputDate family; every visual picker commits through `merge(Partial<Units>)` → `emitIfChanged` (the `pickDay`/`applyPreset` path). The engine is already time-capable end to end (`derive` kind `'time'|'datetime'`, `stepValue`, h12/h23, `validate` with the `unavailable` reason).
- **Calendar stays day-granular at its public Date boundary** (`PlainDate`, `data-day="YYYY-MM-DD"`) while its view can be day, month, or year. DOM lookup owns focus, one `grid` clove owns every view's keyboard, and five independent `controlled` cloves own visible month, view, and the three selection modes.
- **`CalendarMatcher`/`AvailabilityMatcher`** is the house date-expression grammar; `availability.compile()` is its single evaluator for Calendar, serialized field values, and range crossings.
- **Engine modules without JSX** (`availability.ts`, `floating.ts`, `collection.ts`, `segments.ts`, `bar.ts`) are the pattern for cohesive pure component-domain logic.

---

## 1. Visual time selection composing Calendar

### Why

InputDateTime already edits time — in the field segments (react-aria RAC model). What is missing is the **pointer flow**: a user who opens the popover to pick a day has no way to set the time without leaving the popover for the field. Every mature system parks a time surface next to the calendar (Spectrum: TimeFields below the calendar; Mantine: footer strip; MUI: side columns). The question is which surface, and whether it is a new editing model or the same one rendered again.

### Options considered

| | Option A — slot columns on `collection` + `roving` | Option B — digital-clock scroll columns (MUI-style) | Option C — segment time editor in the popover footer (Spectrum-style) |
|---|---|---|---|
| Model | hour/minute/(second)/AM-PM button columns; `selection` clove over values | one or more scrollable lists of enumerated times (`stepValue` grids → ISO strings) | the existing `FieldView`'s time units rendered as a second segment group inside `InputDateContent` |
| New machinery | column layout, per-column listbox semantics, scroll-into-view, step config | option enumeration + threshold logic (MUI's `timeStep`/`timeSteps`/`minutesStep` confusion is the cautionary tale) | none — reuses `segmentAttrs`/`segmentText`/`spin` pipeline verbatim |
| Keyboard/AT | listbox-per-column; research verdict: "tab-through button soup" unless built carefully | same, plus selected-item auto-scroll bugs (MUI #9473) | `role="spinbutton"` segments — the research shortlist's #1 model, "full stop" |
| Arbitrary minutes | unreachable unless step=1 (MUI :37 problem) | unreachable | always typable |
| Fit with commit rule | needs a commit gesture per column | needs OK-gate or per-click commit | eager commit already; screen/value/hidden input never diverge |

### Decision

**Option C.** A new popover part, `InputDateTimeField`, renders the **time run** of the *same* `FieldView` the outer field edits — no second engine, no second value model, no new keyboard protocol. This is the maximal composition-over-reimplementation play: the root's existing host-level `keydown`/`beforeinput`/`pointerdown` listeners already route any `[data-segment]` inside the root, and the popover content is a DOM descendant of the root, so typing, `spin`, `+`/`-`, erase, and IME handling work in the popover with near-zero new wiring. Adobe's position (a segmented spinbutton field beats any clock UI for speed and AT support) is adopted as ours.

Explicit rejections, recorded: MUI's OK/Cancel accept gate and Mantine's decorative submit button (a commit-looking button that isn't one) both contradict the family's eager-commit contract; the analog `TimeClock` is pointer-only; Option A/B are not *entry* surfaces but *choice* surfaces — the genuinely distinct use case they serve (pick one of N valid appointment slots) is the recorded **`InputDateSlots`** extension (Slice T4 below), which is where `collection('input-date-slot')` + `roving` + the `selection` clove over ISO time strings belong, gated on the availability policy (capability 3) for slot filtering.

### Semantics

- **Same FieldView, two surfaces.** `InputDateTimeField side` reads `ctx.field(side)` and renders the contiguous run of `editor.segments` from the first time unit (hour/minute/second/dayPeriod) to the last, interior literals included, date units and the date–time separator literal excluded. One derivation feeds both surfaces, so **latched granularity is automatic**: a value carrying seconds forces the second segment in the field *and* in the popover footer simultaneously; a `hourCycle` flip converts both. `step` (minute arrow step) applies to popover spins for free — it lives in `FieldOptions`.
- **Range mode** composes two footers — `<InputDateTimeField side="from" />` / `<InputDateTimeField side="to" />` (Spectrum's Start time / End time pair) — each merging into its own side. `datePatch` already preserves entered time on a day pick (it seeds only *empty* time units from `placeholder()`), so pick-days-then-edit-times and edit-times-then-pick-days both converge. The reversed check compares full family strings, so a same-day range with reversed times stamps `reversed` with no new code.
- **Staging parity with react-aria:** time edits on a side whose date units are empty mutate units but emit nothing (`toISO` returns null without a full date) — staged time survives until a day pick completes the record.
- **Close behavior:** when a time surface is composed (default children under `<InputDateTime calendar />`, or an explicitly composed `InputDateTimeField` — the part registers on context, `setTrigger`/`setContent` precedent), `closeOnSelect` defaults to **false** for day picks (Spectrum's `shouldCloseOnSelect: () => !hasTime`). Escape and outside-dismiss close as today; the value is already committed eagerly, so closing is never a commit gate.
- **Surface scoping (the one real change to the root):** `segmentsOf()` currently returns every `[data-segment]` in the root, including segments inside the always-in-DOM `popover="manual"` content. Two fixes, both precedented: filter by rendered layout (`offsetParent !== null` — exactly `collection.ts`'s `rendered` option), and scope roving/auto-advance to the containing surface (outer field row vs popover), so Left/Right never teleports between the field and a floating layer. Popover segments get namespaced ids and never claim `controlId` or the first-segment describedby (those stay on the outer field).

### A11y model

Identical contract to the field, inherited rather than re-specified: `role="spinbutton"` segments (iOS textbox swap included), `aria-valuemin/max/now/valuetext`, group `role="group"` labeled "Time" (single) / "Start time" / "End time" (range), literals `aria-hidden`. The popover stays `role="dialog"`; open autofocus order is unchanged (selected day → today → first enabled day). The hidden "Selected date: …" description already formats datetime values via `formatValue`, so time changes announce through the existing describedby channel. No live region needed — spinbuttons self-announce.

### API sketch

```tsx
// One token — default children now include the popover time footer:
<InputDateTime name="checkin" calendar />

// Explicit composition, range:
<InputDateTime range value={value} onValueChange={setValue}>
	<InputDateField side="from" />
	<InputDateField side="to" />
	<InputDateTrigger />
	<InputDateContent>
		<InputDateCalendar />
		<InputDateTimeField side="from" />   {/* label defaults to "Start time" */}
		<InputDateTimeField side="to" />
	</InputDateContent>
</InputDateTime>
```

The part is stateless — all state lives in the root's generator and the shared `FieldView`:

```tsx
/** Time segments of the bound field, rendered inside the popover; same engine, second surface. */
const InputDateTimeField: Stateless<InputDateTimeFieldArgs> = ({ side, label, segmentClass, literalClass, ...attrs }) => {
	const ctx = InputDateContext()
	if (!ctx || !ctx.popup('InputDateTimeField')) return null
	if (ctx.kind !== 'datetime') return null // dev-warn once: needs an InputDateTime root
	const current = ctx.range ? side ?? 'from' : 'from'
	const editor = ctx.field(current)

	return (
		<div {...attrs} {...ctx.groupAttrs(current, label, { surface: 'popup' })} data-slot="input-date-time-field">
			{timeRun(editor.segments).map((segment, index) => segment.editable ? (
				<div key={segment.type} {...ctx.segmentAttrs(current, segment, label, { surface: 'popup' })} class={segmentClass}>
					{ctx.segmentText(current, segment)}
				</div>
			) : (
				<div aria-hidden="true" class={literalClass} key={`literal-${index}`}>{segment.text}</div>
			))}
		</div>
	)
}
```

### Slice plan

1. **T1 — surface scoping (internal, ships alone):** rendered-filtered `segmentsOf()` (offsetParent, `collection.ts` precedent), per-surface roving/auto-advance scopes, surface-aware `segmentAttrs`/`groupAttrs` (id namespacing, controlId/describedby containment). Pure refactor; regression stories for range cross-navigation.
2. **T2 — `InputDateTimeField` (base):** the part + context registration, `timeRun` slice, `closeOnSelect` datetime default flip, default children under `<InputDateTime calendar />`. Unit tests on the run filter per locale (dayPeriod-leading locales included).
3. **T3 — themed layer + stories:** InputGroup-consistent segment chrome inside the popover footer; stories: single, range (Start/End), seconds-latch across both surfaces, `step`, 12h/24h, staged-time-then-pick, Escape/close focus restore.
4. **T4 — recorded, not scheduled: `InputDateSlots`** (booking slot picker): `stepValue`-enumerated ISO times filtered by the compiled availability predicate (capability 3), `selection` clove over strings, `roving` vertical, `collection('input-date-slot')` markers. Blocked on A-slices.

---

## 2. Month-scale capability

### Why

Two demands share one grid: **fast navigation to distant months** (DOB-distance dates — `ai/date.md` already recorded drill-up as "better than dropdowns") and **months as values** (month pickers, month-range filters, "Q1" style reporting periods). Building them separately (Mantine ships MonthPicker as its own component family; Nuxt/Reka ship six namespaced roots) doubles the surface for what Ark proves is one mechanism.

### Options considered

- **A — Ark-style drill views on Calendar.** One `view` state (`day | month | year`); the caption drills up; selecting a cell above `minView` drills down and re-anchors, selecting at `minView` commits. One keyboard map (our `grid` clove) across all three views. Month-only picker = `minView="month"`.
- **B — dedicated month mode/component (Mantine MonthPicker-style).** A separate `mode`/root whose value is a month; its own level-drilling internally anyway (Mantine drills month→year→decade regardless).
- **C — type-prop root swapping (Nuxt/Reka).** `type: 'date' | 'month' | 'year'` selecting among six underlying roots; the wrapper picks matchers per type.

### Decision

**Option A, verbatim in spirit.** Ark's rule — *selection above `minView` navigates down, selection at `minView` commits* — is the smallest surface that yields both the navigation affordance and the month/year picker, and it reuses everything Calendar already has: `moveMonth` + `canNavigateTo` for bounds, `monthOptions(year)` / `yearRange()` as the exact cell enumerators, `monthState` for the anchor, the `grid` clove for 2D keys, the keyed-subtree + `focusDay`-idiom focus discipline, and the `data-slot`/classNames styling contract. Option B rebuilds the grid and gesture code Calendar already owns; Option C multiplies roots, which is exactly the 17-part-anatomy failure mode `ai/date.md` refused once already. The comparative sweep independently shortlists Ark's view system as the best month-scale keyboard model (one map, real buttons, `minView` turns the same grid into a committing picker).

Concrete shape:

- **New args on `CalendarCommonArgs`:** `view?: CalendarView`, `defaultView?: CalendarView`, `onViewChange?: (view: CalendarView, event?: Event) => void`, `minView?: CalendarView` (default `'day'`). `CalendarView = 'day' | 'month' | 'year'`. `defaultView` defaults to `minView`; the view state clamps to `>= minView`. No `maxView` — `year` is the top and nobody has shown a use for capping (YAGNI; Ark's `maxView` exists mostly to disable drill-up, which we cover via `captionLayout`).
- **View state = one more `controlled` clove** in `CalendarRoot`, exactly like `monthState`.
- **Caption as the drill trigger:** `captionLayout` default flips from `'label'` to a new `'button'` — the caption label becomes `<button data-slot="calendar-view-trigger">` that drills up one level (disabled at `'year'`). `'label'` survives as the static opt-out (display-only calendars); the `'dropdown*'` layouts survive unchanged (the DateOfBirth themed-Select contract from `ai/date.md` stands) and **exclude** drill-up — two month-choosers in one caption is noise. Drill-up becomes the recommended DOB recipe; dropdowns become the legacy affordance.
- **Grids:** month view = 3×4 grid of the anchor year's months (from `monthOptions`); year view = 3×4 grid of 12 years (paged window over `yearRange` bounds). One pane regardless of `numberOfMonths` (Ark/Mantine parity). Cells are real buttons in `role="gridcell"` wrappers under `role="grid"`, carrying `data-month="YYYY-MM"` / `data-year="YYYY"`, `data-selected`, `data-disabled` (from `canNavigateTo`), `data-today` (current month/year). New `data-slot`s: `calendar-month-view`, `calendar-year-view`, `calendar-month-cell`, `calendar-year-cell`; `CalendarClassName` grows `month_view | year_view | month_cell | year_cell`.
- **Keyboard:** the same `grid` clove instance routes the view grids — `cols ±1` = ±1 month/year, `rows ±1` = ±3, Home/End = row edges (Ctrl = grid edges), PageUp/PageDown = ±1 year (month view) / ±12 years (year view), Enter/Space = native button activation. **Escape drills back down one level** (and stops propagation); at `minView` it propagates so `InputDateContent`'s close still wins — layered dismissal, menu-family precedent.
- **Focus:** view flips recreate keyed subtrees; follow the `focusDay` idiom with `focusMonthCell(iso)` / `focusYearCell(year)` microtask lookups, and inherit input-date's `onMonthChange`-style refocus when a view flip drops focus.

### Value semantics — whole months and month ranges

Modes stay orthogonal to views: `mode` (`single | multiple | range`) × `minView` composes the full matrix without new roots.

- **`minView="month"` + single:** clicking a month commits `plainToDate(first day of month)` through `singleState` — the existing null conventions hold (re-click clears to `null` unless `required`).
- **`minView="month"` + range:** the *same four-branch gesture* as `selectDay`, at month granularity (compare by month ISO). Emission: **`from` = first day of the from-month, `to` = LAST day of the to-month.** Rationale: `CalendarDateRange` is day-granular-inclusive everywhere else in the family; Nuxt/Reka's first-of-month-both-ends shape silently drops Jun 2–30 the moment the range meets any day-granular consumer (availability matchers, queries, InputDate range values). Rejected alternative recorded. Re-sync derives month highlighting by intersection: a month cell is `selected` when its span intersects `[from..to]`; `range_start`/`range_end` are the months containing the endpoints.
- **`minView="year"`** mirrors both at year granularity. `multiple` works at any grain for free (no themed story initially — recorded).
- **InputDate integration is free behavior, not a designed surface:** `calendar={{ minView: 'month' }}` yields a month-picking popover that commits first-of-month through `pickDay` unchanged. A dedicated `InputMonth` root (month-value ISO `'YYYY-MM'`) is explicitly out of scope — recorded extension, only if a real consumer appears.

### Presets reconciliation

`InputDatePresets` already exists (root `presets` arg → popover buttons → `applyPreset` merges family-format strings and closes). Decision: **presets belong to the value layer — the popover — and nowhere else.**

- **Calendar grows no preset API.** Presets are value commitments; Calendar's job is display and picking. For a *standalone* Calendar the Nuxt precedent is decisive: presets are plain app buttons beside the grid setting the same state `onSelect` sets — zero API needed. We document the pattern with a themed story instead of shipping a part.
- **Month ranges and quarters ride the existing mechanism unchanged:** `presets={[{ label: 'Q1', value: { from: '2026-01-01', to: '2026-03-31' } }]}` works today because preset values are family-format strings. There is no quarter mode — quarters are presets (v-calendar/Nuxt precedent: scope cut worth copying).
- One themed refinement folded in: the range-mode presets layout is a sidebar column beside the calendar (already the themed plan in `ai/date.md` adoption #2); month-scale changes nothing about it.

### API sketch

```tsx
// Drill-up navigation, default everywhere (captionLayout 'button'):
<Calendar />                                     // "July 2026" → 2026 months → 12-year grid → drill back down

// Month picker:
<Calendar minView="month" onSelect={date => ...} />          // Date = first of month, null convention holds

// Month-range picker:
<Calendar minView="month" mode="range" onSelect={range => ...} />  // { from: Feb 1, to: Jun 30 }

// DOB without dropdowns:
<InputDate name="dob" calendar={{ fromYear: 1900 }} />       // drill to year view, two clicks down
```

Internals, house-shaped (excerpt of the `CalendarRoot` additions):

```tsx
const viewState = controlled<CalendarView>(this, {
	fallback: initialView, // defaultView ?? minView ?? 'day'
	onChange: (next, event) => currentArgs.onViewChange?.(next, event),
})

const selectMonthCell = (target: PlainDate, args: CalendarArgs, event: Event) => {
	if ((args.minView ?? 'day') === 'month') return commitMonth(target, args, event) // mode-aware, selectDay's algebra at month grain
	moveMonth(target, args, event)              // drill down: re-anchor…
	viewState.set('day', event)                 // …and land on the day grid
	focusDay(target, args)
}
```

### Slice plan

1. **M1 — view state + month view (base):** `viewState` clove, `captionLayout: 'button'` default + view trigger, month grid + `grid`-clove nav + Escape drill-down, commit-at-`minView='month'` for single/range (value semantics above), focus idiom, data-slots/classNames. Shippable alone: drill-up day↔month plus a working month(-range) picker.
2. **M2 — year view:** 12-year paged grid over `yearRange`, drill chain year→month→day, `canNavigateTo` stamping on month/year cells, `minView='year'` commit.
3. **M3 — themed layer + stories:** view-trigger and cell styling via `buttonVariants`, stories (DrillUpNavigation, MonthPicker, MonthRangePicker, DOBViaDrill, standalone-Calendar-with-preset-buttons composition story documenting the reconciliation), focus-relocation regression story on view flips.

---

## 3. Unified availability policy

### Why

Today there is exactly one behavioral channel — Calendar `disabled` — and it conflates *invalid* with *unfocusable/uninteractive* (the `:not(:disabled)` focus selectors skip disabled days entirely). Meanwhile the field level holds the opposite, pinned contract: min/max/`unavailable` **stamp invalid, never block**. `calendarDisabled()` in input-date.tsx is where the two philosophies currently collapse into one: user matchers + `unavailable` + min/max all become disabled cells. And time availability exists only in embryo (`unavailableOf` grafts today's date onto time values). One policy, evaluated once, surfaced consistently in cells, segments, and messages, is the missing spine — and capability 1's slot picker cannot ship without it.

### Options considered

- **A — v-calendar expression grammar.** The full `DateRangeSource` union with `repeat` (`every`, `weekdays`, `ordinalWeekdays`, `on` OR-groups). Crown-jewel praise is deserved, but it is RRULE-class surface: v-calendar itself deprecated half of it between versions, silently killed the whitelist (`available-dates`, GH #1286), and carries documented perf sores from re-evaluating expressions per render.
- **B — plain predicate** `(date: Date) => boolean`. Minimal and composable, but pushes weekday/range boilerplate onto every consumer, and an opaque function cannot be introspected (a slot picker cannot ask "which windows on this day" without probing every minute).
- **C — extend the house grammar.** `CalendarMatcher` already *is* a mini-grammar — `Date | Date[] | fn | {from,to} | {before,after,dayOfWeek}` — with the fn escape hatch covering everything ordinal ("last Tuesday" is a one-liner). Extend it minimally with a time window, evaluate it in one compiled engine, and adapt it to all three consumers (cells, `segments.validate` predicate, slot filtering).

### Decision

**Option C.** The v-calendar lesson we adopt is not the grammar but the *architecture*: one expression form reused everywhere, **compiled to predicates once per args change, never per render** (their GH #1010 perf lesson, taken as a hard rule). The grammar we reuse is our own. The `repeat`/`ordinalWeekdays` algebra is explicitly rejected (fn escape hatch covers it); a whitelist/`available` channel is explicitly rejected (the `available-dates` cautionary tale — express whitelists as inverted matchers or a predicate). Weekday numbering stays 0=Sunday (existing `dayOfWeek` semantics; v-calendar's 1=Sunday rejected).

**New engine module `packages/ajo-ui/src/availability.ts`** (house pattern: pure module, no JSX, like `segments.ts`/`collection.ts`):

```ts
// Time windows are half-open [from, to): times are instants on a continuum,
// day ranges stay inclusive-inclusive (discrete cells). Deliberate asymmetry.
export type TimeWindow = { from?: string; to?: string }              // 'HH:MM[:SS]'

export type AvailabilityMatcher =
	| CalendarMatcher                                                  // everything that exists today
	| { after?: Date; before?: Date; dayOfWeek?: number[]; from?: Date; to?: Date; time?: TimeWindow }

export type Availability = {
	/** Day-granular: true when the WHOLE day is unavailable. Matchers carrying a time window never match here. */
	day(date: Date): boolean
	/** Instant-granular: day fields AND time window (windowless matchers cover the whole day). */
	at(date: Date): boolean
	/** Serialized-value adapter: the `(value: string) => boolean` shape segments.validate consumes. */
	value(kind: SegmentsKind, value: string): boolean
	/** Any day in [from..to] (exclusive of endpoints) unavailable? Range-crossing check, iterates once. */
	crosses(from: Date, to: Date): boolean
}

export const compile = (matcher: AvailabilityMatcher | AvailabilityMatcher[] | undefined): Availability | undefined
```

Fields within one matcher object AND together (`{ dayOfWeek: [1], time: { from: '12:00', to: '13:00' } }` = Monday lunches); the top-level array ORs (existing `asMatchers` semantics). `calendar.tsx`'s internal `matches()` and input-date's `matchesDate`/`unavailableOf` migrate onto this one evaluator — three copies become one.

### Two channels, one crisp meaning each

| Channel | Semantics | Rendering | Focus | Selection | Where it comes from |
|---|---|---|---|---|---|
| `disabled` | "does not exist for you" — hard block | `disabled` attr, `data-disabled` | skipped (`:not(:disabled)`) | blocked (`selectDay` guard, unchanged) | user `disabled` matchers; **min/max nav bounds** |
| `unavailable` (new) | "exists, but invalid to choose" | `data-unavailable` + `aria-disabled` on the day button; strikethrough in the themed layer | **focusable and announced** | **selectable — commits and stamps invalid** | new `unavailable` arg (Calendar and the whole InputDate family, same arg it already has) |

The selection decision is the deliberate deviation from react-aria/Reka (both make unavailable dates unselectable): a pick and a typed entry of the same date must produce the same result, and the family's pinned contract is that validation stamps but never blocks. A blocked click is a silent mystery; a committed pick with "This date is unavailable" in the Field message is an explained state. Consumers who want hard blocking already have the `disabled` channel. `CalendarModifiers`/`CalendarDayState` grow `unavailable: boolean`, flowing into `dayClassName`, `renderDay`, and `CalendarDayButton` data-attrs; the `modifiers` record (`data-modifier-*`) remains the purely presentational stopgap for anything softer.

**`calendarDisabled()` splits accordingly:** min/max bounds and user `disabled` stay in the disabled channel (out-of-bounds days are navigation noise — react-aria agrees); the `unavailable` matcher moves to the new channel and stops disabling cells. This is the single-merge-point local change the implementation map predicted.

### Range semantics across unavailable dates

Options weighed:

- **Block crossing** (v-calendar drag walls, Reka default): rejected — a pointer-only wall with no keyboard analogue, and a hard block contradicting the field contract.
- **Clamp** the end to the last available day: rejected — silent value mutation; nothing else in the family mutates what the user chose (min/max don't, `datePatch` doesn't).
- **Allow + invalidate, with an opt-out** (react-aria's exact default): **adopted.** A committed range whose interior crosses unavailable days emits as picked and stamps invalid with a new **consumer-raised** reason `{ code: 'unavailableRange' }` — the `reversed` precedent exactly: `segments.validate` never returns it (it sees one side); the input-date root raises it after cross-checking both committed sides via `availability.crosses()`. Default message: "Range includes unavailable dates". New arg `allowNonContiguous?: boolean` (Calendar range mode + the InputDate family) suppresses the invalidation *and* excludes unavailable interior days from `range_middle` styling (react-aria's display parity — the days simply don't render as selected; emission stays one `{from, to}`; splitting into sub-ranges is app responsibility, recorded verbatim from their docs).

Endpoint-unavailable stays the plain `{ code: 'unavailable' }` reason per side.

### Time and the field surface

- `unavailable` on InputTime/InputDateTime now accepts time-window matchers: `availability.value(kind, value)` replaces today's `unavailableOf` graft (kind `'time'` keeps the grafted-today behavior for day-dependent matchers — documented, unchanged). Typing 12:30 into a lunch-blocked InputTime commits and stamps `unavailable`, message "This time is unavailable" — all existing machinery.
- Day-granular calendar cells consult `availability.day()` only: **a matcher carrying a time window never marks a whole day unavailable** (a day with blocked hours is still pickable). The crisp rule that keeps the two granularities from bleeding into each other.
- `availability.at()` is the slot-filter primitive `InputDateSlots` (T4) enumerates against.
- **Field/message surfacing needs zero new plumbing:** reason → `errorMessage` override → `defaultMessage` → hidden `data-slot="input-date-message"` span → describedby → themed Field error surface. `unavailableRange` adds one `Reason` variant and one `defaultMessage` branch.

### API sketch

```tsx
// Standalone calendar: weekends off, one booked block, holidays by predicate.
<Calendar
	mode="range"
	unavailable={[
		{ dayOfWeek: [0, 6] },
		{ from: booked.from, to: booked.to },
		date => isHoliday(date),
	]}
	allowNonContiguous
	onSelect={range => ...}
/>

// Field family: same arg, three consumers (segments validation, calendar cells, message).
<InputDateTime
	name="appointment"
	calendar
	min="2026-07-10T09:00"
	unavailable={[
		{ dayOfWeek: [0, 6] },                                        // whole days → cells + validation
		{ dayOfWeek: [1, 2, 3, 4, 5], time: { from: '12:00', to: '13:00' } }, // windows → validation (and slots, later)
	]}
/>
```

### Slice plan

1. **A1 — `availability.ts` engine:** grammar + `compile` (day/at/value/crosses) with unit tests (window edges, half-open times, AND-within/OR-across, fn passthrough); `calendar.tsx` and `input-date.tsx` migrate their evaluators onto it. No visible behavior change — ships alone.
2. **A2 — Calendar `unavailable` channel:** the arg, `data-unavailable`/`aria-disabled` stamping, `CalendarModifiers.unavailable`, selectable-commits semantics, themed strikethrough, stories (unavailable vs disabled side by side, focusability contrast).
3. **A3 — field-family split:** `calendarDisabled()` split into two channels, `unavailableRange` reason + `allowNonContiguous`, message branch, stories (endpoint-unavailable commit+message, crossing invalidates, non-contiguous display, InputTime lunch window).
4. **A4 — unlocks T4:** `availability.at()` wired into `InputDateSlots` enumeration when that part is scheduled.

---

## Ordering across capabilities

`A1` is the only cross-cutting prerequisite and has no dependencies — schedule it first. `T1–T3`, `M1–M3`, and `A2–A3` are then three independent tracks; `T4` (`InputDateSlots`) is the sole convergence point and stays recorded until a booking-shaped consumer exists.

## Deferred / recorded (delta to ai/date.md's list)

- `InputDateSlots` slot picker (supersedes the "TimeGrid sibling" entry; shape now specified above).
- `InputMonth` root (month-value `'YYYY-MM'` family) — only on demonstrated need.
- Month-range hover preview band (rides the existing range-hover deferral).
- `multiple` × month/year themed stories.
- Whitelist/`available` channel: rejected permanently, not deferred (GH #1286 lesson).
- Repeat-rule grammar (`every`/`ordinalWeekdays`): rejected — the predicate escape hatch is the recurrence story.
- Analog clock, OK-gated accept, per-column scroll pickers: rejected — recorded anti-patterns for this family.
