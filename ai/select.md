# Unified Select

Design record for merging `packages/ajo-ui/src/select.tsx` and
`packages/ajo-ui/src/combobox.tsx` into one `Select` family — single,
multiple, searchable, editable, chips, and tagging as one component whose
mode emerges from composition. Status: **implemented** (2026-07-09), along
with slice R (Badge → Chip) and the CheckboxGroup sibling. Reviewed by an
adversarial critique pass (api-dx / a11y / feasibility / migration lenses);
every resolution below is post-review. Implementation deviations from the
letter of this doc:

- Label registration is limited to string items and explicit `textValue` —
  rich object items must not register concatenated children text, their
  display string is `itemToStringValue`. The registration store is a Map
  keyed by identity (the doc allowed either Map or dataset).
- Arrow-key opening keeps the pre-merge nudge: ArrowDown/Up on the closed
  trigger lands one step past the selection (tested behavior, native-select
  parity).
- Button-mode hover mirrors into real focus (menu-style, pre-merge tested
  behavior), not just `data-highlighted`.

Post-implementation adversarial review (engine / a11y / styling / fallout
lenses, 32 findings) drove these additional resolutions, now implemented:

- Enter commits through `collection.items()` (visible + enabled only) and a
  highlight the filter hid clears from `activeKey`/`aria-activedescendant`.
- Tab closes the popup from every branch (field, in-popup input, options),
  restoring focus to the field first; Escape also works while a chip holds
  focus (preventDefault-ed so ancestor dialogs stay open).
- Arrow keys work after mouse-opening a button select (open-state trigger
  branch focuses selected±step directly); first ArrowDown/Up without a live
  highlight lands on the first/last option, not past it.
- `disabled` guards `remove()`/`create()`/chip remove; chips' remove buttons
  carry per-item accessible names (`Remove «key»`).
- Mode 2 open state exposes ONE combobox: the in-popup input renders
  `role="searchbox"` without `aria-expanded`/`aria-haspopup` (the trigger
  stays the combobox). The listbox's `aria-labelledby` only renders when a
  trigger registered (input modes have no element with that id).
- The `labels` Map prunes unmounted, unselected keys each sweep so stale
  labels cannot suppress the create row.
- Themed height budget: content is a flex column clamped to
  `--available-height`; the list is the single scroller (`min-h-0`), so
  in-popup search, status, and create rows are never clipped. The input
  group's `w-full` stacking, `buttonVariants` size conflicts, and dead
  selectors were removed per the recorded class-conflict bug class.
- **UA-vs-author display (new class-conflict variant, user-caught)**: the
  height fix's unconditional `flex` on the popover content beat the UA
  `[popover]:not(:popover-open) { display: none }` rule, keeping every
  closed popup painted while all state (aria-expanded, data-state) closed
  correctly — 392 plays passed because they asserted state, never computed
  visibility. Fix: gate popup display on the open state
  (`[&:popover-open]:flex`); never put a bare display utility on a popover
  surface. The Basic and Autocomplete plays now assert
  `getComputedStyle(content).display` across closed/open/closed.

