# Ajo UI Stories Research And Plan

Last updated: 2026-07-12

This file records the research and implementation plan for a small
Storybook-like component stories harness for `ajo-kit` UI components. It is planning
material, not implemented architecture. When the feature lands, move durable
runtime truth into `ai/architecture.md`, public commands into `readme.md` or
`AGENTS.md`, and keep this file focused on design rationale and next work.

## Goal

Build a tiny Ajo-native component story harness without depending on full
Storybook.

The target shape is:

- One story file under `tests/stories/` for every component in `src/ui/`.
- Server, CLI, and smoke-runner logic in `tests/stories-server.ts`.
- Browser shell, indexing, controls, canvas rendering, and shared story types in
  `tests/stories/app.tsx`, served by `tests/stories/index.html`.
- Use only current project technology unless a real gap appears: Ajo, Vite,
  UnoCSS, Playwright, Vitest where useful, `tsx`, and existing repo packages.
- Keep the result small, direct, reliable, and aligned with Ajo syntax and
  `ajo-kit` package boundaries.

## Non-Goals

- Do not install Storybook, Ladle, Histoire, VitePress, or a docs platform.
- Do not clone Storybook addons.
- Do not support MDX, doc blocks, auto-generated args docs, source extraction,
  story editing from the browser UI, global decorators, background/viewport
  toolbars, or CSF Next in the first version.
- Do not infer controls from TypeScript/docgen in the first version.
- Do not support app routes, loaders, actions, auth flows, database data, or
  server-only modules in UI stories.
- Do not make the stories harness a second metaframework. It should be a test harness for
  UI components.

## Research Summary

### Storybook

Useful ideas to copy:

- Component Story Format is just ES modules: a default metadata export and
  named story exports.
- Args are JSON-serializable values that describe how one story renders.
- Controls are an args editor; they do not require changes to the component.
- A story captures one interesting rendered state of a component.
- Interaction tests run after a story renders through a `play` function.
- Story test runners turn every story into a browser test, using the story
  server as the rendering environment.
- Story indexes are first-class. Storybook exposes index metadata so tools can
  enumerate stories without importing every module manually.

Useful sources:

- https://storybook.js.org/docs/api/csf
- https://storybook.js.org/docs/writing-stories/args
- https://storybook.js.org/docs/essentials/controls
- https://storybook.js.org/docs/get-started/whats-a-story
- https://storybook.js.org/docs/writing-tests/interaction-testing
- https://storybook.js.org/docs/writing-tests/integrations/test-runner
- https://storybook.js.org/docs/writing-tests

Conclusion:

Copy the story contract and test-runner idea, not the Storybook runtime,
configuration system, addon system, or documentation platform.

### Storybook Test And Vitest Browser Mode

Storybook's newer testing direction uses Vitest Browser Mode for Vite-powered
projects. Vitest Browser Mode runs tests natively in a browser through a
provider such as Playwright, which gives real DOM, CSS, browser APIs, events,
and focus behavior.

Useful sources:

- https://vitest.dev/guide/browser/
- https://vitest.dev/guide/browser/component-testing
- https://vitest.dev/config/browser/playwright

Conclusion:

Vitest Browser Mode is promising for a later `stories` test integration, but it is
not the simplest first step. The first implementation should use Playwright
against a real stories URL because this repo already has Playwright e2e patterns
and because an interactive story UI is needed regardless of test runner.

### Playwright

Playwright has two relevant modes:

- Normal page tests can launch a local web server through `webServer`, navigate
  to story URLs, assert the DOM, collect console/page errors, and take
  screenshots.
- Playwright Component Testing runs components in a real browser, but it is
  still documented as experimental and expects framework-specific mounting
  integration. Ajo would need custom adapter work.

Useful sources:

- https://playwright.dev/docs/test-webserver
- https://playwright.dev/docs/test-components
- https://playwright.dev/docs/test-snapshots

Conclusion:

Use normal Playwright page tests or a Playwright script inside `tests/stories-server.ts`.
Avoid Playwright Component Testing for now.

### Vite

Vite gives the exact primitives needed:

- `import.meta.glob('/tests/stories/*.stories.tsx')` for story discovery.
- Native TypeScript/TSX transforms through the existing Vite config.
- Middleware or regular dev server mode for a local stories harness.
- HMR and fast module reloads without a custom bundler.

Useful sources:

