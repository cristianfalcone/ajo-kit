# Ajo Kit Active Plan

Last updated: 2026-06-26
Feature research last checked: 2026-06-26
Agent-workflow research last checked: 2026-06-26

This is the active development source of truth for `ajo-kit`.

Keep this file focused on the feature currently being developed. Completed
runtime truth belongs in `ai/architecture.md`, app-building guidance belongs in
`ai/LLMs.md`, public package/API truth belongs in `readme.md` and package
READMEs, and old plans should be removed or explicitly archived only when the
user asks.

## Fast Orientation

- Active feature: admin-controlled user onboarding.
- User-facing goal: admins can choose between public signup and invite-only
  signup.
- Current phase: planning complete, implementation not started.
- Current slice: Slice 1, schema and data helpers.
- Current sub-slice: Slice 1A, migration and DB types.
- Current implementation status: no feature code has been written yet.
- Blockers: none known for Slice 1.
- Default product behavior to preserve: public registration stays open until an
  admin changes the policy.
- Core security rule: signup policy is enforced by server actions, not only by
  UI links.

Last known working-tree context at this update:

- The auth ability refactor is implemented and its current truth lives in
  canonical docs.
- `AGENTS.md` contains the repo-wide Compatibility Stance.

Always verify live state with:

```bash
git status --short
rg -n "register|signup|invite|invitation|registration:policy|admin:registration" ai readme.md src packages tests
```

## Agent Startup Checklist

When resuming this feature:

1. Read `AGENTS.md`.
2. Read this file from the top through the current slice.
3. Read `ai/architecture.md` for implemented architecture contracts.
4. Read `ai/LLMs.md` for app-building guidance.
5. Read `readme.md` and `packages/ajo-auth/README.md` only where public API
   behavior matters.
6. Before TSX edits, read `node_modules/ajo/LLMs.md`.
7. Run `git status --short` and protect unrelated user work.
8. Inspect current implementation before editing; this plan may be stale.
9. Start at the first slice marked `Ready` or `In Progress`.
10. Update this file before ending the session if status, decisions, files,
    scope, or verification changed.

## Status Ledger

Status meanings:

- `Done`: implemented and verified for that slice.
- `In Progress`: active work exists in the working tree.
- `Ready`: next approved work; no known blocker.
- `Pending`: planned but blocked by earlier slices.
- `Blocked`: cannot proceed without a user decision or external change.

| Slice | Status | Purpose | Gate |
|---|---|---|---|
| 0. Research and plan | Done | Research signup patterns and define the local design | `git diff --check` |
| 1. Schema and data helpers | Ready | Durable policy/invitation state plus app-owned helper module | `pnpm exec tsc --noEmit`, `pnpm test:unit` |
| 2. Public registration policy gate | Pending | Close `/register` when policy is invite-only | Unit + E2E |
| 3. Invitation acceptance | Pending | `/register/[token]` creates invited users | Unit + E2E |
| 4. Admin registration UI | Pending | Admin mode toggle, invite list, create/revoke invite | Unit + E2E |
| 5. Docs and full verification | Pending | Move implemented truth to canonical docs and run full gate | Full gate |

Progress: 0 of 5 implementation slices complete.

## Maintenance Rules

- Keep the current phase and current slice near the top.
- Keep decisions in the Decision Log, not scattered in prose only.
- Keep research in the Research Notes and Online Sources sections.
- Do not duplicate canonical implementation truth after the feature lands.
- When code and this file disagree, inspect code/tests first, then update this
  file or the canonical docs.
- Do not record secrets, invite tokens, real emails, or private deployment
  values.
- Prefer vertical slices that are demoable or verifiable on their own.
- Each slice must have a completion criterion and verification gate.

## Source Of Truth Map

- `AGENTS.md`: repo operating principles, compatibility stance, commands, and
  cross-cutting rules for agents.
- `ai/plan.md`: active feature plan, current progress, decisions, handoff, and
  research.
- `ai/architecture.md`: current implemented architecture and runtime contracts.
- `ai/LLMs.md`: concise app-building guide for AI agents using Ajo and
  `ajo-kit`.
