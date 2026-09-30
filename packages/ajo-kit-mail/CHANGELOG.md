# ajo-kit-mail

## 0.4.1

### Patch Changes

- Accepts `ajo-kit ^0.5.0` as its peer (was `^0.4.0`). Nothing else changes.

## 0.4.0

### Breaking Changes

- Requires `ajo-kit ^0.4.0`, and `nodemailer ^10.0.10` (was `^7.0.0`) when you
  use `ajo-kit-mail/smtp`.
- `deliver(message)` is the one mail API: `send()` is removed, and
  `configure()` no longer installs a transport behind `ajo-kit/mail`, which
  ajo-kit 0.4.0 removes.
- `probe()` and `Transport.verify` are removed.
- `Options.observe`, `Options.label`, `Options.concurrency` and the `Delivery`
  type are removed, together with `label` on `Transport` and on `HttpOptions`.
  `Options` is the sender policy (`from`, `replyTo`, `timeout`) plus
  `transport`.
- A successful `Outcome` is `{ ok: true, id }`; the `transport` field is gone.
- `seal`, `domain`, `encode` and the `Envelope` type are no longer exported.
- `Policy.limit` is removed; message bodies keep the fixed 262,144-byte limit.
- `capture().fail()` is removed.

### What Is New

- The package declares `"kit": { "engine": { "net": true } }`, so a sealed App
  that uses it gets `runtime:net` without its own declaration.
- `configure()` refuses a development transport in production and otherwise
  only stores the options.
- The HTTP transport leaves failure bodies unread and treats an empty 200 as
  success; the engine bounds a success body at 64 KiB.
- Nodemailer's file and URL access stay disabled through the SMTP transport
  settings.

### Upgrade Steps

1. Install `ajo-kit-mail@0.4.0` with `ajo-kit@0.4.0`, and `nodemailer@10` if
   you use SMTP.
2. Replace `send(message)` with `deliver(message)` and check the outcome:
   `const outcome = await deliver(message); if (!outcome.ok) throw outcome.error`.
3. Replace imports from `ajo-kit/mail` with `ajo-kit-mail`.
4. Remove `observe`, `label` and `concurrency` from `configure()`, `label` from
   `http()`, and any `probe()` call.
5. Replace `capture().fail()` in tests with a transport function that throws.

## 0.3.0

### Minor Changes

- Use configure() to install the kit mail transport and remove the redundant adapter() export.

### Patch Changes

- Updated dependencies:
  - ajo-kit@0.3.0

## 0.2.0

### Minor Changes

- Require ajo-kit 0.2.x through the core peer dependency. Mail runtime behavior is unchanged; the version marks the removal of support for core 0.1.x.

### Patch Changes

- Updated dependencies:
  - ajo-kit@0.2.0