- https://vite.dev/guide/features#glob-import
- https://vite.dev/guide/ssr
- https://vite.dev/guide/api-javascript

Conclusion:

Use the Vite JS API from `tests/stories-server.ts`. Let Vite compile
`tests/stories/app.tsx` and story modules. Do not build a parallel transpiler.

### Ladle

Ladle is a fast Vite/SWC Storybook alternative built around React stories.

Useful sources:

- https://github.com/tajo/ladle
- https://ladle.dev/blog/ladle-v3/

Conclusion:

The design goals are relevant, especially speed and small setup, but the tool
itself is React-centered. Adopting it would require fighting Ajo.

### Histoire

Histoire is Vite-native and organized around stories, variants, controls,
Markdown docs, and source views.

Useful source:

- https://histoire.dev/guide/

Conclusion:

The variant model is useful, but the value of Histoire comes from framework
integrations. For Ajo, a custom harness is smaller.

### VitePress

VitePress is useful for docs, but Markdown files compile as Vue components.

Conclusion:

It is a documentation layer, not a component harness for Ajo TSX.

## Local Findings

Current dependencies in `package.json` already cover the first version:

- `ajo`
- `vite`
- `unocss`
- `@playwright/test`
- `playwright`
- `vitest`
- `@vitest/browser-playwright`
- `tsx`
- `sade`
- `clsx`

`packages/ajo-kit` also depends on `polka`, `sirv`, `regexparam`, `navaid`,
`devalue`, `kysely`, and `valibot`, but none simplify the story harness right
now. Vite already provides the dev server/middleware layer, and Playwright
already provides the browser automation layer. `sade` is the useful reuse point
because it removes custom CLI parsing.

Current Vite config in `vite.config.ts` already applies:

- `kit({ css: ['virtual:uno.css'] })`
- `unocss()`
- Ajo JSX settings from `ajo-kit/vite`

Important local constraints:

- Ajo TSX, not React TSX.
- Use `class`, not `className`.
- Use `set:onclick`, `set:oninput`, etc. for DOM properties/events.
- Use string `style`.
- Use stable `key` for lists.
- Use generator components for stateful stories if story-local state is needed.
- Import `virtual:uno.css` directly in `tests/stories/app.tsx`.
  The existing `kit({ css: ['virtual:uno.css'] })` injection targets
  `ajo-kit/client.tsx`, not the standalone stories harness browser entry.
- Keep stories limited to `src/ui` and pure view helpers. Do not import
  `handler.ts`, `wares.ts`, `/src/data/`, or route actions into the client
  story graph.
- Existing e2e readiness waits for `html[data-ajo-ready="true"]`; the stories harness
  should set the same marker after rendering.

Relevant local files:

- `vite.config.ts`
- `vitest.config.ts`
- `playwright.config.ts`
- `uno.config.ts`
- `node_modules/ajo/LLMs.md`
- `packages/ajo-kit/src/client.tsx`
- `packages/ajo-kit/src/vite.ts`
- `src/ui/index.ts`
- `src/ui/*.tsx`

## Target Architecture

The stories harness owns three small layers:

1. `tests/stories-server.ts`:
   - parses commands with `sade`
   - creates the Vite server
   - serves `tests/stories/index.html` for `/` and `/story/*`
   - optionally runs Playwright smoke checks
2. `tests/stories/index.html`:
   - provides the root element
   - loads `/tests/stories/app.tsx` as the browser entry
3. `tests/stories/app.tsx`:
   - imports `virtual:uno.css`
   - imports Ajo `render`
   - builds the story index
   - renders manager UI, docs view, and canvas view
   - sets `html[data-ajo-ready="true"]`
   - exports shared `Meta` and `Story` types for story modules

The stories harness should have two URL surfaces:

- Manager UI: `/`
- Stable canvas route: `/story/<story-id>`

Optional query params:

- `?canvas=1`: render only the story surface, no sidebar or controls.
- `?theme=dark`: force dark class for screenshots.
- `?args=<encoded-json>`: overrides JSON-serializable args for manual control.
- `?screenshot=1`: freeze CSS animation, transitions, and smooth scrolling for
  deterministic captures; the visual runner adds it automatically.
- `?preview=1`: internal manager preview mode; renders the canvas without
  replaying interaction-heavy `play` functions in the embedded iframe.

## Story Module Format

Use a small CSF-like format.

