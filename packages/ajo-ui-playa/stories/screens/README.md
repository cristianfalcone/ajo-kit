# Screen stories

Playa is judged in composition: a real screen, not a component on its own. These seven
stories compose Playa families, with admin content, into the screens an operations app
needs. Each one runs in five variants (light and dark at 1280 px, light and dark at
390 px, RTL light at 1280 px) plus the open layers it declares.

| Screen | Stories | Layers |
|---|---|---|
| `Screens/Form` | Blank, Invalid, Submitting | `environment` (Blank) |
| `Screens/Settings` | Default | `delete-host` |
| `Screens/Table` | Default, Filtered, Loading, No Results | `row-actions`, `filter`, `columns` (Default) |
| `Screens/Dialog` | Default, Server Error | `add-domain` (a drawer at 390 px), `remove-domain` |
| `Screens/Dashboard` | Default | none |
| `Screens/States` | No Apps, No Results, Failed, Denied, Loading | none |
| `Screens/Navigation` | Default | `command`, `user-menu` (1280 px), `sidebar` (390 px) |

## Running

```bash
pnpm stories                                   # browse them at /story/screens-form--blank
pnpm stories:test:screens                      # every screen, five variants, all checks
pnpm stories:test:screens --match screens-form # one screen
```

Captures land in `.tmp/screens/<run>/` with a `summary.json`, each at the screen's full
height, open menus and popovers included; a modal layer is captured at the window's
height (900 px), over the page scrolled to its trigger. The run fails on a check or a
play, never on pixels; it lists captures that differ from the reviewed references in
`stories/visual/`.

## Writing a screen

- Compose Playa families only; layout (grids, gaps, widths) is the screen's own. When a
  family cannot do something yet, compose it by hand and say what it waits for in a
  comment (the busy button until Button takes `loading`). Fields side by side go in a
  `FieldRow` inside a `FieldGroup`, and a field that can show an error passes `invalid`
  even while it is valid, so its message line is kept.
- `Page` and `Section` in `page.tsx` give every screen the same header and sections.
- Copy goes through `t(english, arabic)`: the RTL variant reads Arabic, so bidi defects
  show and full stops stay at the end. Values a person copies (ids, domains, addresses,
  versions, log lines) stay Latin in `<bdi>` or an input with `dir="ltr"`.
- Content follows the Words rules: real admin content, sentence case, plain verbs, the
  toast or result uses the button's verb, errors say what went wrong and how to fix it,
  no em or en dashes, no arrow glyphs, no middle-dot strings.
- State is deterministic in every variant: fixed data and times, no randomness, no clock.
  A play that changes state ends with no layer open and no focus left on the page.
