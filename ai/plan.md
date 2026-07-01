# Ajo Kit Active Plan

Last updated: 2026-07-01

This file tracks the feature currently being developed. Keep it focused on the
next active slice only.

Completed runtime truth belongs in `ai/architecture.md`, app-building guidance
belongs in `ai/LLMs.md`, public API truth belongs in `readme.md` and
`packages/*/README.md`, and committed implementation history belongs in Git.
Remove completed feature planning from this file once the feature is committed
and canonical docs/tests describe the final system.

## Fast Orientation

- Active feature: Ajo UI story harness.
- User-facing goal: test and inspect `src/ui` components in isolation through a
  tiny Ajo-native Storybook-like stories harness.
- Current phase: implementation complete and verified.
- Current slice: none; all planned slices are complete.
- Current sub-slice: none.
- Current implementation status: stories runtime, story files, scripts, and docs
  are implemented and verified in the working tree.
- Blockers: none.

Always verify live state before planning or editing:

```bash
git status --short
git log --oneline -5
```

## Agent Startup Checklist

When starting a new feature:

1. Read `AGENTS.md`.
2. Read this file.
3. Read `ai/architecture.md` for implemented architecture contracts.
4. Read `ai/LLMs.md` for app-building guidance.
5. Read `readme.md` and package READMEs when public API behavior matters.
6. Before TSX edits, read `node_modules/ajo/LLMs.md`.
7. Run `git status --short` and protect unrelated user work.
8. Inspect current implementation, tests, docs, migrations, and package
   boundaries before planning non-trivial edits.
9. Fill the planning template below with the smallest honest vertical slices.
10. Update this file before ending a session if scope, status, decisions, files,
    or verification changed.

## Source Of Truth Map

- `AGENTS.md`: repo operating principles, compatibility stance, commands, and
  cross-cutting rules for agents.
- `ai/plan.md`: active feature plan, current progress, decisions, handoff, and
  verification state.
- `ai/architecture.md`: current implemented architecture and runtime contracts.
- `ai/LLMs.md`: concise app-building guide for AI agents using Ajo and
  `ajo-kit`.
- `ai/chat.md`: chat demo behavior and QA notes only.
- `ai/comparison.md`: framework/auth/routing comparison context.
- `ai/stories.md`: supporting research, detailed design, slice rationale, and
  future handoff details for the Ajo UI story harness. Use it as supporting
  documentation; keep this file as the active source of truth for current
  status, scope, gates, and next work.
- `readme.md`: human public API guide.
- `packages/*/README.md`: package-local public API docs.

## Maintenance Rules

- Keep current phase and current slice near the top.
- Keep this file about active work, not completed history.
- Keep decisions in the Decision Log, not scattered in prose only.
- Do not duplicate canonical implementation truth after the feature lands.
- When code and this file disagree, inspect code/tests first, then update this
  file or the canonical docs.
- Do not record secrets, real credentials, private emails, tokens, or private
  deployment values.
- Prefer vertical slices that are demoable or verifiable on their own.
- Each slice needs a completion criterion, explicit scope, out-of-scope notes,
  and a verification gate.

## Compatibility Stance

`ajo-kit` is not in production yet. Backward compatibility is not a design
constraint for refactors.

Prefer the smallest cohesive final surface over migration shims, compatibility
aliases, fallback behavior, or public APIs that only exist because of the
current implementation. The result should look designed as one piece, not like
an accumulated development trail.

## Active Feature Plan

### Feature Brief

- Active feature: Ajo UI story harness.
- User-facing goal: provide a lightweight component stories harness for `src/ui`
  components without adopting Storybook or another large story platform.
- Primary users: `ajo-kit` maintainers and agents implementing UI components.
- Support doc: `ai/stories.md` contains the full research notes, detailed
  architecture, story coverage matrix, risks, and handoff prompt. Treat it as
  supporting documentation, not the current status ledger.
- Non-goals:
  - Do not install Storybook, Ladle, Histoire, VitePress, or a docs platform.
  - Do not clone Storybook addons, MDX, advanced autodocs, source extraction,
    story editing from the browser, global decorators, or CSF Next.
  - Do not infer controls from TypeScript/docgen in v1.
  - Do not include app routes, loaders, actions, auth flows, database data, or
    server-only modules in UI stories.