```tsx
import Button from '/src/ui/button'
import type { Meta, Story } from './app'

export default {
  title: 'UI/Button',
  component: Button,
  args: {
    height: 'md',
    tone: 'primary',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['primary', 'neutral', 'danger', 'warning'],
    },
    height: {
      control: 'radio',
      options: ['md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
  parameters: {
    docs: {
      description: 'Shared button surface for actions and links.',
    },
  },
} satisfies Meta<typeof Button>

export const Primary: Story<typeof Button> = {
  args: {
    children: 'Save',
  },
}

export const WithIcon: Story<typeof Button> = {
  args: {
    icon: 'i-lucide-plus',
    children: 'Create',
  },
}

export const IconOnly: Story<typeof Button> = {
  args: {
    icon: 'i-lucide-trash-2',
    title: 'Delete',
    tone: 'danger',
  },
}
```

### Proposed Types

Keep these types in `tests/stories/app.tsx` and export them for stories.

```ts
import type { Children, Component } from 'ajo'

export type Control =
  | 'boolean'
  | 'color'
  | 'multi-select'
  | 'number'
  | 'object'
  | 'radio'
  | 'range'
  | 'select'
  | 'text'

export type ArgType = {
  control?: Control
  description?: string
  label?: string
  max?: number
  min?: number
  options?: readonly unknown[]
  step?: number
}

export type Meta<C extends Component = Component> = {
  title: string
  component?: C
  args?: Record<string, unknown>
  argTypes?: Record<string, ArgType>
  parameters?: {
    docs?: {
      description?: string
    }
    layout?: 'centered' | 'fullscreen' | 'padded'
  }
  render?: (args: Record<string, unknown>, context: StoryContext) => Children
}

export type Story<C extends Component = Component> = {
  name?: string
  args?: Record<string, unknown>
  argTypes?: Record<string, ArgType>
  parameters?: Meta<C>['parameters']
  render?: (args: Record<string, unknown>, context: StoryContext) => Children
  play?: (context: PlayContext) => void | Promise<void>
}

export type StoryContext = {
  id: string
  title: string
  name: string
}

export type PlayContext = StoryContext & {
  canvas: HTMLElement
}
```

The default renderer is:

```tsx
const renderStory = (meta, story, args, context) => {
  if (story.render) return story.render(args, context)
  if (meta.render) return meta.render(args, context)
  if (meta.component) {
    const Component = meta.component
    return <Component {...args} />
  }
  throw new Error(`Story ${context.id} has no render function or component`)
}
```

## Story Index

The browser app should build an index from the globbed modules:

```ts
const modules = import.meta.glob('/tests/stories/*.stories.tsx')
```

Each module produces entries:

- `id`: stable slug from `meta.title` and named export
- `title`: e.g. `UI/Button`
- `name`: export name or `story.name`
- `file`: source file path
- `exportName`: named export
- `argTypes`: merged meta/story argTypes
- `parameters`: merged meta/story parameters

Slug rules:

- Lowercase.
- Replace non-alphanumeric runs with `-`.
- Trim leading/trailing dashes.
- Story id format: `<title-slug>--<export-slug>`.

Example:

- title: `UI/Button`
- export: `Primary`
- id: `ui-button--primary`

The stories harness does not need a physical `/index.json` endpoint in the first version
if Playwright can get the index from the browser. If it is cheap in the Vite
middleware, expose `/index.json` because it makes external tooling simpler.

## Browser UI

Manager UI:

- Left navigation grouped by title.
- Search input for title/story name.
- Theme toggle cycling `system`, `light`, and `dark` with the same `theme.v1`
  localStorage key as the app shell.
- Canvas area isolated in a preview iframe.
- Controls panel for current story args.
- Docs tab or docs route for the selected component.

The manager keeps one iframe per active story id and sends live args and theme
updates through `postMessage`. An arg edit rerenders the existing story
instance without navigating or replacing the iframe; changing story id creates
the new preview. The preview reports readiness back before the manager sends
its current render state.

Canvas-only UI:

- No sidebar.
- No controls.
- Stable padding and background.
- Story root with a deterministic selector, e.g. `[data-story-root]`.
- Ready marker after render and after optional `play`.

Visual style should match the app but stay utilitarian:

- Use Ajo TSX.
- Use UnoCSS classes.
- Keep panels compact.
- Avoid nested cards.
- Avoid decorative gradients/orbs.
- Use existing `src/ui` components where that does not create circular or
  confusing examples.

## Controls

Control kinds:

