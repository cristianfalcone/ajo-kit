# Screen stories

Playa is judged in composition: a real screen, not a component on its own. These seven
stories compose Playa families, with admin content, into the screens an operations app
needs. Each one runs in five variants (light and dark at 1280 px, light and dark at
390 px, RTL light at 1280 px) plus the open layers it declares.

| Screen | Stories | Layers |
|---|---|---|
| `Screens/Form` | Blank, Invalid, Submitting | `environment` (Blank) |
| `Screens/Settings` | Ink, Plate | `delete-host` (Ink) |
| `Screens/Table` | Default, Filtered, Loading, No Results | `row-actions`, `filter`, `columns` (Default) |
| `Screens/Dialog` | Default, Server Error | `add-domain` (a drawer at 390 px), `remove-domain` |
| `Screens/Dashboard` | Default | none |
| `Screens/States` | No Apps, No Results, Failed, Denied, Loading | none |
| `Screens/Navigation` | Default | `command`, `user-menu` (1280 px), `sidebar` (390 px) |

Settings has a `gold` arg: `ink` fills an "on" switch, checkbox or radio with the text
colour, `plate` puts the gold plate on each. Both are captured so they can be compared.

## Running

```bash
pnpm stories                                   # browse them at /story/screens-form--blank
pnpm stories:test:screens                      # every screen, five variants, all checks
pnpm stories:test:screens --match screens-form # one screen
```

Captures land in `.tmp/screens/<run>/` with a `summary.json`. The run fails on a check
or a play, never on pixels; it lists captures that differ from the reviewed references in
`stories/visual/`.

## Writing a screen

- Compose Playa families only; layout (grids, gaps, widths) is the screen's own. When a
  family cannot do something yet, compose it by hand and say what it waits for in a
  comment (the ad hoc field row until FieldRow, the busy button until Button takes
  `loading`).
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
trusted keys through the runner's keyboard is p5-kit-19's, so that every screen then
completes its task by keyboard alone.

## Not captured yet, or listed loosely

- Dialog's async submit: the form turns busy while the host answers, but no story shows
  it; a pending state is captured once Button takes `loading` (p5-kit-10) and the modal
  lane reworks the dialog (p5-kit-15).
- Table's frosted header when scrolled: no story scrolls the table (p5-kit-17).
- Navigation's sidebar ends with the page content, not the viewport: SidebarProvider
  takes its content's height (p5-kit-18).
- Form's "Start on boot" switch stretches across its column, because a vertical Field
  makes every child full width, so its checked thumb sits at the start and reads as off
  (at the other end in RTL). p5-kit-08's field zones centre it in the control row.
- Table Loading holds each row's top and height, but the columns move 4 to 14 px
  sideways when the data lands: the skeleton widths drive the table's automatic layout,
  and `assertHeld` compares only top and height (p5-kit-17, DataTable's loading state).
- Dashboard's chart: the tooltip stays open after keyboard focus leaves the chart (the
  runner measures reflow once the resize has settled, where it fits); at 1280 px the
  y-axis labels hang about 13 px before the section's start edge; in RTL the axis stays
  on the left and its lowest label covers the first data point (p5-kit-17).

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
