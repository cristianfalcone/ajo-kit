# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo uses a single-context layout. Canonical project context lives under `ai/`.

Do not create `docs/agents/`, `docs/adr/`, `CONTEXT.md`, or `CONTEXT-MAP.md` for normal skill setup. If a future task explicitly needs a new decision record or glossary, keep it aligned with the existing `ai/*.md` convention unless the user asks for a different layout.

## Before exploring, read these

- `AGENTS.md` for repo-wide agent rules, commands, package boundaries, and verification expectations.
- `ai/architecture.md` for canonical implementation architecture and runtime contracts.
- `ai/plan.md` for active feature status, current slices, decisions, and handoff notes.
- `ai/LLMs.md` for the app-building guide for AI agents using Ajo and `ajo-kit`.
- `ai/chat.md` for chat demo behavior, data, scrolling, unread, and QA notes when touching chat behavior.
- `ai/comparison.md` for framework, auth, and routing comparison context when architectural tradeoffs matter.
- `node_modules/ajo/LLMs.md` before writing Ajo TSX.

Read package-local `README.md` files when touching a package public API.

If one of these files is absent, proceed silently and inspect the current code and tests.

## Use the repo vocabulary

When output names a project concept in an issue title, refactor proposal, hypothesis, or test name, use the terms already present in `ai/*.md`, `readme.md`, and the implementation. Avoid introducing parallel names for the same concept.

If the concept you need is not documented yet, note the gap in the relevant `ai/*.md` file only when the task already includes documentation updates or the user asks for that cleanup.

## Flag decision conflicts

If a recommendation or implementation contradicts an existing decision in `ai/architecture.md` or `ai/plan.md`, surface that conflict explicitly instead of silently overriding it.