| Control | UI | Value |
|---|---|---|
| `boolean` | checkbox/toggle | boolean |
| `text` | input | string |
| `number` | number input | number |
| `range` | range input + number | number |
| `select` | select | one option |
| `radio` | segmented radio buttons | one option |
| `multi-select` | segmented toggle buttons | many options |
| `color` | color input | string |
| `object` | textarea JSON | parsed JSON |

The controls panel renders the union of declared `argTypes` and merged args:
declared argTypes first (in declaration order), then every remaining arg whose
control is inferable from its current value (boolean/number/string → matching
control, plain object or array → `object`; `children` and non-plain values are
skipped). An argType without `control` but with `options` defaults to `select`.
`control: false` hides an otherwise inferable control a story does not consume
— every arg a story render hardcodes or ignores must be hidden this way so the
panel never shows dead controls.

Rules:

- Merge args as `{ ...meta.args, ...story.args, ...urlArgs, ...liveArgs }`.
- Keep args JSON-serializable; JSX never goes in args, composition stays in
  render functions driven by string/boolean args.
- Invalid object JSON shows a local error and keeps the previous value.
- Changing args rerenders the same keyed story instance in the existing
  preview iframe; a Reset button clears live overrides for the active story.
- Story renders receive `(args, context)` where `context.setArg(name, value)`
  writes one live arg. Controlled stories two-way bind DISCRETE state (checked,
  open, selected values) through their change callbacks so interacting with the
  component updates the controls panel.
- `play` functions run once per story id and do not re-run on arg changes;
  replaying interactions against setArg-bound state would loop.
- Stateful Ajo stories may keep state during manual interaction; screenshot
  mode always mounts from clean args.

## Play Functions

`play` is optional in v1.

When supported:

- Render story.
- Wait one microtask or animation frame.
- Call `story.play({ id, title, name, canvas })`.
- Mark ready only after `play` completes.
- Surface thrown errors in the stories UI and fail Playwright smoke.

Do not implement Testing Library wrappers in v1. Playwright tests can use
Playwright locators against the canvas route. The browser-side `play` function
can use plain DOM APIs.

## Playwright Runner

`tests/stories-server.ts test` should:

1. Start the stories server on a deterministic port, with strict failure on port
   conflict unless a `--port` override is given.
2. Load the manager page and wait for `html[data-ajo-ready="true"]`.
3. Smoke the manager protocol by editing a control, observing the iframe and
   Args panel, resetting it, persisting a search in the URL, and navigating to
   a filtered story.
4. Collect story ids from the stories runtime.
5. For every story:
   - navigate to `/story/<id>?canvas=1`
   - fail on page errors
   - fail on console errors
   - wait for `html[data-ajo-ready="true"]`
   - assert `[data-story-root]` exists
   - assert the story root has non-empty bounding box unless the story is marked
     `parameters.empty = true`
6. Optionally take screenshots when `--screenshots` is passed.
7. Close browser and server.

Screenshot mode should initially be opt-in because visual baselines are
environment-sensitive. Smoke mode should be default and cheap.

## Commands

Package scripts:

```json
{
  "scripts": {
    "stories": "tsx tests/stories-server.ts dev",
    "stories:test": "tsx tests/stories-server.ts test",
    "stories:test:visual": "tsx tests/stories-server.ts test --screenshots"
  }
}
```

These scripts are part of the implemented harness.

Use `pnpm stories:test --match <text>` to run only stories whose title, name,
or id contains the text. The manager smoke still runs once against the full
discovered index, so a focused canvas run also verifies the shared shell.

## Original Story Slice (historical)

The following list records the harness's original bootstrap only; it is not
the current catalog. Discovery of `tests/stories/*.stories.tsx` is the source
of truth. Badge, Feedback, Link, Pager, Panel, and Stat were later removed with
their superseded wrappers and must not be treated as available surfaces.

- `tests/stories/alert.stories.tsx`
- `tests/stories/badge.stories.tsx`
- `tests/stories/button.stories.tsx`
- `tests/stories/checkbox.stories.tsx`
- `tests/stories/feedback.stories.tsx`
- `tests/stories/input.stories.tsx`
- `tests/stories/link.stories.tsx`
- `tests/stories/pager.stories.tsx`
- `tests/stories/panel.stories.tsx`
- `tests/stories/sidebar.stories.tsx`
- `tests/stories/spinner.stories.tsx`
- `tests/stories/stat.stories.tsx`
- `tests/stories/table.stories.tsx`