- Existing behavior to preserve:
  - Current app Vite, Playwright, Vitest, UnoCSS, and Ajo behavior.
  - Current `src/ui` component API and styling unless a component bug is found
    and explicitly scoped.
  - Existing user work in `src/layout.tsx` and any unrelated untracked files.
- Core boundary rule: stories stay client-safe and UI-only. They may import
  `src/ui` and pure fixtures, but must not import route `handler.ts`, `wares.ts`,
  `/src/data`, `@kit/server`, or action/auth/database code.

### Domain Language

- Story: one named rendered state of a UI component.
- Story module: a `tests/stories/*.stories.tsx` file with default metadata and
  named story exports.
- Stories harness: the local browser UI served by `tests/stories-server.ts` and rendered
  by `tests/stories/app.tsx`.
- Manager: the stories UI with navigation, canvas, and controls.
- Canvas route: a stable route that renders one story without manager chrome.
- Args: JSON-serializable story inputs.
- Controls: explicit UI for editing args from story `argTypes`.
- Smoke runner: Playwright automation that visits every canvas story and fails
  on render, console, page, or blank-root errors.

Avoid:

- "Storybook" as the implementation name. Use it only when comparing research.
- "Docs platform" for the first version; the goal is a component test harness.

### Current Local Surface

Important current files:

- `ai/stories.md`: supporting research and detailed implementation design.
- `package.json`: current scripts and dependencies.
- `vite.config.ts`: existing Vite/Ajo/UnoCSS configuration.
- `vitest.config.ts`: current unit-test aliases and Node test environment.
- `playwright.config.ts`: existing e2e server/test pattern.
- `uno.config.ts`: theme, shortcuts, icon safelist, and preflights.
- `node_modules/ajo/LLMs.md`: Ajo TSX syntax rules; read before TSX edits.
- `packages/ajo-kit/src/vite.ts`: kit Vite plugin, aliases, client guard, HMR.
- `packages/ajo-kit/src/client.tsx`: Ajo render pattern and readiness marker.
- `src/ui/index.ts`: current UI export surface.
- `src/ui/*.tsx`: components that need stories.

Current behavior:

- The story harness is implemented and exercises `src/ui` in isolation.
- The repo has the required dependencies for the implementation:
  Ajo, Vite, UnoCSS, Playwright, Vitest, `@vitest/browser-playwright`, `tsx`,
  `sade`, and `clsx`.
- `kit({ css: ['virtual:uno.css'] })` injects UnoCSS into `ajo-kit/client.tsx`;
  a standalone stories browser entry must import `virtual:uno.css` directly.

### Decision Log

1. Decision: Build a custom Ajo-native stories harness instead of installing Storybook,
   Ladle, Histoire, or VitePress.
   Reason: Ajo is not React/Vue/Svelte, and the repo already has the primitives
   needed for a smaller harness.

2. Decision: Keep server/test-runner logic in `tests/stories-server.ts`, and
   keep browser UI/types in `tests/stories/app.tsx` plus
   `tests/stories/index.html`.
   Reason: the initial one-file implementation proved the shape, but the
   embedded browser app was too hard to read and review.

3. Decision: Use a CSF-like story module format.
   Reason: Default metadata plus named story exports is portable, readable, and
   easy to index with Vite.

4. Decision: Use Vite `import.meta.glob('/tests/stories/*.stories.tsx')` for
   story discovery.
   Reason: Vite already compiles TSX and supports project-root glob imports.

5. Decision: Use Playwright against canvas URLs for the first automated runner.
   Reason: The repo already uses Playwright e2e and normal page tests avoid a
   custom Playwright Component Testing adapter for Ajo.

6. Decision: Defer Vitest Browser Mode.
   Reason: It is useful later, but it does not replace the need for the
   interactive stories harness and adds test-runner surface before v1 is proven.

7. Decision: Keep visual screenshots opt-in.
   Reason: Visual baselines are environment-sensitive; smoke checks should be
   the default reliable gate.