- `ai/chat.md`: chat demo behavior and QA notes only.
- `readme.md`: human public API guide.
- `packages/*/README.md`: package-local public API docs.

## Compatibility Stance

This plan follows the repo-wide Compatibility Stance in `AGENTS.md`.

`ajo-kit` is not in production yet. Prefer the smallest cohesive final surface
over migration shims, compatibility aliases, fallback behavior, or public APIs
that only exist because of the current implementation.

For this feature, that means:

- Keep onboarding app-owned until reuse is proven.
- Do not add a public `@kit/auth` invitation API in the first implementation.
- Do not keep parallel registration-policy mechanisms.
- Do not add a generic settings/feature-flag abstraction for one setting.
- Refactor local registration code when it reduces total surface or removes
  duplicate concepts.

## Feature Brief

Admins need runtime control over user onboarding:

- `open`: public self-service `/register` works.
- `invite`: public self-service registration is closed; invited users register
  through one-time links.

The first implementation should:

- Preserve public registration as the default for the demo app.
- Enforce policy server-side before public registration writes.
- Let admins invite users by email.
- Use one-time, expiring, non-transferable invitation links.
- Store invitation secrets hashed, never plaintext.
- Reuse existing `@kit/auth` primitives where they fit.
- Preserve role/ability boundaries: admins manage policy; invited users receive
  the normal `user` role.
- Keep object-specific and field-specific authorization close to data reads and
  writes.

## Domain Language

Use these terms consistently:

- Registration policy: durable app setting that decides whether public signup
  is open or invite-only.
- Signup mode: the value of registration policy, `open` or `invite`.
- Public signup: `/register` self-service account creation without an invite.
- Invitation: durable audit row for one invited email address and one bearer
  invitation credential.
- Invitation token: plaintext secret sent once by email; only its SHA-256 hash
  is stored.
- Active invitation: invitation that is not expired, accepted, or revoked.
- Acceptance: successful invite flow that creates a user, assigns the `user`
  role, marks the invite accepted, creates a session, and redirects to
  `/dashboard`.

Avoid:

- "feature flag" for this first setting.
- "signup disabled" when the intended state is invite-only.
- "role invite" in the first implementation; invites do not carry roles.

## Current Local Baseline

Important current files:

- `src/(public)/register/handler.ts`
- `src/(public)/register/page.tsx`
- `src/(public)/login/page.tsx`
- `src/(app)/admin/wares.ts`
- `src/(app)/admin/layout.tsx`
- `src/(app)/admin/handler.ts`
- `src/(app)/admin/users/handler.ts`
- `packages/ajo-auth/src/session.ts`
- `packages/ajo-auth/src/reset.ts`
- `packages/ajo-auth/src/types.ts`
- `src/data/types.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/account-admin.spec.ts`

Current behavior:

- `/register` is a public guest route.
- The register action always accepts a new email, creates a `users` row, hashes
  the password, assigns the `user` role when present, sends a verification
  email, creates a cookie session, emits user/session/admin topics, and
  redirects to `/dashboard`.
- The registration page always shows the create-account form.
- The login page always links to `/register`.
- Admin routes require `auth.ability('admin:read')`.
- Admin mutations should use handler-local `auth.authorize(req, 'admin:write')`.
- Admin list routes use bounded pagination and explicit topics.
- There is no existing app settings table or feature flag abstraction.
- Auth token patterns already exist:
  - `session.generate()` creates high-entropy plaintext credentials.
  - sessions, reset tokens, and API tokens store hashes in SQLite.
  - reset tokens expire and plaintext is returned only once.

Migration state at last inspection:

- App migrations currently end at `db/migrations/0003_performance_indexes.ts`.
- `ajo-auth` migrations already include `0004_hash_sessions.ts` and
  `0005_role_abilities.ts`.
- Use a non-conflicting app migration name such as
  `db/migrations/0006_signup_invitations.ts`, adjusted if newer migrations
  exist when implementation starts.

## Research Notes

### Agent-Operable Planning Patterns

Research target: `mattpocock/skills`, plus current AI-agent spec guidance.

