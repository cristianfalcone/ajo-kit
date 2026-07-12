# Ajo UI Stories Reference

Status: **implemented**. This document describes the current harness in
`tests/stories-server.ts` and `tests/stories/app.tsx`.

The harness is the executable catalog for the themed `src/ui` layer. It is a
small Ajo application served by Vite and exercised with Playwright.

## Commands

```sh
pnpm stories
pnpm stories:test
pnpm stories:test --match checkbox
pnpm stories:test:visual
pnpm stories:test:visual --match calendar
```

`pnpm stories` starts the manager on `127.0.0.1:5182`. Pass
`--port <number>` when that port is occupied.

`--match` is case-insensitive and selects stories whose id, title, or name
contains the supplied text. It filters the canvas smoke run, not discovery or
the manager smoke.

Visual mode writes deterministic captures to `.tmp/stories-screenshots`.
The directory is recreated on every run.

## Discovery And Identity

`import.meta.glob('./*.stories.tsx')` is the only catalog index. Adding or
removing a story module changes the catalog without editing a registry.

Each module exports one default `Meta` object and named `Story` objects.
The harness sorts entries by title and story name.

An entry id is derived from its title and export name. Links, `--match`,
Playwright diagnostics, iframe messages, and screenshot filenames all use that
same id.

The discovered summaries are published as
`globalThis.__AJO_STORIES_INDEX__`. The runner reads this index from the
browser, so tests and the manager cannot drift onto separate catalogs.

## Current Catalog

The current checkout discovers 63 story modules:

- Core display: Accordion, Alert, AspectRatio, Avatar, Breadcrumb, Bubble,
  Button, ButtonGroup, Card, Chip, Collapsible, Empty, Item, Kbd, Label,
  Marker, Separator, Skeleton, Spinner, Table, Typography.
- Fields and choices: Checkbox, CheckboxGroup, Field, Input, InputGroup,
  InputOTP, Progress, RadioGroup, Select, Slider, Switch, Textarea, Toggle,
  ToggleGroup.
- Date and time: Calendar, InputDate, InputDateTime, InputTime.
- Navigation and layout: Carousel, Direction, NavigationMenu, Pagination,
  Resizable, ScrollArea, Sidebar, Tabs, Toolbar.
- Floating and modal surfaces: AlertDialog, Command, ContextMenu, Dialog,
  Drawer, DropdownMenu, Menubar, Popover, Tooltip.
- Data and messaging: Attachment, Chart, DataTable, Message,
  MessageScroller, Toast.

The catalog contains only current families and has no compatibility aliases.

## Story Module Contract

```tsx
/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from '/src/ui/button'

export default {
	title: 'UI/Button',
	component: Button,
	args: { disabled: false },
	argTypes: {
		disabled: { control: 'boolean' },
	},
} satisfies Meta<typeof Button>

export const Default: Story<typeof Button> = {}
```

`Meta` and `Story` may define `component`, `args`, `argTypes`,
`parameters`, and `render`. A story may also define `name` and `play`.

The render resolution order is story `render`, meta `render`, then the meta
component with the merged args spread onto it.

`parameters.layout` accepts `padded`, `centered`, or `fullscreen`.
`parameters.empty` allows a deliberately empty visible root.

`parameters.docs.description` supplies the short manager description. It is
not a separate documentation runtime.

## Args And Controls

Args merge in this order:

1. Meta defaults.
2. Story defaults.
3. The JSON object in the URL `args` query.
4. Live manager overrides.

Changing a control does not remount the active story. The rendered root is
keyed by story id, so same-story arg updates reconcile the existing component
tree. Navigating to another story intentionally changes the key.

The manager supports these explicit controls:

- `boolean`
- `color`
- `multi-select`
- `number`
- `object`
- `radio`
- `range`
- `select`
- `text`

`multi-select` renders a multiple ToggleGroup and writes a string array.
`select` uses the themed Select family.

