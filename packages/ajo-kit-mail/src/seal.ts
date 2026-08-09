import { base64UrlEncode, randomUUID, utf8ByteLength } from 'ajo-kit/platform'
import { Refused, type RefusalCode } from './errors'

/** One mailbox: a bare address, optionally with a display name. */
export interface Address {
	readonly address: string
	readonly name?: string
}

/** A mailbox written as a bare address or as a named pair. */
export type Recipient = string | Address

/** What an application asks the package to deliver. */
export interface Message {
	/** Exactly one recipient. Credential mail must not fan out. */
	to: Recipient
	subject: string
	text: string
	html?: string
	/** Overrides the configured sender for this message only. */
	from?: Recipient
	replyTo?: Recipient
	/** Short label for logs and events: 'reset', 'verify', 'invite'. Default 'mail'. */
	kind?: string
	/** Idempotency key forwarded to providers that accept one. Never deduplicated locally. */
	key?: string
	/** Hard deadline. Nothing is ever attempted past it: pass the credential's own expiry. */
	expires?: Date | number
}

declare const sealed: unique symbol

/**
 * Validated, frozen message. Only seal() constructs one, so a Transport is
 * structurally incapable of receiving unvalidated input.
 */
export interface Envelope {
	readonly id: string
	readonly kind: string
	readonly from: Address
	readonly to: Address
	readonly replyTo?: Address
	readonly subject: string
	readonly text: string
	readonly html?: string
	readonly key?: string
	/** Absolute epoch-ms deadline for this attempt. */
	readonly deadline: number
	/** Aborts at deadline. Transports must honour it. */
	readonly signal: AbortSignal
}

/** An envelope that crossed the package's sole validation boundary. */
export type Sealed = Readonly<Envelope> & { readonly [sealed]: 'ajo-kit-mail' }

/** Validation limits and sender identity. Pure data; a test builds one inline. */
export interface Policy {
	from: Recipient
	replyTo?: Recipient
	/** Milliseconds for one attempt. Default 10_000. */
	timeout?: number
	/** Maximum text + html bytes. Default and hard maximum 262_144. */
	limit?: number
}

// C0 + DEL, written with escapes on purpose: a literal control byte is invisible
// in a diff and this is the regex that stops header injection.
const CONTROL = /[\u0000-\u001f\u007f]/
const ADDRESS = /^(?=.{3,254}$)[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const NAME = /^[^"<>,;:\\\u0000-\u001f\u007f]{1,128}$/
const KEY = /^[A-Za-z0-9._:-]{1,128}$/
const KIND = /^[a-z][a-z0-9-]{0,31}$/
const ADDRESS_BYTES = 254
const SUBJECT_BYTES = 255
const NAME_BYTES = 128
const KEY_BYTES = 128
const KIND_BYTES = 32
const BODY_BYTES = 262_144
const TIMEOUT = 10_000
const WORD_BYTES = 45

const encoder = new TextEncoder()
const bytes = utf8ByteLength
const base64 = (value: string) => {
	const encoded = base64UrlEncode(encoder.encode(value))
	return encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - encoded.length % 4) % 4)
}
const refusal = (code: RefusalCode): never => {
	throw new Refused(code)
}

const mailbox = (recipient: Recipient, code: 'invalid-sender' | 'invalid-recipient'): Address => {
	const address = typeof recipient === 'string' ? recipient : recipient?.address
	const name = typeof recipient === 'string' ? undefined : recipient?.name

	if (typeof address !== 'string') refusal(code)
	if (CONTROL.test(address) || !ADDRESS.test(address) || bytes(address) > ADDRESS_BYTES) {
		refusal(code)
	}
	if (name !== undefined) {
		if (
			typeof name !== 'string'
			|| CONTROL.test(name)
			|| !NAME.test(name)
			|| bytes(name) > NAME_BYTES
		) {
			refusal('invalid-name')
		}
	}

	return Object.freeze({
		address,
		...(name !== undefined && { name }),
	})
}

