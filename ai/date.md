# InputDate / InputTime / InputDateTime — segment-based date fields

Status: **IMPLEMENTED** (2026-07-10). Design lineage: fact-finding (3-agent
workflow: current code map, react-aria reference model, platform/i18n
probes), adversarial critique (2 lenses, 20 findings — 3 blockers, 8 majors),
and a DX/UX research pass (Nuxt UI + ecosystem catalog + house-precedent
audit — see "DX & UX adoptions") are folded in below. Range is a MODE on
every root, not a fourth component (user decision; matches Select's
`multiple` arg and Calendar's `mode` arg). Validation from the field: Nuxt UI
independently landed the same naming (UInputDate/UInputTime, v4.2 Nov 2025)
after its maintainer refused to wrap Reka's 17-part DatePicker anatomy — and
their single-component wrapper then had to leak segment refs
(`inputsRef[3].$el`) to let users anchor a popover, the exact cliff our
part-composition-with-default-children approach avoids.

**Implementation record**: executed in four phases (A: `spin` clove +
Calendar null convention + `segments.ts` engine with 73 unit tests; B: base
`input-date.tsx` family; C: themed layer + DatePicker deletion + 32 stories;
D: adversarial review). SSR probing during phase B found and fixed a real
platform gap (ajo/html's protocol host has no addEventListener — all host
listeners gated behind a dom check). The phase-D review (3 lenses, 12
verified findings, all live-reproduced) hardened: NaN-safe erase after
month-name letters (was emitting '2026-NaN-NaN'), latched granularity
(controlled seconds no longer collapse/truncate on self-echo), focus
relocation when the focused unit disappears, single-mode segment
aria-labelledby chaining the field label, once-per-open calendar autofocus
(pendingFocus pattern) plus month-paging focus re-landing (Calendar rekeys
its month subtree), field-click-closes-popover (dismiss host containment
made the whole root "inside"), Alt+Arrow no-op without popup parts,
clear-refocuses-first-segment, an SSR fixture pinning
machine-locale-independent output, and LocaleFlip/FocusRelocation regression
stories. Recorded deliberate deviations: reconciler primed with the initial
committed value; Enter advances segments (enterKeyHint parity); range label
wiring on the root (side groups keep their own Start/End labels); calendar
month soft-follows the committed value; the reason-coded message renders in
a hidden data-slot="input-date-message" span joined into describedby;
month-name letter buffer displays until blur/advance; eager commit emits
progressive padded-year values while typing ('0002-…' → '2026-…', react-aria
parity); ja-JP short dates use slash literals (kanji live in the placeholder
vocabulary); validation messages are English templates with Intl-localized
pieces + the errorMessage override hook. Final battery: tsc clean, 368 unit
tests (38 files), 446 stories, 47 e2e.

**Calendar follow-up (2026-07-11):** `ai/calendar.md` subsequently graduated
three recorded extensions without replacing this family: InputDateTime now
composes a second time-segment surface over the same `FieldView`; Calendar
drills through day/month/year and commits whole periods at `minView`; and one
compiled availability policy serves cells, field values, and range crossings.
The appointment-choice use case was refined into `InputDateSlots` and remains
recorded rather than scheduled.

Replaces `packages/ajo-ui/src/date-picker.tsx` (base + themed + stories) with
a react-aria-style segmented field family: an input the user can type a date
into, that assists entry, with the calendar popover as an OPTIONAL part.
Calendar itself survives as the standalone grid family (first adopting the
null convention here, then gaining the cohesive follow-up capabilities above).

## Why

- The current DatePicker is button + popover + calendar: the ONLY way to
  enter a date is picking it. Typing a known date (a birth date!) through a
  calendar is the classic anti-pattern (GOV.UK research: text fields "tested
  much better"). react-aria's DateField model — locale-ordered editable
  segments with an optional calendar — is the reference.
- Free-text parsing is not the answer ("2/3/2022" is ambiguous; react-aria:
  "nearly impossible to reliably parse"); Zag/Ark went free-text + parse and
  remain the weaker model. MUI X migrated from single-input-with-sections to
  one element per section because the single input "presented accessibility
  limitations, which are impossible to resolve". Segments are the settled
  answer; nobody ships them as primitives (Base UI #1709 open proposal,
  Radix declined) — react-aria's source is the de facto spec and this design
  adopts its behavior set deliberately, with deviations called out inline.
- Native `input[type=date]` stays rejected for the library (unstylable,
  display locale uncontrollable, valueAsDate UTC off-by-one, inconsistent
  pickers) — but we keep its two GOOD ideas: ISO-8601 value strings and its
  per-locale placeholder vocabulary (dd/mm/aaaa).

## Naming and anatomy

`InputDate`, `InputTime`, `InputDateTime` — the `Input*` prefix is
established (InputGroup, InputOTP). Each root takes `range?: boolean`
(Select's `multiple` precedent: one root, the mode flips the value type via
a generic — `Range extends true ? { from, to } : string`). One base family
module `packages/ajo-ui/src/input-date.tsx` (thin roots over one engine)
plus the internal engine `packages/ajo-ui/src/segments.ts` (no JSX; house
pattern: floating.ts, collection.ts, bar.ts). Themed:
`src/ui/input-date.tsx`.

**Anatomy (critique: parts must be declared, not implied).** Segments render
CLOSED (InputOTP-style — the a11y contract and MUI's migration argue against
user-composed segments):

```tsx
<InputDate value={value} onValueChange={...} min max name>
	<InputDateField />            {/* renders derived segments + literals */}
	<InputDateTrigger />          {/* optional calendar button */}
	<InputDateContent>            {/* optional popover (role=dialog) */}
		<InputDateCalendar />       {/* themed Calendar injected via component */}
	</InputDateContent>
</InputDate>
```

- `InputDateField` is the group surface: carries `role="group"`, the floating
  anchor registration, and renders segment/literal children itself with
  `segmentClass` / `literalClass` args and `data-segment="year|month|…"`,
  `data-placeholder` hooks. Segments are **keyed by unit type** — ajo's
  reconciler matches unkeyed elements positionally, so a locale flip
  (es d/m/y → en m/d/y) would otherwise repurpose the focused month div as
  the day segment; keys make reorders move elements (ajo's focus-preserving
  keyed path) instead. The typing buffer resets if the focused segment's
  unit identity changes; if the focused unit disappears (granularity
  change), focus moves to the nearest surviving segment.
- **One shared context** across the three roots; the popup parts are named
  once (`InputDateTrigger`/`InputDateContent`/`InputDateCalendar`) and work
  under InputDate and InputDateTime in both modes. Composing them under
  InputTime is a documented dev-error no-op.
- **Range mode**: the consumer composes TWO field groups —
  `<InputDateField side="from" />` and `<InputDateField side="to" />`
  (themed layer separates them with a literal "–") — sharing one
  trigger/content. `side` is required per field in range mode (dev warn);
  in single mode `InputDateField` takes no side.
- **Default children (DX — DatePicker precedent, house pattern)**: a bare
  root renders its default composition, and the default is FIELD-ONLY —
  the component's identity is an input; the calendar is opt-in via
  `calendar?: boolean | InputDateCalendarArgs`:
  - `<InputDate name="dob" />` → field + hidden input.
  - `<InputDate name="checkin" calendar />` → the whole DatePicker
    replacement in one token; `calendar={{ captionLayout: 'dropdown',
    fromYear: 1900 }}` covers date-of-birth.
  - `<InputDate range name="stay" calendar />` → from/to fields +
    separator + shared popover, `stay[from]`/`stay[to]` hidden inputs.
  The THEMED root re-declares the same defaults with themed parts (themed
  InputDateCalendar injects the themed Calendar via `component` — the
  existing DatePickerCalendar mechanism); no separate "DatePicker" preset
  name (default children make it dead weight, and the family already beats
  Select's ~10-line minimal usage at 1 line).

## Value model — ISO 8601 strings

Public values are the native inputs' own form formats, timezone-free,
serializable, zero-dependency:

| Family | single value | granularity |
|---|---|---|
| InputDate | `'2026-07-10'` | day |
| InputTime | `'14:05'` / `'14:05:30'` | `'minute'` (default) \| `'second'` — canonical 24h regardless of display cycle |
| InputDateTime | `'2026-07-10T14:05'` / `…:30` | `'minute'` (default) \| `'second'` |

With `range`, every family's value becomes
`{ from: string | null, to: string | null } | null` in that family's own
string format (`{from, to}` aligns with CalendarDateRange).

- `value` / `defaultValue` / `onValueChange(value, event?)`; **`null` =
  controlled-empty** (`undefined` = uncontrolled). Emits `null` on a fully
  cleared field, never `undefined`. Range: each side follows the single
  commit rule independently (progressive emission — `{from, to: null}` while
  picking, matching today's DatePicker range behavior); the whole value is
  `null` when both sides are empty.
- **Value edges (critique)**: a value carrying seconds FORCES the seconds
  segment regardless of `granularity` (native parity; granularity only
  shapes what an empty field renders/emits) — never silent truncation.
  Parse strictness: accept exactly the native normalized forms (zero-padded,
  no milliseconds, no `24:00`); anything else is invalid input (dev warn,
  treated as null). Year range 1–9999, serializer pads (`'0042-03-01'`).
  `placeholderValue` is an ISO string in the family's own format.
- NEVER `new Date('yyyy-mm-dd')` (UTC-midnight shift) and never
  `toISOString()`: parse/serialize by splitting/padding integers; construct
  `new Date(y, m-1, d, 12)` (noon anchor — some zones lack local midnight)
  only at Intl edges.
- Temporal is Stage 4 but Safari still lacks it (07/2026) → not the value
  type; the engine may use `globalThis.Temporal` opportunistically (calendar
  precedent). Our ISO forms are Temporal's canonical forms.

### Controlled ↔ editing-state reconciliation (critique blocker)

The engine's editing state is a record of independently nullable units — NOT
derived from `value` on every render, or echoes clobber edits:

- The unit record is **authoritative while editing**. Units re-derive from
  the synced value ONLY when it differs from both the last value the engine
  emitted and the last external value it observed (external-change
  detection). Echoes of self-emitted values never touch the unit record or
  the typing buffer (typing '1' then '2' into a controlled month emits
  '…-01-…' then '…-12-…' with the buffer intact).
- A genuinely different synced value (rejected commit, form reset, server
  push) re-derives all units and drops the buffer — controlled display
  reflects the owner (Select precedent).
- Stories pin: echo-mid-typing, owner rejection, external change mid-edit.

### Commit rule (critique blocker — eager constrain, react-aria verbatim)

- During INITIAL entry: transient invalids (Feb 30) are representable;
  `onValueChange` fires the moment all rendered segments are filled AND the
  combination is real; the completing keystroke constrains (clamp day to
  month length) before emitting. Blur is the backstop for incomplete fields
  only — it cannot invent missing units; blur-incomplete stays incomplete
  and emits nothing.
- Once the field HOLDS a complete value: every mutation (digit, step,
  calendar merge) constrains eagerly and commits the clamped ISO — Jan 31 +
  month step → Feb 28 emitted immediately; screen, value, and hidden input
  never diverge.
- **Complete → incomplete emits `null`** (backspacing one segment of a full
  field: onValueChange(null), hidden input empties). The screen never shows
  less than what the form would submit.
- min/max/`unavailable` NEVER block commit or mutate the value: out-of-range
  commits fire with the typed ISO, stamped aria-invalid + localized message
  (native parity; the MinMax story asserts both).

## Architecture

```
ajo-cloves:  spin (NEW — stateless keydown resolver, grid.ts style)
             roving · controlled · label · restore · announce   (existing)
ajo-ui:      segments.ts (internal engine)
             input-date.tsx (4 roots + parts)
             calendar.tsx (unchanged grid family + null convention)
             floating.ts (popover)
src/ui:      input-date.tsx (InputGroup chrome + segment styles)
```

### `spin` clove

Stateless keydown resolver mapping the APG spinbutton protocol:
`ArrowUp/Down → {step:±1}`, `PageUp/Down → {page:±1}`, `Home/End →
{edge:'min'|'max'}`. This SUPERSEDES the ai/cloves.md catalog sketch
(value/min/max/onChange bag + press-hold): aria ownership stays in the
engine, press-and-hold repeat is a recorded extension — add the supersession
note to ai/cloves.md so the next consumer (number input) doesn't rebuild the
old shape. **Keydown pipeline order is contract** (critique): Alt-combo
check (Alt+ArrowDown opens the popover — checked BEFORE spin so it doesn't
also step; no-op when no popover parts composed) → `spin.handle` →
`roving` for ArrowLeft/Right only (`orientation: 'horizontal'`; roving's
Home/End/vertical handling is bypassed — spin consumes those first; Tab is
native order via tabIndex=0, not roving). In range mode, Left/Right
crosses from the last segment of "from" into the first of "to" (one roving
item list spans both groups).

### `segments.ts` (internal engine)

- **Derivation**: `Intl.DateTimeFormat(locale, options).formatToParts()` on
  a **fixed probe date with single-digit units** (e.g. 2224-03-04 05:06:07 —
  critique: probing "today" cannot distinguish `numeric` from `2-digit` on
  two-digit days/months and skews SSR/client across midnight) → ordered
  segment descriptors + literal strings rendered verbatim (ja-JP 年月日
  suffixes; part-type mapping with a passthrough branch). Placeholder widths
  from the probe's formatted lengths.
- **Hour cycle**: `resolvedOptions().hourCycle` clamped to h12/h23 (h11
  renders "0:00 AM", h24 "24:00"); `hourCycle?: 12 | 24` override. dayPeriod
  segment only under h12; its strings derived by formatting hours 0 and 12
  (the `dayPeriod` OPTION is a trap — flexible day periods, broken Safari).
- **Placeholders**: native-input vocabulary (en `yyyy·mm·dd`, es
  `aaaa·mm·dd`, de `jjjj·mm·tt`, ja 年·月·日; time `––`), small built-in
  table + English fallback + `placeholders` override arg. `placeholderValue`
  (default today/now, client-resolved) seeds the FIRST arrow press on an
  empty segment; never emitted by itself; never used as the format probe.

### Segment interaction (react-aria rules; deviations resolved)

- **Typing**: digits accumulate in a buffer; if `buffer+key` exceeds the
  segment max, restart from the key. Auto-advance when no further digit
  could fit (`Number(v+'0') > max`) or max digits reached: month '3'+
  advances, '1' waits; day '4'+; h23 hour '3'+; minute '6'+; year after 4
  digits. dayPeriod/era match by first letter against locale strings.
- **Stepping**: ±1 wraps at per-segment bounds, NO carry into neighbors
  (h12 hour wrap never flips AM/PM — dayPeriod is its own segment).
  **Day max is dynamic when month/year are known** (Feb: wrap 28→1; static
  31 only while month is empty) — the critique caught that static-31 makes
  aria-valuemax lie and Feb 30 arrow-reachable; react-aria clamps. PageUp/
  Down: rounded steps (year 5, month 2, day 7, minute/second 15). Home/End:
  segment min/max.
- **Deletion (critique major — mobile)**: `deleteContentBackward/Forward`
  in the `beforeinput` handler is the PRIMARY path (Android GBoard/iOS
  deliver deletion only there; keydown is 229/'Unidentified'). Hardware
  Backspace: the keydown handler preventDefaults and acts, suppressing the
  subsequent beforeinput — one action per key. Semantics: strip last digit;
  empty → placeholder; already placeholder → focus previous segment;
  dayPeriod clears whole.
- **Navigation**: Left/Right across editable segments; Tab walks them
  natively; click on chrome/literals focuses the last filled segment
  (walk-back over placeholders) with pointerdown-preventDefault so the click
  doesn't drop a caret into a contenteditable first; the trigger addon is
  exempt from that rule; label click focuses the FIRST segment (explicit
  onclick — see Label wiring).
- **Suppressed**: selection (selectionchange force-collapse), Ctrl/Cmd+A,
  paste (dropped; deliberate ISO/locale paste-parse: recorded extension).
- **Escape**: does nothing to the value (react-aria); with the popover open
  it dismisses per the house convention (dismiss `escape:false` + inline
  handler that preventDefaults only while open, so an ancestor Dialog
  doesn't also close — Select precedent).
- readonly: focusable no-op segments + aria-readonly; disabled: segments
  unfocusable, group aria-disabled, hidden input `disabled` (no submit).

### Text entry mechanics (mobile/IME — platform-verified)

- Segments are `contenteditable` + `inputmode=numeric` (plain focusable
  divs summon NO mobile keyboard), `enterKeyHint='next'`, transparent
  caret. All real edits blocked in `beforeinput` (preventDefault; feed
  `e.data`/inputType to the engine). `insertParagraph` preventDefaulted
  explicitly.
- `insertCompositionText` is uncancelable: snapshot textContent, restore in
  the `input` event, **then invalidate** — the restore-then-render rule
  (critique): the engine defers any write to the focused segment's text
  node until `compositionend` (queued invalidation), so ajo's text
  reconciliation and the imperative restore never double-write mid-IME.
- **contenteditable is stamped client-side only** — server-rendered
  contenteditable divs would be freely editable before hydration.
- iOS: role swapped to `textbox` AND the aria-value* attributes stripped
  (VoiceOver can't focus spinbuttons; value attrs on textbox are validator
  noise). SSR emits spinbutton; the hydration attr rewrite is an accepted
  divergence. Android/TalkBack keeps spinbutton (react-aria parity).

### A11y contract

- Field: `role="group"` + label-clove wiring; hidden "Selected date: …"
  description joined into aria-describedby (describedby on the FIRST
  segment only until invalid; invalid stamps every segment).
- Segment: focusable div `role="spinbutton"`, **aria-valuenow only when the
  unit is filled** (empty: no valuenow, aria-valuetext "Empty" — critique:
  fabricated valuenow announces a value the user never entered);
  aria-valuemin/max (dynamic day max), aria-valuetext ("2 – febrero"; hour
  as localized "2 PM"); dayPeriod has NO numeric value — valuetext only.
  aria-label = unit name + field label (iOS VoiceOver doesn't announce
  groups). Literals aria-hidden.
- **Label wiring (critique)**: no segment is labelable, so the themed
  FieldLabel `for` would dangle — `ids.control` lands on the FIRST segment
  (agreeing with describedby-on-first) and the label gets an explicit
  onclick → engine focus-first; the group uses the label clove's
  `groupAttrs` (aria-labelledby route), same as non-native controls.
- Range: each side is its own labelled group ("Start date"/"End date"
  defaults, override args); from > to stamps aria-invalid on both sides
  (emit as typed, never swap — react-aria parity).

### Form integration (Select precedent, pinned)

Hidden input renders whenever `name` is set (`required` only mirrors to
aria-required — required-on-hidden is inert per spec; native
constraint-validation participation is a recorded extension). Empty field
submits `name=` with `''` (native parity). Disabled → `disabled` hidden
input. Range: `name[from]` / `name[to]` (existing date-picker precedent).
The root listens for the form's `reset` event and restores `defaultValue`
units (type=hidden resets its own value silently; segment state must
follow).

### Calendar composition (the optional picker)

- `InputDateTrigger` (icon button; themed: InputGroupAddon inline-end) +
  `InputDateContent` (floating() popover, `role="dialog"`, autofocuses the
  calendar). **The root passes `reference: () => group ?? view.trigger`**
  (critique: setAnchor alone is dead — floating anchors to the trigger
  unless the reference closure consults it; without this the calendar
  hangs off the 28px icon). Trigger owns aria-haspopup/aria-expanded.
- Alt+ArrowDown opens from any segment. **Close-focus restores to the
  OPENING segment** when opened from the keyboard (restore clove,
  context-menu precedent), to the trigger for pointer opens.
- Selecting a day fills the date units and commits; InputDateTime merges the
  picked day with entered time (placeholderValue time if none).
  In range mode `InputDateCalendar` inherits Calendar mode=range from the
  root context: progressive from/to fill, `closeOnSelect` default = when
  the range completes (existing behavior).
- `min`/`max`/`unavailable` (CalendarMatcher) flow to BOTH field validation
  and calendar disabled cells from the same args.
- Editing segments never opens the popover; the field is complete without
  the calendar parts.

## DX & UX adoptions (2026-07-10 research: Nuxt UI, Mantine, HeroUI, Ant, MUI, GOV.UK)

Ranked by user value × cost; each is IN this design unless marked recorded:

1. **Clear button** — `InputDateClear` part; themed `clearable` arg renders
   it in the trailing addon (X visible only while a value exists), emits
   `null` (both sides in range mode). The single most-complained-about
   react-aria omission (adobe/react-spectrum #3318/#4986); universal
   elsewhere (Mantine `clearable`, Ant `allowClear`, MUI `clearable`).
2. **Presets** — `presets?: { label: string, value: Value }[]` arg; values
   in the family's own format (`'2026-07-10'` / `{from, to}`), consumer
   computes them (data-in like Nuxt items; no relative-date DSL). Themed
   `InputDatePresets` renders the button list in the popover footer
   (single) / sidebar (range) — "Last 7 days" is THE range use case (Ant,
   Mantine, MUI, HeroUI all rebuild this on top of react-aria-class cores).
   Selecting a preset commits and closes like a calendar pick.
3. **`+` / `-` segment keys** — step the focused segment ±1 (numeric,
   locale-free; QuickBooks-lineage prior art). `T`-for-today is recorded
   (extension) pending an i18n story — the mnemonic is English-only.
4. **Month-name typing** — letters typed in the month segment prefix-match
   the locale's month names ("j", "ja" cycles ene/jun/jul in es) — the same
   Intl.Collator matcher the design already uses for AM/PM and eras (MUI
   ships it; GOV.UK research: users think in month names).
5. **Minute `step`** — `step?: number` on InputTime/InputDateTime: arrow
   increments on the minute segment (5/15/30 booking granularity; Mantine
   `minutesStep` semantics). Typing stays free-form; PageUp/Down keeps 15.
6. **Reason-coded validation messages** — GOV.UK hierarchy with localized
   defaults + override (house i18n rule): incomplete ("must include a
   month" — names the missing unit), impossible ("must be a real date"),
   rangeUnderflow/rangeOverflow (includes the formatted bound), unavailable.
   Exposed through the Field error surface; `errorMessage?: (reason) =>
   string` override.
7. **Granularity inference** — segment shape infers `value → defaultValue →
   placeholderValue → granularity arg → 'minute'`, so
   `<InputTime defaultValue="09:00:00" />` renders seconds with no arg
   (native parity); the explicit arg remains for empty uncontrolled fields.
8. **Args that die with DatePicker** (do not resurrect): `placeholder`
   (segments self-document the format), `formatOptions` (locale owns
   display), `rangeSeparator` (themed literal), `popoverClass`, `timeZone`
   (out of scope), `fromName`/`toName` (the `name[from]`/`name[to]` bracket
   convention is the contract). `placeholders` override table also moves to
   recorded extensions. Per-root type trim: `hourCycle`/`step` don't exist
   on InputDate; `granularity` doesn't exist on InputDate; popup part types
   don't advertise InputTime composition. Net: fewer consumer-visible args
   than today's DatePicker, plus typed entry — the headline DX claim.

## Locale & SSR (critique blocker — resolved)

- Resolution: explicit `locale` arg → `document.documentElement.lang` →
  fixed `'en-US'`. The chain is gated on `typeof document !== 'undefined'`,
  NEVER on navigator (Node ≥21 ships a global `navigator` — this box
  returns `navigator.language === 'es-AR'` server-side; the ambient machine
  locale is banned on both passes). `navigator.language` is not consulted at
  all — a client-only "convenience" there reintroduces ambient
  nondeterminism and hydration segment-reorder flips.
- The kit threads the request locale by stamping `<html lang>` server-side
  (it already renders it), so `documentElement.lang` is the isomorphic
  source; SSR fixture asserts server output is machine-locale-independent
  and agrees with a client hydrating under the same `lang`.
- **Recorded limitation (implementation, 2026-07)**: `ajo/html` renders with
  no `document`, so the `<html lang>` link in the chain is unreachable during
  the server pass — a server render without a `locale` arg always emits the
  fixed en-US shape regardless of the machine locale. The explicit `locale`
  arg is therefore REQUIRED for non-English SSR (no locale-threading system
  is built for this; deferred). A client hydrating under a differing
  `<html lang>` re-derives cleanly: segments are keyed by unit type, so the
  reorder rides ajo's keyed move path and placeholder/value text rewrites in
  place — the brief en-US shape before hydration is the accepted cost. The
  SSR unit fixture (`tests/unit/ssr-input-date.test.ts`) pins the
  machine-locale-independent en-US server shape and its hydration-safe
  output (spinbutton role, no contenteditable, visible placeholders).
- Node ships full-icu (verified); residual ICU literal skew across engines
  (the NNBSP episode) is accepted and recorded — unit values are stable.

## Theming (src/ui/input-date.tsx)

InputGroup chrome — with the required InputGroup EXTENSIONS recorded as part
of this work (critique): the ring selector `has-[>input:focus-visible]`
never matches contenteditable segments → add a variant keyed on
`has-[[data-segment]:focus-visible]` (or focus-within); the segments
container carries `data-slot="input-group-control"` and a delegated
`focus()` implementing the walk-back-to-last-filled rule so the existing
addon click-forwarding produces the designed behavior; group-level invalid
rides `aria-invalid` on the group. Segments: inline spans with per-segment
focus highlight (bg-accent rounded), `data-placeholder` muted; numeric
segments get `unicode-bidi: embed; direction: ltr` (bidi rule); range
separator literal "–". Calendar trigger: ghost icon button in the trailing
addon.

## Calendar null-convention slice (per-mode, critique-pinned)

| mode | empty emission today | new |
|---|---|---|
| single | `undefined` | `null` |
| multiple | `undefined` | `[]` (never null — Select/CheckboxGroup convention) |
| range | `undefined` | `null` (matching single) |
| month | n/a (never empty) | unchanged |

`sync` binds null/[] per the controlled clove. Consumers to migrate: themed
src/ui/calendar.tsx (the `String(next ?? '')` adapter), calendar stories,
and the deleted DatePicker (biggest consumer disappears). Controlled
stories cover single-null, multiple-[], range-null round-trips.

## What dies / survives / deferred

- **Dies**: date-picker.tsx (base + themed), its stories, `DatePicker*`
  exports. No app pages import it (verified) — migration surface is
  stories + src/ui/index.ts.
- **Survives**: Calendar family (standalone + popover content) with the
  null-convention change above. Its stories stay, including the
  themed-Select-dropdowns caption layout (DateOfBirth contract).
- **Deferred (recorded extensions)**: paste-parse (Mantine `pasteSplit`
  prior art), native constraint validation, press-and-hold spin repeat,
  `allowReversed` for overnight time ranges (22:00–06:00 — by default
  from > to stamps aria-invalid in every family), `T`-for-today segment key
  (i18n), `placeholders` override table, range hover preview band
  (react-aria tracks highlightedRange nearly free), autofill/autocomplete
  for segments (`bday-*` — unsolved by react-aria too), the `InputDateSlots`
  appointment-slot sibling specified by `ai/calendar.md`, free-text/NL parse hook (`parse` arg for
  chrono-node app-layer integration — never bundled), non-Gregorian
  calendars and IANA time zones (ISO + local wall time is the scope — the
  one real capability razor vs @internationalized/date, accepted).

## Stories plan (behavior contract)

**Order sells the DX** (house lesson: date-picker leads with zero-children
usage): Story 1 is the 3-line happy path
(`<Field><FieldLabel>Date of birth</FieldLabel><InputDate name="dob" /></Field>`),
Story 2 is `<InputDate name="checkin" calendar />` (the DatePicker
replacement in one token), Story 3 is `<InputDate range name="stay"
calendar />`, Story 4 DateOfBirth (`calendar={{ captionLayout: 'dropdown',
fromYear: 1900 }}`) — then the contract battery; the fully-composed anatomy
stays pinned by a CustomComposition story (house precedent).

- InputDate: Basic (typing, single eager commit), Keyboard (auto-advance
  table, wrap, dynamic Feb max, no-carry, backspace walk, Left/Right/Tab),
  Locale (es-AR order + `aaaa`, ja-JP literals; flip locale WHILE a segment
  is focused → keyed reorder keeps focus on the same unit, buffer dropped),
  MinMax (out-of-range COMMITS + aria-invalid), Controlled (echo-mid-typing
  '1','2' → '01' then '12' with buffer intact; owner rejection reverts;
  external push mid-edit; null clear round-trip), CompleteToIncomplete
  (backspace one segment → onValueChange(null) + empty hidden input),
  ConstrainEager (Jan 31 + month step → Feb 28 emitted; type Feb 30 →
  completing keystroke clamps), InForm (submit ISO; empty submits '';
  disabled submits nothing; reset restores defaultValue), WithCalendar
  (trigger + popover anchored to the GROUP; pick fills and closes;
  Alt+Down opens; close restores segment focus), DateOfBirth,
  Clearable (X appears with value, emits null, clears both range sides),
  Presets (footer buttons commit and close; range sidebar),
  MonthNameTyping ("j"/"ja" prefix cycle per locale), PlusMinus (segment
  ±1), InvalidReasons (incomplete names the missing unit; out-of-range
  includes the bound), Disabled/ReadOnly, SSRLocale (no-locale
  server/client order agreement).
- InputTime: TwelveHour (dayPeriod, A/P keys, 12↔hour-0 edges),
  TwentyFourHour (hourCycle override), Seconds (granularity + seconds-in-
  value forces the segment; inference from defaultValue), MinuteStep
  (step=15 arrow increments, free typing intact).
- InputDateTime: Basic, CalendarMerge (picked day + typed time), Placeholder
  seeding.
- Range mode (per family): InputDate Range (both sides, progressive
  emission), CalendarRange (fill from/to, closes on completion), Reversed
  (from > to → aria-invalid both, value as typed), CrossNavigation (Right
  from last "from" segment lands on first "to" segment), InputTime Range
  (business hours; reversed stamps invalid — overnight is the recorded
  `allowReversed` extension), InputDateTime Range (check-in/check-out).
- Calendar: existing stories + null-convention controlled trio.

## Verification plan

- **Plays type via synthetic `beforeinput`** (`new InputEvent('beforeinput',
  { inputType: 'insertText', data: '3', cancelable: true, bubbles: true })`)
  — the critique caught that KeyboardEvent dispatch never produces
  beforeinput, which would make the whole typing table unplayable (or
  worse, tempt a keydown implementation that passes plays and breaks
  mobile). Deletion plays dispatch `deleteContentBackward`.
- Trusted-event coverage (real caret + real beforeinput) in e2e via
  Playwright `page.keyboard.type` on segments. **Recorded status
  (2026-07): covered-by-probes.** The `tests/e2e` harness serves the real
  app only (playwright.config webServer pins the app server) and no app
  page composes an InputDate, so a committed e2e spec has nothing to
  drive; trusted typing (`page.keyboard.type` producing real beforeinput
  on a focused contenteditable segment) was verified with a Playwright
  probe against the stories server instead. Re-promote to a committed e2e
  spec when an app page adopts the family.
- The IME path (composition restore, selectionchange collapse) is covered by
  synthetic non-cancelable beforeinput + textContent mutation + input
  sequences; REAL on-device IME behavior is not verifiable by any harness
  here — recorded residual risk.
- Engine unit tests: segment derivation fixtures per locale (fixed probe),
  buffer/auto-advance table, ISO parse/serialize edges (padding, 0042,
  reject 24:00/ms), commit/constrain/null transitions, reconciliation rules.
- SSR fixture through ajo/html on a non-English machine locale.
- Full battery: tsc, unit, stories, e2e.