Takeaways applied to this file:

- Small, composable guidance beats a framework that owns the whole process.
- A durable plan should not duplicate details already captured in canonical
  docs, diffs, commits, or ADRs; it should point to them.
- A fresh agent needs next-session purpose, current context, suggested workflow,
  and pointers to artifacts.
- A plan should use shared domain language so agents name files, tests, and
  changes consistently.
- Break work into vertical tracer bullets, not horizontal layers. Each slice
  should be narrow, end-to-end, and independently verifiable.
- Prefer existing seams and test through public behavior. The test seam should
  be as high as practical.
- Good tests describe behavior, not implementation, and are added one
  behavior at a time.
- Design for deep modules: small interface, useful behavior behind it, and the
  interface is the test surface.
- Review work on two separate axes: standards compliance and spec compliance.
- A plan should have completion criteria that make premature completion hard.
- Keep one source of truth, prune sediment, and move implemented truth to the
  canonical docs.

Relevant `mattpocock/skills` specifics:

- `handoff`: summarize current context for a fresh agent, include suggested
  skills, reference existing artifacts instead of duplicating them, and redact
  sensitive data.
- `to-prd`: explore the repo, respect glossary/ADRs, choose test seams, record
  implementation and testing decisions, and avoid fragile file-path-heavy specs
  unless paths are needed for current local work.
- `to-issues`: split plans into tracer-bullet vertical slices; each slice cuts
  through all necessary layers and is demoable or verifiable.
- `tdd`: one behavior test, minimal implementation, repeat; never bulk-write
  all tests first.
- `codebase-design`: use deep module vocabulary: module, interface, seam,
  adapter, depth, leverage, locality; use the deletion test to reject shallow
  abstractions.
- `domain-modeling`: update glossary/decisions when terms crystallize; do not
  let fuzzy language become code.
- `implement`: typecheck regularly, run focused tests regularly, run the full
  suite at the end, review, then commit when asked.
- `review`: compare diff against a fixed point on standards and spec axes.
- `writing-great-skills`: optimize for predictable process, clear information
  hierarchy, progressive disclosure, single source of truth, and pruning.

Additional AI-agent spec takeaways:

- A spec should be a living artifact that evolves with implementation.
- Keep commands, tests, project structure, style, workflow, and boundaries easy
  to find.
- Use phased/gated workflow: specify, plan, tasks, implement, verify.
- Use small focused context per task rather than one giant prompt.
- Build in self-checks, constraints, acceptance criteria, and verification.

### Signup And Invitation Product Patterns

The strongest cross-product pattern is that signup access is an explicit
server-side policy. Hiding the "register" link is useful UX, but it is not the
security boundary.

Clerk exposes public, restricted, and waitlist-style signup controls. The
restricted model maps directly to invite-only signup: only invited or allowed
identifiers can complete signup.

WorkOS AuthKit frames invite-only signup as closed registration. Public signup
controls are removed, and invitations are issued through dashboard or SDK
flows.

Logto disables anonymous registration, removes or disables signup UI, and
recommends invitation flows through magic links or pre-created users. It also
calls out social/SSO signup as another account-creation path that must be
controlled later.

Supabase exposes admin invite APIs and generated invite links. Its passwordless
docs warn that magic-link sign-in can implicitly create users unless user
creation is disabled. The Ajo rule should be the same: every path that creates
a user must consult the same policy.

Auth0 separates self-service signup from administrator-created users and
documents one-time password setup/change links for application invitations.
Auth0 organization invitations bind invited users to the invited email address.

Better Auth has `disableSignUp` options and an organization invitation model
with email, inviter, role, status, and expiry. Its email-verification-on-
invitation option reinforces that mailbox ownership matters.

Keycloak distinguishes realm self-registration from automatic user creation
through identity brokering. If Ajo later adds OAuth/social login, disabling
`/register` alone is not enough.

Django allauth exposes `is_open_for_signup(request)` as the hook for disabling
signup and leaves invitation handling to app-specific code. That matches the
recommended Ajo shape: small app-owned onboarding, not a broad auth package API.