const duration = (value: number | undefined) => {
	const timeout = value ?? TIMEOUT
	if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 2_147_483_647) {
		refusal('invalid-config')
	}
	return timeout
}

const bodyLimit = (value: number | undefined) => {
	const limit = value ?? BODY_BYTES
	if (!Number.isSafeInteger(limit) || limit <= 0 || limit > BODY_BYTES) refusal('invalid-config')
	return limit
}

const expiry = (value: Date | number | undefined) => {
	if (value === undefined) return Infinity
	const time = value instanceof Date ? value.getTime() : value
	return typeof time === 'number' && Number.isFinite(time) ? time : refusal('expired')
}

/** Validates once, on the way in. Every later stage consumes only the result. */
export function seal(message: Message, policy: Policy): Sealed {
	if (!message || typeof message !== 'object' || !policy || typeof policy !== 'object') {
		refusal('invalid-config')
	}

	const toRecipient = message.to
	const subject = message.subject
	const text = message.text
	const html = message.html
	const fromRecipient = message.from
	const messageReply = message.replyTo
	const rawKind = message.kind
	const key = message.key
	const expires = message.expires
	const policyFrom = policy.from
	const policyReply = policy.replyTo
	const policyTimeout = policy.timeout
	const policyLimit = policy.limit
	const now = Date.now()
	const deadline = Math.min(now + duration(policyTimeout), expiry(expires))
	const limit = bodyLimit(policyLimit)
	const from = mailbox(fromRecipient ?? policyFrom, 'invalid-sender')
	const to = mailbox(toRecipient, 'invalid-recipient')
	const replyRecipient = messageReply ?? policyReply
	const replyTo = replyRecipient === undefined
		? undefined
		: mailbox(replyRecipient, 'invalid-recipient')
	const kind = rawKind ?? 'mail'

	if (
		typeof subject !== 'string'
		|| !subject
		|| CONTROL.test(subject)
		|| bytes(subject) > SUBJECT_BYTES
	) {
		refusal('invalid-subject')
	}
	if (
		typeof kind !== 'string'
		|| CONTROL.test(kind)
		|| !KIND.test(kind)
		|| bytes(kind) > KIND_BYTES
	) {
		refusal('invalid-kind')
	}
	if (
		key !== undefined
		&& (
			typeof key !== 'string'
			|| CONTROL.test(key)
			|| !KEY.test(key)
			|| bytes(key) > KEY_BYTES
		)
	) {
		refusal('invalid-key')
	}
	if (
		typeof text !== 'string'
		|| (html !== undefined && typeof html !== 'string')
		|| (!text && !html)
	) {
		refusal('empty-body')
	}
	if (bytes(text) + bytes(html ?? '') > limit) refusal('too-large')
	if (deadline <= Date.now()) refusal('expired')

	const signal = AbortSignal.timeout(Math.max(0, Math.ceil(deadline - Date.now())))
	return Object.freeze({
		id: randomUUID(),
		kind,
		from,
		to,
		...(replyTo && { replyTo }),
		subject,
		text,
		...(html !== undefined && { html }),
		...(key !== undefined && { key }),
		deadline,
		signal,
	}) as Sealed
}

/** Returns the recipient domain, the only address part safe for logs. */
export function domain(address: string): string {
	return address.slice(address.lastIndexOf('@') + 1).toLowerCase()
}

/** Encodes and folds a value into RFC 2047 encoded-words of at most 75 characters. */
export function encode(value: string): string {
	const chunks: string[] = []
	let chunk = ''
	let size = 0

	for (const character of value) {
		const width = bytes(character)
		if (size + width > WORD_BYTES && chunk) {
			chunks.push(chunk)
			chunk = ''
			size = 0
		}
		chunk += character
		size += width
	}
	chunks.push(chunk)

	return chunks
		.map(part => `=?UTF-8?B?${base64(part)}?=`)
		.join('\r\n ')
}