8. Decision: Use `sade` for the stories harness CLI, and do not pull in other
   `ajo-kit` package dependencies for the harness yet.
   Reason: `sade` removes bespoke CLI parsing while keeping help/default command
   behavior small. `polka`, `sirv`, `regexparam`, `navaid`, `devalue`,
   `kysely`, and `valibot` do not reduce this harness because Vite already owns
   serving and Playwright already owns browser automation.

### Status Ledger

Status meanings:

- `Done`: implemented and verified for that slice.
- `In Progress`: active work exists in the working tree.
- `Ready`: next approved work; no known blocker.
- `Pending`: planned but blocked by earlier slices.
- `Blocked`: cannot proceed without a user decision or external change.

| Slice | Status | Purpose | Gate |
|---|---|---|---|
| 0. Research and plan | Done | Define the smallest cohesive feature shape and support doc | `git diff --check` |
| 1. Minimal stories server and browser shell | Done | Serve a Vite/Ajo/UnoCSS stories page from split server/app files | `pnpm exec tsc --noEmit`; focused manual dev-server check |
| 2. Story discovery and canvas route | Done | Discover `tests/stories/*.stories.tsx` and render selected stories | `pnpm exec tsc --noEmit`; manual manager/canvas check |
| 3. Controls | Done | Edit explicit JSON-serializable args from `argTypes` | `pnpm exec tsc --noEmit`; manual control check |
| 4. All UI component stories | Done | Add one story file per current `src/ui` component | `pnpm exec tsc --noEmit`; browse all stories |
| 5. Playwright smoke runner | Done | Visit every canvas story and fail on render/browser errors | `pnpm exec tsc --noEmit`; `pnpm exec tsx tests/stories-server.ts test` |
| 6. Optional visual snapshots | Done | Add opt-in screenshot mode | `pnpm exec tsx tests/stories-server.ts test --screenshots` |
| 7. Package scripts and docs | Done | Expose final scripts and update docs after the feature stabilizes | `pnpm exec tsc --noEmit`; stories smoke; `git diff --check` |

Progress: all planned slices are implemented and verified. `ai/stories.md`
remains support documentation for research, design rationale, and future
extensions.

### Slice 1: Minimal Stories Server And Browser Shell

Status: Done.

Completion criterion:

- `pnpm exec tsx tests/stories-server.ts dev` starts a local stories server.
- The served page renders with Ajo and UnoCSS.
- The browser entry imports `virtual:uno.css` directly.
- The page sets `html[data-ajo-ready="true"]`.

Scope:

- Add `tests/stories-server.ts`, `tests/stories/app.tsx`, and
  `tests/stories/index.html`.
- Use the Vite JS API from Node.
- Serve the browser entry as a normal Vite TSX module.
- Render a minimal utilitarian stories shell with Ajo.
- Print the local URL.

Out of scope:

- Story discovery.
- Controls.
- Playwright runner.
- Package scripts.
- Changes to shared app runtime or `src/ui` components.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts dev
```

Manual check:

- Open the printed local URL and verify the page renders.

### Slice 2: Story Discovery And Canvas Route

Status: Done.

Completion criterion:

- Story modules under `tests/stories/*.stories.tsx` are discovered.
- `/` lists discovered stories.
- `/story/<id>` renders one selected story.
- A canvas-only query renders one story without manager chrome.

Scope:

- Implement `Meta`, `Story`, slugging, indexing, and default story renderer.
- Add representative initial stories for `Button`, `Input`, and `Panel`.
- Show clear browser errors for missing render/component.

Out of scope:

- Controls.
- Full UI story coverage.
- `play` functions.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts dev
```

Manual check:

- Navigate through manager and representative canvas URLs.

### Slice 3: Controls

Status: Done.

Completion criterion:

- Explicit `argTypes` controls edit args for representative stories.
- Args merge as meta args, story args, URL/live overrides.
- Invalid object JSON does not crash the stories harness.

Scope:

- Implement boolean, text, number, range, select, radio, color, and object
  controls.
- Remount story root on story or args changes for deterministic state.

Out of scope:

- TypeScript/docgen inference.
- Source-code extraction.

Gate:

```bash
pnpm exec tsc --noEmit
```

Manual check:

- Exercise controls for representative stories.

### Slice 4: All UI Component Stories

Status: Done.

Completion criterion:

- Every current `src/ui` component has a matching story file.
- Story files cover the main visual states listed in `ai/stories.md`.
- All stories render in the manager without console/page errors.

Scope:

- Add story files under `tests/stories/` for `Alert`, `Badge`, `Button`,
  `Checkbox`, `Feedback`, `Input`, `Link`, `Pager`, `Panel`, `Sidebar`,
  `Spinner`, `Stat`, and `Table`.
- Use pure fixture data.
- Use safelisted Lucide icon classes from `uno.config.ts`.

Out of scope:

- App route stories.
- Auth/data/database stories.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts dev
```

Manual check:

- Browse every story group.

### Slice 5: Playwright Smoke Runner

Status: Done.

Completion criterion:

- `pnpm exec tsx tests/stories-server.ts test` starts the stories harness, visits every canvas
  story, and fails on render, page, console, or blank-root errors.

Scope:

- Add `test` command mode to `tests/stories-server.ts`.
- Use Playwright programmatically or through a focused generated config.
- Keep output concise: pass count, failed story id, failed URL, and error text.

Out of scope:

- Visual baselines by default.
- Vitest Browser Mode.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts test
```

### Slice 6: Optional Visual Snapshots

Status: Done.

Completion criterion:

- `pnpm exec tsx tests/stories-server.ts test --screenshots` captures or compares stable
  canvas screenshots.

Scope:

- Add opt-in screenshot mode.
- Use canvas-only routes.
- Freeze animations where practical.
- Document baseline update flow.

Out of scope:

- Chromatic or external visual services.
- Cross-browser visual matrix by default.

Gate:

```bash
pnpm exec tsx tests/stories-server.ts test --screenshots
```

### Slice 7: Package Scripts And Docs

Status: Done.

Completion criterion:

- `package.json` exposes final stories commands.
- `AGENTS.md`, `readme.md`, or package docs mention the stories harness only where useful.
- `ai/stories.md` remains support documentation or is retired if final docs
  supersede it.

Scope:

- Add scripts after the implementation is stable.
- Update docs map or public docs as appropriate.

Out of scope:

- Public API changes unrelated to the stories harness.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts test
git diff --check
```

### Verification Plan

Use the smallest gate that honestly covers the blast radius.

For docs-only planning changes:

```bash
git diff --check
```

For stories runtime changes that stay within `tests/stories-server.ts` and
`tests/stories/`:

```bash
pnpm exec tsc --noEmit
pnpm exec tsx tests/stories-server.ts test
```

For framework, security, data-flow, runtime, or cross-package changes:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm test:prod
```

For docs-only changes:

```bash
git diff --check
```

### Handoff Notes

If resuming now:

1. The Ajo UI story server and runner are implemented in
   `tests/stories-server.ts`.
2. The browser app and shared story types live in `tests/stories/app.tsx`.
3. Story modules live in `tests/stories/*.stories.tsx`.
4. Run `pnpm stories` for the interactive manager.
5. Run `pnpm stories:test` for the smoke runner.
6. Run `pnpm stories:test:visual` for opt-in screenshots in
   `.tmp/stories-screenshots`.
7. Use `ai/stories.md` only as supporting research/design documentation for
   future extensions.

Update log:

- 2026-07-01: Selected Ajo UI story harness as active feature, pointed to
  `ai/stories.md` as support documentation, and hydrated implementation
  slices.
- 2026-07-01: Implemented stories runtime, story discovery, controls, all current
  UI component stories, smoke runner, visual screenshot mode, scripts, and docs;
  verified with typecheck, story smoke, visual smoke, full test/build gates, and
  diff whitespace checks.
- 2026-07-01: Split the initial embedded harness into `tests/stories-server.ts`,
  `tests/stories/app.tsx`, and `tests/stories/index.html` for readability.
- 2026-06-26: Cleared completed feature plan after commit and reset this file
  for the next active feature.