Devise Invitable stores invitation token, created/sent/accepted timestamps,
inviter, limits, expiry, and a dedicated accept flow where the invitee sets a
password.

Laravel Fortify is relevant as a route-surface pattern: registration is a
configurable backend feature, and user creation validation stays in a small
application action.

OWASP password reset guidance applies directly to invitation links because
they are bearer links that can create account access. Tokens should be random,
sufficiently long, stored securely, single use, expiring, and sent through a
side channel. Avoid changing account state until a valid token is presented.

## Decision Log

1. Keep onboarding app-owned for now.
   Reason: routes, admin UI, mail copy, topics, and role assignment are app
   concerns. A public `@kit/auth` invitation API would freeze surface too
   early.

2. Add one concrete `registration` table, not a generic settings table.
   Reason: there is one known durable setting; key/value settings would be
   speculative architecture.

3. Add a separate `invitations` table.
   Reason: reset tokens identify existing users; invitations need email,
   inviter, expiry, accepted/revoked audit state, and user creation semantics.

4. Default signup mode is `open`.
   Reason: preserves current demo behavior until an admin closes registration.

5. Enforce signup mode in server actions.
   Reason: UI affordances are not a security boundary.

6. Invitation tokens use existing credential practice.
   Generate plaintext with `auth.session.generate()`, store only
   `sha256(plain)`, email plaintext once, and validate by hashing presented
   token.

7. Invitation expiry defaults to 7 days.
   Reason: longer than reset links, shorter than never-expiring admin invites.

8. Invite acceptance verifies email directly.
   Reason: the invite link proves mailbox control for the first
   implementation; do not send a second verification email.

9. Invitations do not carry roles in the first implementation.
   Reason: invited users receive the normal `user` role. Role selection can be
   added later with ability-bounded grants.

10. Do not add a unique index on `invitations.email`.
    Reason: historical invite rows are useful. Revoke any active invitation for
    the email in the same transaction before inserting a new one.

11. Do not create placeholder users on invite.
    Reason: placeholder users complicate passwordless state, counts,
    verification, deletion, and admin UX.

12. Keep existing duplicate-email register behavior in this feature.
    Reason: anti-enumeration hardening predates this feature and should be a
    separate slice unless the user explicitly expands scope.

13. Add explicit topics `registration:policy` and `admin:registration`.
    Reason: public route freshness and admin invite list freshness are separate
    read domains.

14. Rate-limit invitation creation by inviter and invited email.
    Reason: invites send email and can be abused.

15. Public register policy reads should track `registration:policy`.
    Reason: login/register UI should update through the existing route
    freshness model.

## Architecture Plan

Add two durable concepts:

```text
registration policy -> one app row with signup mode open or invite
invitations         -> one-time invite credentials and audit state
```

Server-side rule:

```text
mode = open   -> /register may create a normal user without an invite
mode = invite -> only /register/:token may create a user, and only for a valid invite
```

UI rule:

```text
mode = open   -> login links to /register and /register shows the form
mode = invite -> login does not offer public signup and /register shows closed copy
```

The first reusable seam should be a small app-owned module:

```text
src/data/registration.ts
```

The module should hide token hashing, active-invite checks, policy row
initialization, and transaction details behind a small interface.

## Schema Plan

Recommended app migration:

```ts
// db/migrations/0006_signup_invitations.ts
```

Suggested tables:

```text
registration
  id          integer primary key check id = 1
  signup      text not null default 'open' -- open | invite
  updated     text
  updated_by  integer null references users.id on delete set null

invitations
  id           text primary key              -- sha256(plain token)
  email        text not null                 -- normalized lowercase email
  name         text not null default ''
  inviter      integer null references users.id on delete set null
  expiry       text not null
  accepted     text null
  accepted_by  integer null references users.id on delete set null
  revoked      text null
  created      text default CURRENT_TIMESTAMP
```

Indexes:

```text
idx_invitations_email
idx_invitations_created
idx_invitations_expiry
```

Creation rule:

- In one transaction, mark previous active invitations for the normalized email
  as revoked, then insert the new row.
- There should be at most one active invitation link per email, but historical
  rows remain.