- A play that changes an arg to check something resets it in `finally`, so a failure
  never leaves the changed state for the capture and the checks (a play that reaches its
  story's state, as Form Submitting does by submitting, keeps it):

  ```tsx
  play: async ({ canvas, setArg }) => {
    try {
      await assertStill(canvas, () => setArg('invalid', true))
    } finally {
      setArg('invalid', false)
    }
  },
  ```

- A play reports geometry through `CheckError` (`still`, `row`) so a known defect can be
  listed; any other throw is a play failure and stops that variant.
- Layers are `parameters.layers`: a name and the selector of the trigger the runner
  clicks, optionally limited to some widths. The runner sees a layer open when its
  trigger reports `aria-expanded` or a new dialog, menu, listbox or popover shows. A
  toast shows inside an always-open viewport, so no screen captures one yet.
- `parameters.known` lists each failure a screen has today, per check, variant and
  target, with the slice that fixes it. An entry that no longer covers a failure fails
  the run: the slice that fixes a defect removes its entry.

## Keyboard

Each screen's main task runs by keyboard in a play, with `press()` from `play.ts` where
the Ajo UI behaviour listens to `keydown`, and focus returns to the trigger of every
layer it closes:

| Screen | Story | By keyboard |
|---|---|---|
| `Screens/Form` | Submitting | the memory limit Select (ArrowDown to open and move, Enter to choose), then submit |
| `Screens/Table` | Filtered | the Status filter (Enter, Enter on Live, Escape), then a row's actions (Enter, ArrowDown, Escape) |
| `Screens/Navigation` | Default | Ctrl K, ArrowDown and Enter in the command search; the user menu (Enter, ArrowDown, Escape) at 1280 px |
| `Screens/Dialog` | Default | none yet, see below |

A play dispatches untrusted events, so the steps the browser performs itself cannot run
in one: typing into a text field (the play sets the value and fires `input`), the
implicit submission of Enter in a field (`requestSubmit()`), Tab, Enter or Space on a
native button, checkbox or switch, and Escape on a native dialog (the play fires
`cancel`). Dialog is all native, so its play opens it with `click()`. Giving plays
trusted keys through the runner's keyboard is still open (see "Open items" below).

## Not captured yet, or listed loosely

- Dialog's async submit: the form turns busy while the host answers, but no story shows
  it; a pending state is captured once Button takes `loading` (p5-kit-10) and the modal
  lane reworks the dialog (p5-kit-15).
- Table's frosted header when scrolled: no story scrolls the table (p5-kit-17).
- Table Loading holds each row's top and height, but the columns move 4 to 14 px
  sideways when the data lands: the skeleton widths drive the table's automatic layout,
  and `assertHeld` compares only top and height (p5-kit-17, DataTable's loading state).

## Open items

What the screen pass (p5-kit-19) left open, each with its owner. An item closes when its
owner lands it or Cristian drops it.

- **Plays that press real keys (the W4 pass).** The runner gives plays the page's trusted
  keyboard, so Dialog's play finishes its task by keyboard (Tab, Enter on native
  buttons, Escape on the native dialog).
- **InputDate on `popupMotion` (the pickers lane in W4).** InputDate is the last user of
  `internal/recipes.tsx` `popupAnimation` and `popupSlide`; moving it onto
  `internal/popup.tsx` `popupMotion` deletes both and their `slide-in-from-left/right`
  entries in the direction allowlist.
- **`--tooltip` and `--shadow-lg-filter` tokens (the floating lane in W4).** A registered
  `--tooltip` colour replaces `light-dark(var(--navy),var(--popover))` in
  `preset/floating.ts`, and a `--shadow-lg-filter` next to `--shadow-lg` replaces the
  tooltip's hand-written `drop-shadow` pair.
- **NavigationMenu (the navigation lane in W4).** The open trigger and the current link
  wear the same gold tint side by side; the proposal is the raised fill for the open
  trigger and gold for the current item, as in the Sidebar (Cristian's eye). Its list
  below `sm` fades both ends statically (`scroll-fade-x`) and indents its first item
  16 px; an `overflow()` stamp on the list in ajo-ui, as Tabs has, fades only the side
  with more to see.
- **Button's open ghost trigger (the actions lane in W4).** A table row's open actions
  trigger wears the gold tint, while the open facet and Columns triggers beside it take
  the raised fill, so one open state reads two ways on the Table screen; the proposal is
  the raised fill for any open ghost trigger, as for NavigationMenu.
- **Time segments and SC 2.5.8 (Cristian).** A time segment reaches less than 24 px
  where the next one's target covers it (the hour in "9:30" reaches 20 to 22 px) and has
  no equivalent control, so the target-size check fails it on any screen that composes
  an InputTime (the admin in W5). The way out is his: wider time segments, or a known
  item he accepts on the family story; the screens gate never hides it.

Closed by the reference pass: date segments keep their digits together ("10/5/2026", on
the text column of the other controls) and each keeps a 24 px target as a centred
`::before`, so the time units stay inline in RTL too. Where two targets overlap (a
one-digit day beside a two-digit month) the later segment takes the shared strip, a few
pixels of the month's last digit included. The target-size check measures what a pointer
reaches, each `::before` box less the strip a later target covers, so in "10/5/2026" the
month is about 19 px wide; a date field meets 2.5.8 through its calendar button, under the
criterion's equivalent exception (`equivalent` in `play.ts`: day, month and year segments
pass while their field's calendar button passes), and a time field does not.

Closed by the screen pass: `--glass-overlay` is 75 % (70 % let a Select's help line ghost
through at 390 px; 75 % sits in the direction mock's 74 to 76 % and at the floating
layers' bound, above which a gold row or a danger stripe under a menu stops tinting it),
and `--border-on-accent` has no user left (no
family draws a border on the accent tint), so there is nothing to tune.

## Checklist

Every review round answers these for each screen, in all five variants and its open
layers. A "no" is a finding with its owner.

**Composition**

1. Is there one primary action on the screen, and is it the only gold plate?
2. Is gold elsewhere only focus and the selected item of a set (tab, day, current item,
   selected rows, menu highlight)?
3. Is the hierarchy shallow: the page title once, section headings, then content?
4. Is everything start-aligned (right in RTL), with centred text only in empty states?
5. Does content sit on the page, with panels only where grouping carries meaning?

**Rhythm and alignment**

6. Do all spacings and line heights fall on the 4 px grid and the one spacing scale?
7. Do controls in one row share a top and a height, with or without help or an error?
8. Does an error appear without moving anything around it?
9. Are input, select, date, button and toggle of one size the same height in a row?
10. Does a horizontal field (switch or checkbox with its label) line up with a control
    beside it?

**Materials and type**

11. Are surfaces flat fills with a hairline, with no bevel, inset or sunken look?
12. Do only floating layers cast a shadow, and are bars, menus and popovers frosted?
13. Is the dark theme neutral, with no blue anywhere?
14. Is the page title the one serif line, and are ids, versions and logs in the data
    face?
15. Are there no uppercase or tracked labels and no mono labels?

**States**

16. Does every focusable element show one flush ring, never a double ring or the native
    outline?
17. Do hover, pressed, selected, disabled and invalid each read as themselves?
18. Does a busy action keep its width and say it is busy?
19. Does an empty or error state say what happened and offer the next action?
20. Does the loading state hold the loaded layout's geometry?

**Words**

21. Is the copy real admin content, in sentence case, with plain verbs?
22. Do errors state the fix without apologising?
23. Is there no em or en dash, arrow glyph or middle-dot string?

**Direction, width and access**

24. Does RTL mirror the layout and icons that mean direction, and keep Latin values
    readable?
25. At 390 px does the content keep its full width, with wide tables scrolling inside
    their own region?
26. Does the screen pass contrast AA in both themes, and do targets meet 24 by 24 px?
27. Does the keyboard reach everything in order, with focus moved into a layer and
    returned from it?
