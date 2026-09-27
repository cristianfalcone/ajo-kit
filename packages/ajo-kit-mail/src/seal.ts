import { randomUUID, utf8ByteLength } from 'ajo-kit/platform'
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
	/** Short label for logs: 'reset', 'verify', 'invite'. Default 'mail'. */
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
export interface Sealed {
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
	readonly [sealed]: 'ajo-kit-mail'
}

/** Sender identity and attempt timeout. Pure data; a test builds one inline. */
export interface Policy {
	from: Recipient
	replyTo?: Recipient
	/** Milliseconds for one attempt. Default 10_000. */
	timeout?: number
}

// C0 + DEL, written with escapes on purpose: a literal control byte is invisible
// in a diff and this is the regex that stops header injection in the subject.
// The other header grammars below exclude control characters on their own.
const CONTROL = /[\u0000-\u001f\u007f]/
const ADDRESS = /^(?=.{3,254}$)[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const NAME = /^[^"<>,;:\\\u0000-\u001f\u007f]{1,128}$/
const KEY = /^[A-Za-z0-9._:-]{1,128}$/
const KIND = /^[a-z][a-z0-9-]{0,31}$/
const SUBJECT_BYTES = 255
const NAME_BYTES = 128
const BODY_BYTES = 262_144
const TIMEOUT = 10_000

const bytes = utf8ByteLength
const refusal = (code: RefusalCode): never => {
	throw new Refused(code)
}

const mailbox = (recipient: Recipient, code: 'invalid-sender' | 'invalid-recipient'): Address => {
	const { address, name }: Partial<Address> = typeof recipient === 'string' ? { address: recipient } : recipient ?? {}

	if (typeof address !== 'string' || !ADDRESS.test(address)) refusal(code)
	if (name !== undefined && (!NAME.test(name) || bytes(name) > NAME_BYTES)) refusal('invalid-name')

	return name === undefined ? { address } : { address, name }
}

const duration = (value: number | undefined) => {
	const timeout = value ?? TIMEOUT
	if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 2_147_483_647) {
		refusal('invalid-config')
	}
	return timeout
}

const expiry = (value: Date | number | undefined) => {
	if (value === undefined) return Infinity
	const time = value instanceof Date ? value.getTime() : value
	return typeof time === 'number' && Number.isFinite(time) ? time : refusal('expired')
}

/** Validates once, on the way in. Every later stage consumes only the result. */
export function seal(message: Message, policy: Policy): Sealed {
	// One read per field: the envelope holds exactly the values that were validated.
	const {
		to,
		subject,
		text,
		html,
		from = policy.from,
		replyTo = policy.replyTo,
		kind = 'mail',
		key,
		expires,
	} = message
	const deadline = Math.min(Date.now() + duration(policy.timeout), expiry(expires))
	const sender = mailbox(from, 'invalid-sender')
	const recipient = mailbox(to, 'invalid-recipient')
	const reply = replyTo === undefined ? undefined : mailbox(replyTo, 'invalid-recipient')

	if (
		typeof subject !== 'string'
		|| !subject
		|| CONTROL.test(subject)
		|| bytes(subject) > SUBJECT_BYTES
	) {
		refusal('invalid-subject')
	}
	if (!KIND.test(kind)) refusal('invalid-kind')
	if (key !== undefined && !KEY.test(key)) refusal('invalid-key')
	if (
		typeof text !== 'string'
		|| (html !== undefined && typeof html !== 'string')
		|| (!text && !html)
	) {
		refusal('empty-body')
	}
	if (bytes(text) + bytes(html ?? '') > BODY_BYTES) refusal('too-large')
	if (deadline <= Date.now()) refusal('expired')

	const signal = AbortSignal.timeout(Math.max(0, Math.ceil(deadline - Date.now())))
	return Object.freeze({
		id: randomUUID(),
		kind,
		from: sender,
		to: recipient,
		...(reply && { replyTo: reply }),
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
