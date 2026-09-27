# ajo-kit-mail

Validated mail contract and pluggable transports for `ajo-kit` apps.

Includes:

- one validation boundary: every message is sealed before any transport sees it
- delivery with a hard deadline and a single attempt
- transports: SMTP (mandatory verified TLS), JSON HTTP providers, in-memory capture
- sanitized failures: classified codes and retry verdicts, never provider prose

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

Configure a transport once during app boot:

```ts
import { configure } from 'ajo-kit-mail'
import { smtp } from 'ajo-kit-mail/smtp'

configure({
	transport: smtp({ host: 'smtp.example.com', user: 'apikey', pass: process.env.SMTP_PASS }),
	from: { address: 'noreply@example.com', name: 'Ajo' },
})
```

A mailbox is a bare address string (`'noreply@example.com'`) or an
`{ address, name }` object; `'Name <address>'` strings are refused.

Development uses `capture()`; `configure()` refuses dev transports when
`NODE_ENV` is `production`. Without a configured transport, every delivery is
refused with `no-transport`.

## Sending

`deliver()` is the one way to send. It never throws: it resolves to an
`Outcome`, `{ ok: true, id }` on success (the provider id when the transport
returns one, else the envelope id) and a typed `error` otherwise.

```ts
import { deliver } from 'ajo-kit-mail'

const outcome = await deliver({
	to: { address: 'user@example.com', name: 'User' },
	subject: 'Reset your password',
	text: body,
	kind: 'reset',           // label for logs: 'reset', 'verify', 'invite'
	key: token.id,           // idempotency key, forwarded to providers that accept one
	expires: token.expires,  // hard deadline: nothing is attempted past it
})

if (!outcome.ok && outcome.kind === 'undelivered' && outcome.retryable) retry()
```

Code that should fail the request when mail fails throws the typed error:

```ts
const outcome = await deliver({ to: 'user@example.com', subject: 'Reset', text: body })
if (!outcome.ok) throw outcome.error
```

A message has exactly one recipient: credential mail must not fan out. The
sealed envelope carries an absolute deadline (default 10 s, capped by
`expires`) and an `AbortSignal` transports must honour.

## Transports

### `smtp(options)`

One connection per message over nodemailer, with mandatory verified TLS:
STARTTLS is required on port 587 (`implicit: true` for 465), the certificate
is verified, and the floor is TLS 1.2. None of that is configurable, and
there is no credential URL form: discrete `host`/`user`/`pass` fields only.
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

The message `key` is forwarded as `Idempotency-Key`. Failure bodies are
cancelled unread. A success body is read only when `id` is set, and the
engine bounds it at 64 KiB; an empty success body is still a success.

### `capture(options?)`

Bounded in-memory transport for tests and development, refused in
production:

```ts
import { capture } from 'ajo-kit-mail/capture'

const mailbox = capture()
configure({ transport: mailbox, from: 'noreply@example.com' })

await deliver({ to: 'user@example.com', subject: 'Reset', text: `Open ${url}` })
mailbox.link(/\/reset\//) // first matching URL in the last body
```

`capture({ log: true })` prints the id, kind and recipient domain of each
message, never its body.

### Custom transports

A transport is a function from a `Sealed` envelope to an optional `Receipt`.
It can only receive validated input: the package seals every message before
a transport sees it. Reuse `classify()` so failures inherit the sanitization
guarantee (it returns an `Undelivered` unchanged, so a thrown
`new Undelivered('throttled', 'status 429')` keeps its hint):

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
with a classification (`timeout`, `connection`, `tls`, `auth`, `rejected`,
`throttled`, `unavailable`, `unknown`), the `retryable` verdict it implies and
at most a protocol status hint (`smtp 451`). Both extend `ajo-kit`'s
`Failure`; neither ever echoes an address, a subject, a body or provider prose.

Validation limits: subject up to 255 bytes, text and html together up to
256 KiB. Control characters are rejected in addresses, names, subject, kind
and key; bodies may contain line breaks. That is the boundary that stops
header injection.
