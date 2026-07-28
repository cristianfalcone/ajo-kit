# ajo-kit-mail

Validated mail contract and pluggable transports for `ajo-kit` apps.

Includes:

- one validation boundary: every message is sealed before any transport sees it
- delivery with a hard deadline, bounded concurrency and a single attempt
- transports: SMTP (mandatory verified TLS), JSON HTTP providers, in-memory capture
- sanitized failures: classified codes and retry verdicts, never provider prose
- credential-free delivery events for observability
- integration with `ajo-kit`'s mail seam, so existing `send()` call sites gain
  validation without being edited

## Install

```bash
pnpm add ajo-kit-mail
```

`ajo-kit-mail` requires `ajo-kit` as a peer dependency.

`nodemailer` is an optional peer used only by the SMTP transport. HTTP and
capture consumers do not install it:

```bash
pnpm add nodemailer # only when using smtp()
```

## Setup

Configure a transport once during app boot. `configure()` also adapts the
package into `ajo-kit`'s mail seam, so code importing `send` from
`ajo-kit/mail` delivers through it with validation and a deadline.

```ts
import { configure } from 'ajo-kit-mail'
import { smtp } from 'ajo-kit-mail/smtp'

configure({
	transport: smtp({ host: 'smtp.example.com', user: 'apikey', pass: process.env.SMTP_PASS }),
	from: 'Ajo <noreply@example.com>',
})
```

Development uses `capture()`; `configure()` refuses dev transports when
`NODE_ENV` is `production`.

## Sending

```ts
import { deliver, send } from 'ajo-kit-mail'

// Resolves to the message id, throws Refused or Undelivered.
await send({ to: 'user@example.com', subject: 'Reset', text: body })

// Never throws: a discriminated Outcome for code that branches on failure.
const outcome = await deliver({
	to: { address: 'user@example.com', name: 'User' },
	subject: 'Reset your password',
	text: body,
	kind: 'reset',           // label for events: 'reset', 'verify', 'invite'
	key: token.id,           // idempotency key, forwarded to providers that accept one
	expires: token.expires,  // hard deadline: nothing is attempted past it
})

if (!outcome.ok && outcome.kind === 'undelivered' && outcome.retryable) retry()
```

A message has exactly one recipient — credential mail must not fan out. The
sealed envelope carries an absolute deadline (default 10 s, capped by
`expires`) and an `AbortSignal` transports must honour.

`probe()` runs the transport's optional credential check without sending:

```ts
const status = await probe() // { ok: true } | { ok: false, error }
```

## Transports

### `smtp(options)`

One connection per message over nodemailer, with mandatory verified TLS:
STARTTLS is required on port 587 (`implicit: true` for 465), the certificate
is verified, and the floor is TLS 1.2. None of that is configurable, and
there is no credential URL form — discrete `host`/`user`/`pass` fields only.
Local development uses `capture()` instead of an insecure flag.

### `http(options)`

A JSON provider over global `fetch`. The body mapping is the only
provider-specific code an app writes:

```ts
import { http } from 'ajo-kit-mail/http'

const transport = http({
	url: 'https://api.provider.example/send',
	headers: () => ({ Authorization: `Bearer ${read()}` }), // factory: read per send
	body: mail => ({ from: mail.from.address, to: mail.to.address, subject: mail.subject, text: mail.text }),
	id: payload => (payload as { id?: string }).id,
})
```

The message `key` is forwarded as `Idempotency-Key`. Success bodies are read
up to 64 KiB; failure bodies are cancelled unread.

### `capture(options?)`

Bounded in-memory transport for tests and development — refused in
production:

```ts
import { capture } from 'ajo-kit-mail/capture'

const mailbox = capture()
configure({ transport: mailbox, from: 'noreply@example.com' })

await send({ to: 'user@example.com', subject: 'Reset', text: `Open ${url}` })
mailbox.link(/\/reset\//)          // first matching URL in the last body
mailbox.fail('throttled', 2)       // drive the failure paths deterministically
```

### Custom transports

A transport is a function from a `Sealed` envelope to an optional `Receipt`.
It can only receive validated input — `seal()` is the sole constructor of
`Sealed`. Reuse `classify()` so failures inherit the sanitization guarantee:

```ts
import { classify, type Transport } from 'ajo-kit-mail'

const transport: Transport = async mail => {
	try {
		await provider.send(/* ... */)
	} catch (error) {
		throw classify(error) // shape only: never message, cause or response bodies
	}
}
```

## Outcomes and errors

`Refused` means the message or configuration was rejected before any network
work: `invalid-recipient`, `empty-body`, `too-large`, `expired`, and friends.
`Undelivered` means a transport accepted the envelope and the attempt failed,
with a classification (`timeout`, `auth`, `tls`, `throttled`, `rejected`, …),
a `retryable` verdict and at most a protocol status hint (`smtp 451`). Both
extend `ajo-kit`'s `Failure`; neither ever echoes an address, a subject, a
body or provider prose.

Validation limits: subject ≤ 255 bytes, body ≤ 256 KiB (hard maximum),
control characters rejected everywhere — the boundary that stops header
injection.

## Observability

```ts
configure({
	transport,
	from: 'noreply@example.com',
	concurrency: 4, // backpressure, not throughput
	observe: delivery => log(delivery), // { id, kind, transport, outcome, code?, retryable?, domain?, ms }
})
```

Events are body-free by construction: the recipient appears as its domain
only, and no field can hold a credential. A throwing observer never changes
delivery semantics.