Recorded follow-up (out of this migration's scope): calendar/date-picker
still emit `undefined` on cleared selections, so controlled clearing there
has the echo bug the `controlled` clove change fixed for Select — adopting
the `null` convention in the calendar family is its own slice.

## Why

Selection from a list is one concern with three densities: RadioGroup
picks one from a short visible list, CheckboxGroup picks many from a
short visible list, and Select does both from lists that need a popup —
plus search, async items, autocomplete, and hand-added values. One family
should cover that whole third tier.

Today two files duplicate ~70% of their surface: Trigger + Value,
floating content, Item/Group/Label/Separator, controlled value/open
state, and the collection protocol. Select is the smaller island (string
values, hidden form input, typeahead, real-focus roving); Combobox is the
superset engine (generic values, multiple, chips, filtering, virtual
focus, empty state, SR announcements). Keeping both means every fix
lands twice or drifts — the anti-pattern AGENTS.md rules out ("smallest
cohesive final surface").

The references agree the split is convention, not architecture:

- **Base UI** ships Select + Combobox + Autocomplete with ~70% identical
  APIs; a maintainer concedes "Select is technically a combobox"
  (mui/base-ui#2734). Their sanctioned "select with search" is Combobox
  with the input inside the popup. Features land in one sibling and get
  re-requested in the other (Clear, Empty, virtualization).
- **React Aria** kept Select and ComboBox separate but converged anyway:
  both now support multiple selection, and their `Autocomplete` wrapper
  turns filtering into a composable behavior — their docs build a
  searchable select without ComboBox at all. Their split reduces to one
  focus-model rule (below); everything else is shared layers.
- **vue-multiselect** proves the DX demand for one component: single ↔
  multiple ↔ tags is a prop flip, not a component migration. Its failure
  modes are equally instructive: 50+ flat props with non-obvious
  interactions, CSS-only affordances invisible to AT, broken ARIA.
  Reference for ergonomics, not implementation.

## The field rule

Exactly **one closed-state field part** anchors the control, and it
decides the interaction model. Composing more than one field is
unsupported (the in-popup search input is not a field — it lives inside
the content):

| Field | Closed state | Open state |
|---|---|---|
| `SelectTrigger` | button, `role="combobox"`, `aria-haspopup="listbox"`, tab stop, typeahead | real focus roves the options (`collection.focusItem`) — **unless** the content holds a `SelectInput`, in which case open moves DOM focus into that input and highlight goes virtual |
| `SelectInput` | input, `role="combobox"`, `aria-autocomplete="list"`, shows selected label (single) | focus stays in the input; `aria-activedescendant` highlights options; typing filters |
| `SelectChips` + `SelectChipsInput` | chips + input, one tab stop | same as SelectInput, plus chip roving (real focus) |

Two axes, not one: (a) the closed-state tab stop is always the field;
(b) the open-state focus owner is the field's input if it has one, the
in-popup input if the content has one, or the options themselves
otherwise. Focus always returns to the field synchronously on close —
before the popover hides, so it never drops to `<body>`.

The trigger never renders `tabindex="-1"`: the toggle button inside an
editable field is `SelectInput`'s own addon (as today), not a
`SelectTrigger`. This fixes an existing bug — the current
`ComboboxTrigger` hardcodes `tabindex="-1"`, leaving the popup-search
composition keyboard-unreachable.

## Modes by composition

```tsx
// 1) Button select (today's Select) — SelectList is required in every mode
<Select name="theme" value={value} onValueChange={change}>
	<SelectTrigger><SelectValue placeholder="Theme" /></SelectTrigger>
	<SelectContent>
		<SelectList>
			<SelectItem value="light">Light</SelectItem>
			<SelectItem value="dark">Dark</SelectItem>
		</SelectList>
	</SelectContent>
</Select>

// 2) Button select with in-popup search (Base UI's "input inside popup")
<Select items={countries} itemToStringValue={c => c.label}>
	<SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
	<SelectContent>
		<SelectInput placeholder="Search…" showTrigger={false} />
		<SelectList>{(c: Country) => <SelectItem value={c}>{c.label}</SelectItem>}</SelectList>
		<SelectEmpty>No results.</SelectEmpty>
	</SelectContent>
</Select>

// 3) Editable autocomplete (today's Combobox)
<Select items={frameworks} autoHighlight>
	<SelectInput placeholder="Framework" showClear />
	<SelectContent>
		<SelectList>{(f: string) => <SelectItem value={f}>{f}</SelectItem>}</SelectList>
		<SelectEmpty>No framework found.</SelectEmpty>
	</SelectContent>
</Select>

// 4) Multiple with chips + tagging
<Select multiple items={tags} value={value} onValueChange={change} onCreate={create}>
	<SelectChips>
		{value.map(tag => <SelectChip key={tag} value={tag}>{tag}</SelectChip>)}
		<SelectChipsInput placeholder="Add tag…" />
	</SelectChips>
	<SelectContent>
		<SelectList>
			{tags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
			<SelectCreate />
		</SelectList>
	</SelectContent>
</Select>
```

`SelectCreate` lives INSIDE `SelectList`: it is an option, and options need a
listbox ancestor for `aria-activedescendant` scoping to hold.

Static children and render-function lists both work. Groups, labels,
separators, and the empty state are shared across modes and swept by the
collection (separators survive only between visible items).

## Root args

```ts
export type SelectArgs<T = string, Multiple extends boolean = false> = WithChildren<{
	// Data
	items?: T[]
	value?: (Multiple extends true ? T[] : T) | null   // null = controlled empty
	defaultValue?: Multiple extends true ? T[] : T
	multiple?: Multiple
	// Search text (meaningful only when an input part is rendered)
	inputValue?: string
	defaultInputValue?: string
	onInputValueChange?: (value: string, event?: Event) => void
	// Open state
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean, event?: Event) => void
	// Selection
	onValueChange?: (value: (Multiple extends true ? T[] : T) | null, event?: Event) => void
	// Tagging: called when the SelectCreate row is committed; the consumer
	// owns creation (push to items and value), vue-multiselect style
	onCreate?: (text: string, event?: Event) => void
	// Item shaping — ONE function, same meaning as today's combobox:
	// display text, filter haystack, identity, and form serialization
	itemToStringValue?: (item: T) => string
	// Filtering (Base UI's trio: default / custom / null = external)
	filter?: ((item: T, search: string, text: string) => boolean) | null
	// Behavior
	autoHighlight?: boolean
	// Form
	name?: string
	required?: boolean
	disabled?: boolean
	// A11y
	resultsLabel?: (count: number) => string
}>
```

Decisions folded in (post-review):

- **`null` means controlled-empty; `undefined` means uncontrolled.**
  `onValueChange` emits `null` (single) or `[]` (multiple), never
  `undefined` — otherwise a controlled consumer echoing the cleared
  value back silently flips the component to uncontrolled (the
  `controlled` clove treats `!= null` as bound). Prerequisite: the
  clove's `sync` must distinguish `undefined` from `null`; its other
  consumers update mechanically (migration step 0).
- **One `itemToStringValue`, unchanged meaning.** The draft's Base-UI
  style label/value split silently repurposed an existing arg (today it
  means display/filter text and existing consumers pass it with that
  intent). It stays the single string view of an item — display, filter
  haystack, identity, and form serialization. `{ value, label }`-shaped
  objects auto-resolve (the current `fallbackString`). A separate form
  serializer is a recorded extension, not a v1 arg.
- **Identity is the raw string, never `slug`.** `slug` collapses
  non-Latin and punctuation-distinct labels ("C++"/"C#" → "c";
  "日本語" → "item"), which breaks selected-key membership, highlight,
  and mints duplicate DOM ids. Identity keys are
  `itemToStringValue(item)` verbatim (today's select semantics); DOM ids
  encode via `encodeURIComponent` (today's select `itemId`). This fixes
  a live combobox bug the draft had promoted to contract.
- **Filter trio with an honest `null`.** Omit for built-in matching
  (case-insensitive, every whitespace-separated token must match), pass
  a function to customize, pass `null` to disable internal filtering
  (async/server lists: consumer drives `items` + `inputValue`).
  Implementation note: `args.filter ?? defaultFilter` would swallow
  `null` — derive as `filter === undefined ? defaultFilter : filter ??
  passAll`, and `matches()` returns true for every item when external.
- **Filtering exists only when an input part is registered**; without
  one, typing is typeahead.
- **`readOnly` dropped** — no inherited semantics, no consumer; recorded
  as an extension point instead of shipping an unspecified arg.
- Dropped from the old surfaces: select's string-only value and label
  Map (the Map dies; item-side label registration survives — see
  Identity and labels), combobox's `shouldFilter` (subsumed by
  `filter: null`), `ComboboxCollection` (alias of List),
  `useComboboxAnchor` (React-ism).

### TypeScript

`T` defaults to `string` so mode 1 keeps today's DX. Context-driven
parts cannot infer `T` from the root, so render functions annotate their
parameter (`{(c: Country) => …}`) — the examples model this. `Multiple`
narrows the value axis so single-mode consumers get `(value: T | null)`
without casts; consumers that set `multiple` get `T[]`. Generic parts
(`SelectList`, `SelectItem`, `SelectChip`) are declared as generic
functions; explicit type arguments (`<SelectList<Country>>`) are the
escape hatch when annotation is awkward.

## Parts

| Part | Role | Notes |
|---|---|---|
| `Select` | root | state owner; hidden form inputs when `name` is set |
| `SelectTrigger` | button field | always `role="combobox"` + tab stop (see field rule); `size` stays a themed `data-size`; keeps `data-placeholder` |
| `SelectValue` | span | children override → selected labels (see Identity and labels) → `placeholder`; `data-placeholder` when empty |
| `SelectInput` | input field or in-popup search | InputGroup with `showTrigger` / `showClear` addons as field; plain search box inside content |
| `SelectClear` | button | renders only when there is something to clear |
| `SelectContent` | popover | `popover="manual"` + dismiss clove; placement via data-attrs as today; no ARIA role of its own |
| `SelectList` | listbox — **required in every mode** | `role="listbox"`, owns the list id that `aria-controls`/`aria-activedescendant` target; `aria-multiselectable` when multiple; static children or `(item, index) =>` render function; the scroll container |
| `SelectItem` | option | `value?: T`, `textValue` (plain-text label for rich children), `keywords`, `forceMount`, `disabled`, `onSelect`; registers `data-label` |
| `SelectGroup` / `SelectLabel` | group + heading | swept when emptied by filtering |
| `SelectSeparator` | separator | swept: survives only between visible items |
| `SelectEmpty` | empty state | shown when filtering hides every option — but with a search field present, only while a query is typed: the empty state is strictly a search RESULT, so a first open (or a cleared query) with zero items renders nothing instead of a misleading "not found" (2026-07-10, user report on the async story) |
| `SelectStatus` | async status | keep-mounted `aria-live="polite"` region inside the content; children swap ("Loading…", counts, a `Spinner`); rendering one suppresses the built-in count announcement (no double-speak) |
| `SelectCreate` | create-tag row | collection item; visible when the search is non-empty and matches no item's label exactly; commit calls root `onCreate(search)`; children override the default "Create «{search}»" content |
| `SelectChips` | chips wrapper | anchor in chips mode |
| `SelectChip` | chip | first-class `value` arg; built-in remove button (`tabindex="-1"`); themed layer composes `Chip` (the renamed Badge) |
| `SelectChipsInput` | input | chips-mode search input |
| `SelectScrollUpButton` / `SelectScrollDownButton` | scroll nudge | target the `SelectList` scroller (not the content) |

A single `SelectList` requirement replaces the draft's conditional
listbox role: options always have a listbox ancestor, the ARIA target id
is unambiguous, and SSR renders correct roles in one pass. Existing
button-mode consumers gain one wrapper element in migration.

All parts keep house conventions: `data-slot="select-*"`,
`data-item="select"` collection protocol, `*Class` args for themed
icons/sub-elements, attr bags where handlers target rendered children.

## Interaction model

Shared engine: one `floating()` popup, one
`collection('select', { rendered: false })`, `controlled` value + search
+ open, group/separator/empty sweep, `announce` for filtered result
counts **and selection mutations** — in multiple mode toggling announces
"«label» selected/deselected, N selected" and chip removal announces
"«label» removed, N selected" (state flips on an unchanged
`aria-activedescendant` are not reliably announced otherwise; chip
removal is silent otherwise).

**Highlight contract:** `data-highlighted` (set by
`collection.highlight`/`focusItem`) is the single styling hook in both
focus models. Button mode uses `collection.focusItem` — real focus plus
the mirrored attribute in one call; the generator-local `highlighted`
variable from today's select dies, the attribute does not.

**Button field, no in-popup input:**

- Closed: ArrowDown/Up/Enter/Space open (arrows then move to
  first/selected item); printable keys run **closed typeahead** — this
  is NEW behavior, not lifted from select (today's trigger branch
  returns before `ta.handle`): the match commits the value directly,
  without opening, focusing, or touching highlight. Options resolve
  while closed because the collection skips rendered-layout checks.
- Open: real focus roves (`focusItem`), typeahead jumps, Enter/Space
  selects; single closes and refocuses the trigger; **multiple toggles
  without closing** (native multi-listbox convention) — Escape or
  outside dismisses. A `closeOnSelect` override is a recorded extension.
- **Single toggle-off (2026-07-10, user request)**: committing the
  already-selected option deselects it (`null`, the controlled-empty
  convention) unless the root is `required` — a required selection cannot
  be emptied from the list. Either way the commit closes the popup. Policy
  lives in the base `select()` (all field modes and both input paths share
  it); the Deselectable and Required stories pin both sides.

**Button field + in-popup `SelectInput` (mode 2):**

- Closed: identical to button mode, except printable keys open the popup
  and seed the search input instead of typeahead.
- Opening moves DOM focus into the in-popup input (the `floating`
  `onSync` hook, like select's `pendingFocus` today); from there the
  input-mode rules below apply. Closing — Escape, selection (single),
  Tab — returns focus to the trigger synchronously.

**Input field (editable / chips):**

- Focus stays in the input; ArrowDown/Up move `activeKey`
  (`aria-activedescendant` → option ids inside the list), Enter commits
  the highlighted option, typing filters and opens.
- **Escape ladder** (fixes a live combobox bug where closed-Escape
  reopens the popup through `setSearch`): open → `preventDefault`
  (always, so an ancestor Dialog doesn't also close), close, keep the
  selection, restore the label display, focus per field rule; closed →
  no-op. Closing clears the uncontrolled search as a side effect of
  close itself — there is no second Escape stage.
- Single: committing closes and clears the uncontrolled search; the
  input shows the selected label while closed.
- Multiple: committing keeps the popup open, clears the search, toggles
  the item; Backspace in an empty chips input removes the last chip.
- **Chips keyboard — real focus roving, not activedescendant** (chips
  are siblings of the input, outside the listbox; referencing them from
  `aria-activedescendant` is invalid and inaudible): ArrowLeft from
  caret-0 moves real focus to the last chip (RTL-aware); arrows move
  between chips and return to the input past either end;
  Backspace/Delete removes the focused chip and focuses a neighbor (or
  the input); printable keys bail back to the input. Chips and their
  remove buttons are `tabindex="-1"` — one tab stop overall. While a
  chip holds focus the input's `aria-activedescendant` is cleared.

**Create row:** `SelectCreate` participates in the collection, so arrows
reach it and Enter commits it in both focus models; commit calls
`onCreate(search)` and clears the uncontrolled search. The consumer owns
creation (append to `items`/`value`) — the component never invents
items.

**Async / server-driven lists:** no `loading` root arg — the consumer
already owns the async lifecycle (`filter={null}`, drive `items` from
`onInputValueChange`). The recipe: render the system `Spinner` inside
`SelectStatus` (or as an input addon — `SelectInput` children land in
the InputGroup) while fetching, swap `SelectStatus` children to the
result count when done, and render `SelectEmpty` only when not loading
so "no results" never flashes mid-fetch. `SelectStatus` is the polite
live region, so screen readers hear the same states sighted users see;
the built-in count announcement stands down while one is rendered.

**Dismiss config (all modes):** `popover="manual"` with the dismiss
clove — `escape: false` (Escape stays inline per the recorded cloves.md
decision; it must also work relative to field focus, not popup state
alone), `outside: true`, `inside: [content, field]`. Accepted deltas vs
today's `popover="auto"` select: opening no longer auto-closes sibling
auto popovers, and the popup does not participate in the top-layer
light-dismiss stack — dropdown-menu and combobox already live with both.

## Identity and labels

- Identity key: `itemToStringValue(item)` verbatim. DOM ids:
  `encodeURIComponent` over the key. `slug` is never identity.
- Label resolution for `SelectValue` and chips:
  item-registered label (`SelectItem` registers
  `textValue ?? text(children)` into `data-label` — this is what keeps
  `<SelectItem value="0">January</SelectItem>` displaying "January";
  calendar and the stories harness depend on it) →
  `itemToStringValue(item)` → placeholder. The old `labels` Map dies;
  registration through the collection dataset survives.

## Form integration

`name` renders hidden inputs inside the root: one for single mode, one
per selected item for multiple (repeated-name FormData convention),
serialized through `itemToStringValue`. An empty multiple selection
submits nothing (checkbox-group semantics). `required` mirrors to
`aria-required` on the field — **native constraint validation is out of
scope**: `required` on `type="hidden"` is inert per the HTML spec, so
the draft's claim is gone; a visually-hidden focusable input is the
recorded extension if native blocking is ever needed.

## SSR

Roles are render-derivable in one pass: `SelectTrigger` always renders
`role="combobox"`, `SelectInput`/`SelectChipsInput` always render
`role="combobox"`, `SelectList` always renders `role="listbox"` — and
the field rule (one field part) guarantees only one combobox reaches the
server HTML in valid compositions. Mode 2's in-popup input also carries
the role; it is hidden inside the closed popover, matching how the
current combobox SSRs. No registration-dependent ARIA, no first-paint
convergence beyond what the field clove already records.

## System reuse

The point of the merge is one system, not one file. Sharing happens at
the layer where it is sound:

**Why Select does not compose DropdownMenu.** Visually the option list
is "a dropdown menu", but they are different ARIA patterns with
different contracts: menu = actions (`role="menu"`/`menuitem`,
activate-and-close, submenus, hover intent, `aria-haspopup="menu"`);
listbox = persistent value selection (`role="listbox"`/`option`,
`aria-selected`, multiselectable, form participation,
`aria-haspopup="listbox"`). Screen readers announce and drive them
differently, and every reference (React Aria, Base UI, Radix) keeps
Menu ≠ Listbox. Building one from the other forces wrong roles on one
side or bloats both. What they genuinely share, they **already share one
layer down** — that is what the consolidation built:

| Layer | Shared by menu + select + command | Mechanism |
|---|---|---|
| open/placement/dismiss | yes | `floating()` engine |
| item discovery/highlight/sweep | yes | `collection()` protocol |
| keyboard movement/typeahead | yes | `roving` / `typeahead` cloves |
| controlled state | yes | `controlled` clove |
| SR announcements | yes | `announce` clove |
| parts (Item/Content/…) | no — roles differ per family | per-family, thin |
| visual language | should be — today duplicated | themed tokens (below) |

**ScrollArea → every scrolling popup.** ScrollArea is (correctly) a
class-only native scroll container. Because base parts own their
elements, popup scrollers can't nest the component without inserting a
generic div between `listbox` and its options — so ScrollArea exports
its classes as a variant (the `buttonVariants` pattern, which calendar
already uses for exactly this): `scrollAreaVariants` consumed by the
themed `SelectList`, dropdown-menu content, and command list, replacing
today's hand-copied `overflow-y-auto scrollbar-soft` strings. The
standalone component keeps `tabindex="0"` (focusable region); popup
scrollers apply the variant with their own role/tabindex. Scroll
buttons target whichever element carries it. Retrofitting dropdown-menu
and command is part of the shared-tokens pass below.

**Shared visual tokens (theming session deliverable).** The themed
menu/select/command files each hand-copy near-identical "popup surface"
(glass-overlay edge rounded shadow z-50 p-1 + open/close animations) and
"list row" (flex gap-2 rounded-sm py-1.5 text-sm
`data-[highlighted]` accent…) strings. Extract both as shared tokens in
`src/ui` so the families read as one visual system; this migration
consumes them for Select, the theming session retrofits the rest.

Component-level reuse in this migration:

- **Badge becomes `Chip`, repo-wide**: the standalone Badge renames to
  Chip — with a remove affordance it is an interactive token, and the
  rename aligns the system with the Material taxonomy (chip =
  standalone token/label, badge = dot/count attached to another
  element). `AvatarBadge` and `SidebarMenuBadge` keep their names —
  they are true badges under that taxonomy. Chip gains the optional
  remove affordance (trailing close button — it already supports a
  leading icon); the themed `SelectChip` composes Chip instead of
  duplicating styles.
- **ScrollArea → list**: via `scrollAreaVariants` as above.
- **Spinner → async status**: the existing `Spinner` (accessible label
  included) renders inside `SelectStatus` or as an input addon — no
  select-specific spinner part.
- **InputGroup → editable field**: unchanged, `SelectInput` already
  composes it.
- **Field → forms**: themed field parts keep consuming `FieldContext`
  for control/button attrs.
- Command keeps sharing `collection` + sweep + `floating` — the right
  level of reuse for the palette pattern; it stays a separate family.

## Sibling: CheckboxGroup

The continuum this doc opens with has a hole: ToggleGroup covers
single/multiple for button-shaped choices, RadioGroup covers
one-of-a-short-list for form controls, Select covers both behind a
popup — but many-of-a-short-list with form controls has no owner.
`CheckboxGroup` fills it (Base UI and React Aria both ship one):

- `CheckboxGroup` root: `value?: string[]` / `defaultValue?: string[]`
  / `onValueChange?: (value: string[], event: Event) => void` — always
  multiple, so no discriminated union and no `null` convention needed
  (`[]` is controlled-empty unambiguously); `disabled` and `name`
  cascade; `role="group"`.
- `CheckboxGroupItem` wraps the existing `Checkbox` (the ToggleGroup /
  ToggleGroupItem precedent): derives `checked` from membership,
  reports toggles through context.
- Form story is **native**: the cascaded `name` on each real checkbox
  input submits repeated keys — no hidden inputs at all.
- Parent select-all with indeterminate (Base UI's `allValues`) is a
  story recipe over the existing indeterminate support, not API.
- Themed layer + Field integration + stories mirror RadioGroup's.

Independent of the Select migration — lands as its own slice (like R),
any time.

## Recorded extension points (deferred, no-consumer rule)

- `closeOnSelect` override (vue-multiselect knob; defaults derive from
  `multiple` for now).
- Delta callbacks (`onItemSelect`/`onItemRemove`) or reason-tagged
  change events (Base UI style) — today removal is observable only as an
  array diff; add when a consumer needs the delta.
- `readOnly` semantics (popup opens, mutations are no-ops).
- Separate form serializer (label ≠ submitted value).
- Chip overflow (`limit` + "+N more") — themed/userland slice.
- Virtualization (`items` + render function is the seam).

## What dies

- `packages/ajo-ui/src/combobox.tsx` and `src/ui/combobox.tsx`.
- Select's `labels` Map, generator-local highlight bookkeeping, and
  string-only values.
- Combobox's `shouldFilter`, `ComboboxCollection`, `useComboboxAnchor`,
  slug-based identity, hardcoded `tabindex="-1"` trigger, and the
  closed-Escape-reopens bug.
- The `combobox` collection kind and `combobox-*` data-slots.

## Migration plan

Slice R stands alone (compiles independently — land it first as its own
commit). Slices 0–4 are **one atomic compile unit** (the deleted
combobox module is imported by stories and the themed layer; the stories
harness itself consumes the themed Select for every story's controls, so
it breaks the debugging tool if left half-migrated). Verify at the end:

R. **Rename Badge → Chip, repo-wide**: `src/ui/badge.tsx` →
   `src/ui/chip.tsx` (`Badge`/`BadgeArgs`/`BadgeVariant`/`badgeVariants`
   → `Chip`/…/`chipVariants`, `data-slot="badge"` → `"chip"`);
   `src/ui/index.ts`; `badge.stories.tsx` → `chip.stories.tsx`; usages
   in `src/(app)` (dashboard, layout, admin/registration, admin/users,
   account/chats/view, account/sessions), `tests/stories/app.tsx`, and
   `card.stories.tsx`. `AvatarBadge`/`SidebarMenuBadge` keep their
   names (true badges: attached dots/counts). Audit
   `tests/e2e/chat.spec.ts` unread-badge locators for
   `data-slot="badge"` references. Chip gains the optional remove
   affordance here.
0. **Prerequisite**: `controlled` clove distinguishes `undefined`
   (uncontrolled) from `null` (controlled empty); update its call sites
   across ajo-ui mechanically.
1. **Base**: unified `packages/ajo-ui/src/select.tsx`; delete
   `combobox.tsx`; remove the `./combobox` re-export from
   `packages/ajo-ui/src/index.ts`; update `packages/ajo-ui/README.md`.
2. **Themed**: merge `src/ui/combobox.tsx` into `src/ui/select.tsx`
   (trigger sizes + `data-placeholder` from select; content/list/item/
   chips/empty from combobox; scroll buttons retarget the list);
   `scroll-area.tsx` exports `scrollAreaVariants` and the themed
   `SelectList` consumes it; themed `SelectChip` composes `Chip`; update
   `src/ui/index.ts`. Dropdown-menu/command adopting the shared tokens
   is the theming session's pass, not this slice.
3. **Consumers** (each needs mechanical edits — none are "unchanged"):
   `src/ui/calendar.tsx` (wrap items in `SelectList`; narrow
   `onValueChange` `(next) => change(String(next ?? ''))`),
   `src/ui/data-table.tsx` (same), `tests/stories/app.tsx` harness
   ArgControl (same; migrate and smoke this first — it is the tool used
   to debug everything else). No `src/(app)` page imports either family
   (verified); date-picker consumes calendar, not Select directly.
4. **Stories**: merge `select.stories.tsx` + `combobox.stories.tsx`
   into one `select.stories.tsx` covering: the four modes, tagging,
   groups + sweep, forms (hidden inputs), both focus models' keyboard
   plays, chips keyboard + RTL, closed typeahead, Escape ladder, and an
   async story (debounced fake fetch: Spinner in SelectStatus,
   Empty-only-when-not-loading).
5. **Docs**: `ai/architecture.md` floating-stack paragraph, this file's
   status flip, `readme.md` if it names Combobox.
6. **Verify**: `pnpm exec tsc --noEmit`, `pnpm test:unit`,
   `pnpm stories:test`, `pnpm test:e2e`.

No compatibility aliases — consumers migrate in the same change
(AGENTS.md compatibility stance).
