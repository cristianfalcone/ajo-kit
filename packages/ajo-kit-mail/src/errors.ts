import { Failure } from 'ajo-kit'

/** Why a message was rejected before any network work happened. */
export type RefusalCode =
	| 'no-transport'
	| 'invalid-config'
	| 'invalid-sender'
	| 'invalid-recipient'
	| 'invalid-subject'
	| 'invalid-name'
	| 'invalid-kind'
	| 'invalid-key'
	| 'empty-body'
	| 'too-large'
	| 'expired'

/** Why an accepted envelope failed in flight. */
export type DeliveryCode =
	| 'timeout'
	| 'connection'
	| 'tls'
	| 'auth'
	| 'rejected'
	| 'throttled'
	| 'unavailable'
	| 'unknown'

const CONFIGURATION: ReadonlySet<RefusalCode> = new Set(['no-transport', 'invalid-config', 'invalid-sender'])
const RETRYABLE: ReadonlySet<DeliveryCode> = new Set([
	'timeout',
	'connection',
	'throttled',
	'unavailable',
])

/**
 * The message or the configuration was rejected. Nothing was sent and no provider
 * was contacted. Extends Failure with a deliberate status so normalize() cannot
 * inherit a provider status and server.tsx never console.error()s the object.
 * The message is the code and never echoes an input value.
 */
export class Refused extends Failure {

	readonly code: RefusalCode

	constructor(code: RefusalCode) {
		super(CONFIGURATION.has(code) ? 500 : 422, `Mail refused: ${code}`)
		this.name = 'Refused'
		this.code = code
		if (CONFIGURATION.has(code)) console.error(`[mail] refused: ${code}`)
	}
}

/**
 * A transport accepted the envelope and the attempt failed. Carries a
 * classification, the retry verdict it implies and at most a protocol status.
 * Never provider prose, never a recipient, never a subject, never a body, never a cause.
 */
export class Undelivered extends Failure {

	readonly code: DeliveryCode
	readonly retryable: boolean
	/** Protocol status only: 'smtp 451', 'status 429'. */
	readonly hint?: string

	constructor(code: DeliveryCode, hint?: string) {
		super(502, `Mail delivery failed: ${code}`)
		this.name = 'Undelivered'
		this.code = code
		this.retryable = RETRYABLE.has(code)
		this.hint = hint
	}
}

type Shape = {
	name?: unknown
	code?: unknown
	responseCode?: unknown
	status?: unknown
	statusCode?: unknown
}

const protocol = (value: unknown) =>
	typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
		? value
		: undefined

/**
 * Reduces any thrown value to an Undelivered by reading shape only: name, code,
 * responseCode/status/statusCode. Never .message, never .cause, never .response,
 * never .envelope. An Undelivered passes through unchanged, hint included.
 * Exported so a third-party transport inherits the guarantee instead of
 * reimplementing it.
 */
export function classify(error: unknown): Undelivered {
	if (error instanceof Undelivered) return error

	const value: Shape = error !== null && (typeof error === 'object' || typeof error === 'function')
		? error
		: {}
	const rawName = value.name
	const rawCode = value.code
	const rawResponseCode = value.responseCode
	const rawStatus = value.status
	const rawStatusCode = value.statusCode
	const name = typeof rawName === 'string' ? rawName : ''
	const code = typeof rawCode === 'string' ? rawCode : ''
	const responseCode = protocol(rawResponseCode)
	const directStatus = protocol(rawStatus)
	const statusCode = protocol(rawStatusCode)
	const status = responseCode ?? directStatus ?? statusCode
	const hint = status === undefined
		? undefined
		: `${responseCode === undefined ? 'status' : 'smtp'} ${status}`

	if (
		code === 'EAUTH'
		|| responseCode === 530
		|| responseCode === 535
		|| (responseCode === undefined && (status === 401 || status === 403))
	) {
		return new Undelivered('auth', hint)
	}
	if (code === 'ETLS' || code.startsWith('ERR_TLS') || code.includes('CERT')) {
		return new Undelivered('tls')
	}
	if (
		name === 'AbortError'
		|| name === 'TimeoutError'
		|| code === 'ETIMEDOUT'
		|| (code === 'ECONNECTION' && status === undefined)
		|| (responseCode === undefined && status === 408)
	) {
		return new Undelivered('timeout')
	}
	if (responseCode !== undefined && responseCode >= 400 && responseCode < 500) {
		return new Undelivered('throttled', hint)
	}
	if (responseCode !== undefined && responseCode >= 500) {
		return new Undelivered('rejected', hint)
	}
	if (status === 429) return new Undelivered('throttled', hint)
	if (status !== undefined && status >= 500) return new Undelivered('unavailable', hint)
	if (status !== undefined && status >= 400) return new Undelivered('rejected', hint)
	if (code) return new Undelivered('connection')

	return new Undelivered('unknown')
}