Controls are the declared `argTypes` followed by inferable merged args.
Booleans, numbers, strings, arrays, and plain objects receive suitable
defaults.

An argType with `options` and no control defaults to `select`.
`control: false` hides an inferred control.

Object controls keep a text draft. Invalid JSON shows a local error and does
not replace the last valid value.

`StoryContext.setArg(name, value)` lets a controlled story report discrete
state back to the manager. The controls, args preview, and canvas then share
one live value.

Reset deletes all live overrides, drafts, and object errors for the active
story. It restores meta, story, and URL args without navigating or reloading
the iframe.

## Manager And Canvas

`/story/<id>` renders the manager. It contains catalog navigation, the live
canvas, current args, controls, description, and theme controls.

The canvas is a same-origin iframe opened with `canvas=1&preview=1`. The
manager keeps the iframe alive across arg changes and story navigation.

Parent and iframe exchange three validated messages:

- `story-ready`: the iframe requests the current story state.
- `render-story`: the parent sends story id, live overrides, and theme.
- `set-arg`: an embedded controlled story reports a value to the parent.

Every message carries `source: 'ajo-stories'` and is accepted only from the
same origin.

The initial iframe URL seeds first paint. Subsequent story, arg, and theme
changes travel through `postMessage`, avoiding reloads and preserving the
active component tree.

The manager search matches title, name, and id. Its value is stored in the
`search` query parameter.

Story links use `history.pushState`; browser back and forward use
`popstate`. Navigation preserves the active search and theme.

Theme mode is `system`, `light`, or `dark`. The manager and iframe use the
shared `scheme` and `storage` cloves, while `render-story` keeps the
embedded preview synchronized.

## Canvas Query Parameters

- `canvas=1`: render only the story surface.
- `preview=1`: suppress `play` inside the manager iframe.
- `theme=system|light|dark`: seed the initial theme.
- `search=<text>`: preserve the manager filter.
- `args=<json>`: seed JSON-serializable arg overrides.
- `screenshot=1`: freeze animation, transitions, and smooth scrolling.

The Playwright runner uses `canvas=1` without `preview=1`, so the story's
`play` function runs in smoke tests.

## Play Functions

A `play` function receives the story identity, its canvas root, and
`setArg`. It may assert semantics, keyboard behavior, state, layout, or
computed styles.

Plays run once per story id in a page. They do not rerun for live arg changes;
otherwise a play that calls `setArg` could create a feedback loop.

The document stamps `data-ajo-ready="true"` only after rendering and the
eligible play complete. The runner waits for that marker.

Thrown play errors render inside `[data-stories-error]` and fail the runner.
Console errors and uncaught page errors fail too.

## Runner Contract

Before canvases, the runner discovers the full catalog and cycles the manager
theme. It then executes one manager smoke against the complete index.

The manager smoke opens Checkbox / With Label and verifies:

1. The iframe and story root become ready.
2. Changing the checked control updates args and the iframe.
3. Reset restores the default in both places.
4. Search writes the URL query.
5. Clicking a filtered Button story navigates and loads its iframe.

After the manager smoke, the runner opens every selected story in an isolated
page. It waits for readiness, collects browser errors, and requires a visible
story root unless `parameters.empty` is true.

A transient `ERR_NETWORK_CHANGED` attempt is retried once. Every other
failure reports the story id and canvas URL.

Screenshot mode also disables Playwright animations and captures the story
root only.

## Adding Or Changing Stories

Keep stories next to the catalog in `tests/stories/*.stories.tsx`. Import the
themed component by its `/src/ui/<family>` module.

Use args for JSON-serializable values. Keep composed JSX in `render`.

Use `setArg` when a controlled interaction must update the manager. Avoid
inventing harness-only component APIs.

Use `play` for behavior that protects a real contract. Prefer semantic
queries and stable `data-slot` markers over styling implementation details.

Verify a focused family first:

```sh
pnpm stories:test --match <family>
```

Then run TypeScript, unit tests, the complete stories suite, and the relevant
application or production checks.