Recommended initial states:

### Alert

- success
- danger
- with icon
- with actions
- long responsive content

### Badge

- neutral
- primary
- success
- warning
- danger
- count badge
- large count

### Button

- primary
- neutral
- danger
- warning
- large
- wide
- with icon
- icon only
- link mode
- disabled button
- disabled link

### Checkbox

- unchecked
- checked
- disabled unchecked
- disabled checked
- with note
- interactive uncontrolled

### Feedback

- danger
- success
- long text

### Input

- labeled
- placeholder only
- email
- password
- danger
- muted
- small widths
- disabled
- hint text

### Link

- normal
- medium
- long inline text

### Pager

- first page with next only
- middle page
- last page with prev only
- hidden when no back/more

### Panel

- glass
- solid
- padding variants
- radius variants
- anchor variant
- section variant
- clipped content

### Sidebar

- default width
- compact width
- exact active
- nested active
- with badge
- danger item
- horizontal overflow case

### Spinner

- overlay loading
- no overlay
- custom label
- non-loading hidden state

### Stat

- accent
- danger
- link card
- long label

### Table

- generated rows/columns
- manual children
- right-aligned numeric cell
- code tone
- empty rows if supported by composed story

## Implementation Slices

### Slice 0: Planning Doc

Status: Done when this file exists.

Scope:

- Record research, local constraints, architecture, story format, runner plan,
  story coverage, risks, and gates.

Gate:

```bash
git diff --check
```

### Slice 1: Minimal Stories Server And Browser Shell

Completion criterion:

- `pnpm exec tsx tests/stories-server.ts dev` serves
  `tests/stories/index.html`, which loads `tests/stories/app.tsx` and renders
  with Ajo and UnoCSS.
- The page sets `html[data-ajo-ready="true"]`.
- No stories required yet beyond one inline placeholder.

Scope:

- Add `tests/stories-server.ts`.
- Add `tests/stories/app.tsx`.
- Add `tests/stories/index.html`.
- Use Vite JS API.
- Import `virtual:uno.css`.
- Render a minimal manager shell with Ajo.

Out of scope:

- Story discovery.
- Controls.
- Playwright runner.
- Package scripts.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts dev
```

Manual check:

- Open the printed local URL.

### Slice 2: Story Discovery And Canvas Route

Completion criterion:

- Story modules in `tests/stories/*.stories.tsx` are discovered through Vite.
- `/` lists stories.
- `/story/<id>` renders one selected story.
- Canvas-only query renders without manager chrome.

Scope:

- Implement `Meta`, `Story`, slugging, indexing, and default renderer.
- Add first representative stories for `Button`, `Input`, and `Panel`.
- Handle missing render/component with clear browser error UI.

Out of scope:

- Controls.
- All component stories.
- Play functions.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts dev
```

Manual check:

- Navigate to manager and three canvas URLs.

### Slice 3: Controls

Completion criterion:

- Explicit `argTypes` controls can edit args for representative stories.
- URL args or in-memory args re-render the selected story.
- Invalid object JSON is handled without crashing the stories harness.

Scope:

- Implement boolean, text, number, range, select, radio, color, and object.
- Merge meta/story/live args.
- Remount story root on arg changes.

Out of scope:

- TypeScript/docgen inference.
- Source-code extraction.

Gate:

```bash
pnpm exec tsc --noEmit
```

Manual check:

- Exercise controls for Button/Input stories.

### Slice 4: All UI Component Stories

Completion criterion:

- Every exported `src/ui` component has a story file.
- Each story file covers the main visual states listed above.
- The manager can render all stories without console/page errors.

Scope:

- Add story files for all current `src/ui` components.
- Use only pure UI data fixtures.
- Use safelisted Lucide classes from `uno.config.ts`.

Out of scope:

- App route stories.
- Data/auth stories.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts dev
```

Manual check:

- Browse every group in the manager.

### Slice 5: Playwright Smoke Runner

Completion criterion:

- `pnpm exec tsx tests/stories-server.ts test` starts the stories harness, visits every canvas
  story, and fails on render, page, console, or blank-root errors.

Scope:

- Add test command mode to `tests/stories-server.ts`.
- Use Playwright programmatically or generate a focused Playwright config.
- Keep output concise: pass count, failed story id, error text, URL.

Out of scope:

- Visual baselines by default.
- Vitest Browser Mode.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts test
```

### Slice 6: Optional Visual Snapshots

Completion criterion:

- `pnpm exec tsx tests/stories-server.ts test --screenshots` captures stable screenshots
  for selected stories or all stories.

Scope:

- Add opt-in screenshot comparisons.
- Use canvas-only route.
- Freeze animations where possible with CSS in screenshot mode.
- Document baseline update flow.

Out of scope:

- Chromatic or external services.
- Cross-browser visual matrix by default.

Gate:

```bash
pnpm exec tsx tests/stories-server.ts test --screenshots
```

### Slice 7: Package Scripts And Docs

Completion criterion:

- `package.json` exposes final scripts.
- `AGENTS.md` and docs map mention `ai/stories.md` or the final stories command
  only if the feature is kept.
- `readme.md` mentions the stories harness only if it is useful to app builders, not just
  internal development.

Scope:

- Add scripts after implementation is stable.
- Update relevant docs.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts test
git diff --check
```

## Verification Strategy

Docs-only planning changes:

```bash
git diff --check
```

Stories runtime changes:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts test
```

If the implementation touches shared Vite plugin behavior, Ajo kit runtime, app
routes, package exports, or e2e setup:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm test:prod
```

The intended first implementation should avoid shared runtime changes.

## Risks And Guardrails

### Ajo Syntax Drift

Risk:

- Accidentally writing React syntax in the harness or stories.

Guardrail:

- Read `node_modules/ajo/LLMs.md` before TSX edits.
- Use `class`, `set:*`, string `style`, and generator components where needed.

### UnoCSS Missing From Stories Entry

Risk:

- Components render without styling because the app CSS injection only targets
  `ajo-kit/client.tsx`.

Guardrail:

- Import `virtual:uno.css` directly in `tests/stories/app.tsx`.

### Server-Only Imports In Client Story Graph

Risk:

- Stories import route/data modules that should never enter browser code.

Guardrail:

- Keep stories under `src/ui` only.
- Prefer imports from `/src/ui/*`.
- Do not import `/src/data`, route handlers, wares, or `@kit/server`.

### Stateful Story Non-Determinism

Risk:

- Ajo generator components retain local state across arg edits, making
  screenshots flaky.

Guardrail:

- Remount the story root when selected story or args change.
- Use canvas-only routes for smoke/screenshot tests.

### Visual Baseline Noise

Risk:

- Screenshots vary across OS, browser channel, fonts, animation timing, or dark
  mode.

Guardrail:

- Keep screenshots opt-in.
- Freeze animations in screenshot mode.
- Use one browser first.
- Prefer smoke checks as the default CI gate.

### Harness Growth

Risk:

- Rebuilding Storybook by accident.

Guardrail:

- Add features only when they remove real friction for UI development or tests.
- Keep harness logic limited to `tests/stories-server.ts`,
  `tests/stories/app.tsx`, and `tests/stories/index.html` until repeated
  complexity proves another split is needed.
- Avoid plugin/addon APIs in v1.

## Open Decisions

1. Should `/index.json` be implemented in v1 or should the Playwright runner get
   the story index from the browser runtime?
   Recommendation: implement `/index.json` only if cheap in the Vite middleware.

2. Should `play` run in the browser app, Playwright runner, or both?
   Recommendation: browser app first, because it makes manual debugging simple.
   Playwright can still assert after the browser-side `play` completes.

3. Should story files import `type { Meta, Story } from './app'`?
   Decision: yes. The types live beside the browser story app that consumes the
   modules, avoiding a type import from the Node CLI.

4. Should package scripts be added immediately?
   Decision: yes. The harness is implemented and verified, so `pnpm stories`,
   `pnpm stories:test`, and `pnpm stories:test:visual` are available.

## Handoff Prompt

Use this to resume implementation:

```text
We are in D:\ajo-kit. Read AGENTS.md, ai/plan.md, ai/architecture.md,
ai/stories.md, and node_modules/ajo/LLMs.md before TSX edits. Preserve existing
user work. Implement the Ajo UI story harness from ai/stories.md in narrow
slices. The stories server/runner is in tests/stories-server.ts, the browser app
is in tests/stories/app.tsx, and the HTML shell is tests/stories/index.html. Do
not install Storybook/Ladle/Histoire. Keep stories under tests/stories and avoid
server-only imports. Verify with pnpm exec tsc --noEmit and the focused stories
command for the slice.
```