## Data Helper Interface

Recommended helper surface:

```ts
export type Signup = 'open' | 'invite'

export async function policy(): Promise<Signup>
export async function setPolicy(signup: Signup, user: number): Promise<void>
export async function createInvite(input: InviteInput): Promise<string>
export async function getInvite(token: string): Promise<Invite | null>
export async function acceptInvite(token: string, input: AcceptInput): Promise<number>
export async function revokeInvite(id: string): Promise<void>
```

Design constraints:

- Keep schemas route-local unless shared shapes clearly remove duplication.
- Keep hashing inside the helper.
- Return plaintext invite token only from `createInvite()`.
- Return no token hash from public loaders.
- Make `acceptInvite()` consume the invite in the same transaction that creates
  the user.
- Do not emit topics inside data helpers; route actions should emit after
  durable writes commit.

## Route Plan

### Public `/register`

Loader:

- Track `registration:policy`.
- Return `{ signup: 'open' | 'invite' }`.

Page:

- If `open`, render the current create-account form.
- If `invite`, render closed-registration copy and a sign-in link.
- Avoid visible implementation details.

Action:

- Read policy before parsing/writing.
- If `invite`, throw `Forbidden('Registration is by invitation only')`.
- If `open`, run the existing registration flow.
- Keep rate limiting.
- Keep current duplicate-email behavior for this feature.

### Public `/register/[token]`

Loader:

- Validate the invite token.
- Return invite email and optional name.
- Do not return token hash or inviter internals.
- If invalid, expired, revoked, or accepted, show an invalid invitation page.

Page:

- Show email as fixed text, not editable input.
- Collect password, confirm password, and optional display name.
- Follow Ajo TSX rules from `node_modules/ajo/LLMs.md`.

Action:

- Validate token again server-side.
- Validate password and confirm.
- Reject if `users.email` already exists.
- In one transaction:
  - create user with invited email, name, password hash, and `verified` set;
  - assign the `user` role;
  - mark invitation accepted and `accepted_by`;
  - return user id.
- After commit:
  - create session;
  - write cookie;
  - emit user/session/admin topics;
  - redirect to `/dashboard`.

Do not send a second verification email in this flow.

### Admin `/admin/registration`

Files:

```text
src/(app)/admin/registration/handler.ts
src/(app)/admin/registration/page.tsx
```

Admin nav:

- Add a "Registration" item to `src/(app)/admin/layout.tsx`.

Loader:

- Use the existing admin subtree boundary.
- Track `admin:registration`.
- Return current signup mode.
- Return bounded recent invitations, newest first.
- Select explicit fields only.

Actions:

- `mode`: requires `auth.authorize(req, 'admin:write')`; validates `open` or
  `invite`; updates the one policy row; emits
  `['admin:registration', 'registration:policy']`.
- `invite`: requires `admin:write`; validates email/name; rate limits by
  inviter and invited email; creates invitation; sends email; emits
  `admin:registration`.
- `revoke`: requires `admin:write`; marks a pending invitation revoked; emits
  `admin:registration`.

UI controls:

- Use a segmented control or compact radio group for mode.
- Use a simple invite form: email, optional name, submit.
- Use existing `Panel`, `Table`, `Badge`, `Button`, `Input`, and `Feedback`
  components where they fit.
- Keep cards limited to repeated/list items or framed tools. Do not nest cards.

## Topics

Add topic ownership to `ai/architecture.md` after implementation:

```text
registration:policy
  read by public register/login loaders that decide whether public signup exists
  emitted when admins change signup mode

admin:registration
  read by admin registration settings/invitations page
  emitted when signup mode or invitation rows change
```

Emit after successful invite acceptance:

```text
sessions:<id>
dashboard:<id>
user:<id>
admin:sessions
admin:users
admin:stats
admin:registration
```

`admin:registration` is included because an invitation moved to accepted.

## Email Plan

Use existing `@kit/mail` transport.

Invite email should include:

- Who invited the user, if available.
- The app name or origin.
- The accept URL.
- Expiration.
- A short note to ignore the email if unexpected.

