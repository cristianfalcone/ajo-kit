import { Undelivered, type DeliveryCode } from './errors'
import { domain, type Sealed } from './seal'
import type { Transport } from './index'

/** In-memory transport for tests and development. Refused in production by configure(). */
export interface Capture extends Transport {
	/** Bounded ring: at most `keep` envelopes, oldest dropped. Live reset links do not accumulate. */
	readonly messages: readonly Sealed[]
	/** Returns the newest retained envelope. */
	last(): Sealed | undefined
	/** Returns the first absolute URL in the last text body that matches the optional pattern. */
	link(pattern?: RegExp): string | undefined
	/** Fails the next `times` deliveries with `code`, to drive the failure paths. */
	fail(code: DeliveryCode, times?: number): void
	/** Removes retained envelopes and any pending injected failure. */
	clear(): void
}

/** Settings for an in-memory capture transport. */
export interface CaptureOptions {
	/** Print id, kind and recipient domain only. The body is unreachable from the log path. */
	log?: boolean
	/** Retained envelopes. Default 50. */
	keep?: number
}

type Failure = {
	readonly code: DeliveryCode
	remaining: number
}

const DELIVERY: ReadonlySet<DeliveryCode> = new Set([
	'timeout',
	'busy',
	'connection',
	'tls',
	'auth',
	'rejected',
	'throttled',
	'unavailable',
	'unknown',
])
const RETRYABLE: ReadonlySet<DeliveryCode> = new Set([
	'timeout',
	'busy',
	'connection',
	'throttled',
	'unavailable',
])
const LINKS = /https?:\/\/[^\s<>"'`]+/g

const count = (value: number | undefined) => {
	const keep = value ?? 50
	if (!Number.isSafeInteger(keep) || keep < 0) {
		throw new RangeError('Capture keep must be a non-negative safe integer')
	}
	return keep
}

const repetitions = (value: number | undefined) => {
	const times = value ?? 1
	if (!Number.isSafeInteger(times) || times <= 0) {
		throw new RangeError('Capture failure count must be a positive safe integer')
	}
	return times
}

const matches = (pattern: RegExp, value: string) => {
	const lastIndex = pattern.lastIndex
	pattern.lastIndex = 0

	try {
		return pattern.test(value)
	} finally {
		pattern.lastIndex = lastIndex
	}
}

/** Creates a bounded in-memory transport for development and deterministic tests. */
export function capture(options: CaptureOptions = {}): Capture {
	const keep = count(options.keep)
	const messages: Sealed[] = []
	let failure: Failure | undefined

	const transport = async (mail: Sealed) => {
		if (failure) {
			const current = failure
			current.remaining--
			if (current.remaining === 0) failure = undefined
			throw new Undelivered(current.code, RETRYABLE.has(current.code))
		}

		messages.push(mail)
		if (messages.length > keep) messages.splice(0, messages.length - keep)

		if (options.log) {
			console.log(`[mail] ${mail.id} ${mail.kind} @${domain(mail.to.address)} sent 0ms`)
		}

		return { id: mail.id }
	}

	return Object.assign(transport, {
		label: 'capture',
		dev: true,
		messages,
		last: () => messages.at(-1),
		link: (pattern?: RegExp) => {
			const links = messages.at(-1)?.text.match(LINKS) ?? []
			return pattern ? links.find(value => matches(pattern, value)) : links[0]
		},
		fail: (code: DeliveryCode, times?: number) => {
			if (!DELIVERY.has(code)) throw new RangeError('Unknown capture delivery code')
			failure = { code, remaining: repetitions(times) }
		},
		clear: () => {
			messages.length = 0
			failure = undefined
		},
	})
}
