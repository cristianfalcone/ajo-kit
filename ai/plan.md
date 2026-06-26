# Ajo Kit Active Plan

Last updated: 2026-06-26

This file tracks the feature currently being developed. Keep it focused on the
next active slice only.

Completed runtime truth belongs in `ai/architecture.md`, app-building guidance
belongs in `ai/LLMs.md`, public API truth belongs in `readme.md` and
`packages/*/README.md`, and committed implementation history belongs in Git.
Remove completed feature planning from this file once the feature is committed
and canonical docs/tests describe the final system.

## Fast Orientation

- Active feature: none.
- User-facing goal: none selected.
- Current phase: ready for the next feature.
- Current slice: none.
- Current sub-slice: none.
- Current implementation status: no active plan is in progress.
- Blockers: awaiting the next feature brief.

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

## Planning Template

Replace this section when a feature is selected.

### Feature Brief

- Active feature:
- User-facing goal:
- Primary users:
- Non-goals:
- Existing behavior to preserve:
- Core security/data-flow rule:

### Domain Language

Use project terms consistently. Add only terms that will shape code, tests, UI,
or docs.

- Term:

Avoid:

- Ambiguous term:

### Current Local Surface

Important current files:

- `path/to/file.ts`

Current behavior:

- Behavior:

### Decision Log

1. Decision:
   Reason:

### Status Ledger

Status meanings:

- `Done`: implemented and verified for that slice.
- `In Progress`: active work exists in the working tree.
- `Ready`: next approved work; no known blocker.
- `Pending`: planned but blocked by earlier slices.
- `Blocked`: cannot proceed without a user decision or external change.

| Slice | Status | Purpose | Gate |
|---|---|---|---|
| 0. Research and plan | Pending | Define the smallest cohesive feature shape | `git diff --check` |

Progress: no implementation slices defined.

### Slice Template

#### Slice N: Name

Status: Pending.

Completion criterion:

- Criterion:

Scope:

- In scope:

Out of scope:

- Out of scope:

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
```

### Verification Plan

Use the smallest gate that honestly covers the blast radius.

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

1. No active feature is selected.
2. Start by replacing the Planning Template with the next feature brief,
   decision log, slices, and gates.
3. Keep completed implementation truth in canonical docs after the feature
   lands.

Update log:

- 2026-06-26: Cleared completed feature plan after commit and reset this file
  for the next active feature.