Do not include plaintext temporary passwords. Let the invitee set their own
password over the HTTPS app route.

## Security Notes

- The server action is the security boundary.
- Invitation tokens are bearer credentials. Treat them like reset tokens.
- Store hashes only.
- Make tokens single use.
- Check expiry on every validate and accept path.
- Consume the invite in the same transaction that creates the user.
- Do not store a role on invitation rows or accept a role from the request body
  in the first implementation.
- If role selection is added later, never let an admin create a higher-ability
  account than their own grants allow.
- If OAuth/social login is added later, every first-login user creation path
  must consult the same registration policy or pre-created user/invite state.
- Current `/register` duplicate email behavior reveals existing accounts. This
  predates the feature; keep generic anti-enumeration responses for a separate
  auth-hardening slice unless requested.
- Rate-limit invitation creation because it sends email.
- Production depends on configured `APP_URL` and `APP_SECRET` for safe links,
  signatures, and origin checks.

## Testing Strategy

Use behavior tests through public seams:

- Unit-test `src/data/registration.ts` behavior with a real temporary SQLite
  database.
- E2E-test public registration and invitation flows through pages/actions.
- E2E-test admin policy changes and invite management through `/admin`.
- Keep tests focused on behavior and security boundaries, not helper internals.
- Add tests one vertical behavior at a time.

Existing prior art:

- `tests/unit/packages/ajo-auth.test.ts` creates temporary SQLite databases for
  auth behavior.
- `tests/e2e/auth.spec.ts` covers registration, login, reset, verification.
- `tests/e2e/account-admin.spec.ts` covers admin pages and auth boundaries.

## Vertical Slice Plan

### Slice 0: Research And Active Plan

Status: Done.

Completed:

- Researched signup/invitation patterns across auth products and frameworks.
- Researched agent-operable planning patterns, especially
  `mattpocock/skills`.
- Reworked the previous onboarding plan into this active `ai/plan.md`
  structure.
- Kept feature research and implementation plan in the new scheme.

Gate:

```bash
git diff --check
rg -n "auth\\.role|role\\(" AGENTS.md ai readme.md packages src tests
```

### Slice 1: Schema And Data Helpers

Status: Ready.

Current sub-slice: 1A, migration and DB types.

Completion criterion:

- The app has durable signup policy and invitation state.
- Data helpers can create, validate, accept, and revoke invitations using
  hashed tokens.
- Focused unit tests prove policy defaults, hashing, expiry, revoke, accepted,
  and single-use behavior.

Scope:

- Add non-conflicting app migration for `registration` and `invitations`.
- Extend `src/data/types.ts`.
- Add `src/data/registration.ts`.
- Use hashed invitation tokens.
- Add focused unit tests for:
  - default policy is `open`;
  - setting policy persists;
  - invite creation stores hash, not plaintext;
  - expired, revoked, and accepted invites do not validate;
  - accept is single-use.

Out of scope:

- Public UI changes.
- Admin UI.
- Email delivery.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
```

### Slice 2: Public Registration Policy Gate

Status: Pending.

Completion criterion:

- Public signup stays open by default.
- When policy is invite-only, `/register` UI closes and direct public register
  action is forbidden server-side.

Scope:

- Add loader to `/register` for current policy.
- Make `/register` action reject public signup when mode is `invite`.
- Update `/register` page to show closed-registration state.
- Update `/login` to hide the register link when policy is `invite`.
- Track `registration:policy`.

Out of scope:

- Invitation acceptance.
- Admin mode toggle.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
```

E2E scenarios:

- Default mode remains open and existing registration test still passes.
- Invite-only mode hides register link and blocks direct register POST.

### Slice 3: Invitation Acceptance

Status: Pending.

Completion criterion:

- A valid invitation link creates a normal non-admin user, signs them in, and
  cannot be reused.

Scope:

- Add `/register/[token]` page and handler.
- Validate invite on loader and action.
- Create user, role membership, accepted invite, session, cookie, and emits.
- Send invited users to dashboard after acceptance.

Out of scope:

- Admin invitation management UI.
- Resend/revoke flows.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
```

E2E scenarios:

- Valid invite creates a non-admin user and signs them in.
- Reusing the same invite fails.
- Expired, revoked, or missing invite cannot create a user.
- Invite for an existing email fails without mutating the invitation.

### Slice 4: Admin Registration UI

Status: Pending.

Completion criterion:

- Admins can switch signup mode, create invitations, see recent invitations,
  and revoke pending invitations.

Scope:

- Add `/admin/registration`.
- Add admin nav item.
- Add mode toggle action.
- Add invite action and email sending.
- Add revoke action.
- Track and emit `admin:registration`.
- Require `admin:write` inside mutation actions.

Out of scope:

- Role selection for invitations.
- Quotas.
- Bulk import.
- Domain allowlists.

Gate:

```bash
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
```

E2E scenarios:

- Admin switches to invite-only and public signup closes live/on navigation.
- Admin switches back to open and public signup returns.
- Admin creates invitation and sees it in bounded list.
- Admin revokes pending invitation.
- Non-admin cannot access admin registration page or actions.

### Slice 5: Documentation And Full Verification

Status: Pending.

Completion criterion:

- Implemented truth is moved into canonical docs, this active plan reflects the
  final status, and full verification is green or blockers are recorded.

Scope:

- Update `ai/architecture.md` with implemented onboarding behavior and topics.
- Update `ai/LLMs.md` app-building guidance.
- Update `readme.md` if public app/auth documentation should mention the
  pattern.
- Prune this file so it remains an active plan/handoff, not stale history.

Gate:

```bash
git diff --check
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm test:prod
```

Consistency search:

```bash
rg -n "register|signup|invite|invitation|registration:policy|admin:registration" ai readme.md src packages tests
```

## Full Acceptance Criteria

- Default migrated app still allows public registration.
- Admin can switch mode to invite-only without a restart.
- Invite-only mode blocks direct public registration on the server.
- Invite-only mode removes public signup affordances from login/register UI.
- Admin can create an invitation email.
- Invitation link lets the recipient set a password and create the account.
- Invitation cannot be reused.
- Expired, revoked, accepted, or missing invitation tokens fail closed.
- Invitation secrets are never stored plaintext.
- Successful invite acceptance emits user/session/admin topics after commit.
- Admin registration page updates through normal route freshness/SSE behavior.
- All multi-step durable writes use transactions.
- Tests cover behavior and security boundaries, not implementation trivia.

## Rejected Alternatives

### Environment Variable Only

Rejected as the primary mechanism.

An env var is simple but not admin-controllable at runtime, does not support
live route updates, and does not provide audit state. It can be added later as
a bootstrap default if needed.

### Hide The Register Link Only

Rejected.

Direct POSTs to `/register?/default` would still create users. All researched
systems treat signup access as a backend policy.

### Reuse Password Reset Tokens As Invitations

Rejected.

Reset tokens identify existing users. Invitations need email, inviter, created
state, expiry, accepted/revoked audit state, and a no-existing-user creation
flow.

### Create Placeholder Users On Invite

Rejected for the first slice.

Auth0 and Logto both support pre-created users, but in Ajo this would require
clear semantics for passwordless users, role assignment before acceptance,
admin user counts, deletion, and verification. A separate `invitations` table
keeps the first implementation smaller and less surprising.

### General Feature Flags Table

Rejected.

There is one known setting. A generic key/value table would be speculative
architecture.

### Public `@kit/auth` Invitation API

Rejected for now.

The flow depends on app routes, admin UI, mail wording, role assignment, and
topics. Keep it app-local until at least one second app proves the reusable
shape.

## Handoff Notes

If resuming now:

1. Start with Slice 1A.
2. Verify current migration filenames.
3. Read current DB test setup before adding tests.
4. Add migration/types/helpers as one cohesive slice.
5. Run `pnpm exec tsc --noEmit` and `pnpm test:unit`.
6. Update this file with actual files changed, verification results, and next
   slice status.

Suggested workflow for future agents:

- Use the `tdd` pattern for helper and route behavior.
- Use the `to-issues` vertical-slice pattern if this plan is broken into
  external issues.
- Use the `review` two-axis pattern before committing: standards vs this spec.
- Use a temporary handoff when context gets large; keep this file as the
  persistent source of truth.

Update log:

- 2026-06-26: Research and initial onboarding plan created.
- 2026-06-26: Repo Compatibility Stance moved to `AGENTS.md`.
- 2026-06-26: Auth ability plan removed after implementation; relevant truth
  consolidated into canonical docs.
- 2026-06-26: Active plan refactored into this file with agent-operable status,
  slices, decisions, and research.

## Future Options

Only add these when a concrete product need appears:

- Per-invite role selection, bounded by inviter abilities.
- Invitation resend.
- Invitation quotas.
- Bulk invite import.
- Domain allowlist/blocklist.
- Waitlist mode.
- Request-access workflow.
- Audit event table for all auth/admin actions.
- Public `@kit/auth` invitation module.
- OAuth/social first-login integration with the same signup policy.
- Configurable invite expiry.

## Online Sources

Agent workflow and planning references:

- Matt Pocock Skills README:
  https://github.com/mattpocock/skills
- Matt Pocock handoff skill:
  https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md
- Matt Pocock to-prd skill:
  https://github.com/mattpocock/skills/blob/main/skills/engineering/to-prd/SKILL.md
- Matt Pocock to-issues skill:
  https://github.com/mattpocock/skills/blob/main/skills/engineering/to-issues/SKILL.md
- Matt Pocock tdd skill:
  https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md
- Matt Pocock codebase-design skill:
  https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md
- Matt Pocock domain-modeling skill:
  https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md
- Matt Pocock implement skill:
  https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md
- Matt Pocock review skill:
  https://github.com/mattpocock/skills/blob/main/skills/in-progress/review/SKILL.md
- Matt Pocock writing-great-skills skill:
  https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md
- AI Hero handoff article:
  https://www.aihero.dev/skills-handoff
- Addy Osmani, How to write a good spec for AI agents:
  https://addyosmani.com/blog/good-spec/
- Addy Osmani Agent Skills:
  https://github.com/addyosmani/agent-skills

Primary product/framework references:

- Clerk Restrictions:
  https://clerk.com/docs/guides/secure/restricting-access
- Clerk restricted signup mode changelog:
  https://clerk.com/changelog/2024-09-30-restricted-sign-up-mode
- WorkOS AuthKit invite-only signup:
  https://workos.com/docs/authkit/invite-only-signup
- Logto no public registration and invitation-only:
  https://docs.logto.io/end-user-flows/sign-up-and-sign-in/disable-user-registration
- Supabase invite user by email:
  https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail
- Supabase generate auth links:
  https://supabase.com/docs/reference/javascript/auth-admin-generatelink
- Supabase passwordless email login:
  https://supabase.com/docs/guides/auth/auth-email-passwordless
- Auth0 connection settings best practices:
  https://auth0.com/docs/authenticate/connection-settings-best-practices
- Auth0 application signup invitations:
  https://auth0.com/docs/customize/email/send-email-invitations-for-application-signup
- Auth0 organization invitations:
  https://auth0.com/docs/manage-users/organizations/configure-organizations/invite-members
- Auth0 organization connection signup:
  https://auth0.com/docs/manage-users/organizations/configure-organizations/enable-connections
- Better Auth options:
  https://better-auth.com/docs/reference/options
- Better Auth organization plugin:
  https://www.better-auth.com/docs/plugins/organization
- Keycloak server administration guide:
  https://www.keycloak.org/docs/latest/server_admin/index.html
- Django allauth advanced usage:
  https://docs.allauth.org/en/dev/account/advanced.html
- django-invitations usage:
  https://django-invitations.readthedocs.io/en/latest/usage.html
- Laravel Fortify:
  https://laravel.com/docs/13.x/fortify
- Devise Invitable:
  https://github.com/scambra/devise_invitable

Security references:

- OWASP Forgot Password Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet:
  https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Testing for Account Enumeration:
  https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account
- OWASP Testing for Weak Password Change or Reset:
  https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/09-Testing_for_Weak_Password_Change_or_Reset_Functionalities
