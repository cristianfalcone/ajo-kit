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
	| 'busy'
	| 'connection'
	| 'tls'
	| 'auth'
	| 'rejected'
	| 'throttled'
	| 'unavailable'
	| 'unknown'

const CONFIGURATION: ReadonlySet<RefusalCode> = new Set(['no-transport', 'invalid-config', 'invalid-sender'])
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
 * classification, a retry verdict and at most a protocol status. Never provider
 * prose, never a recipient, never a subject, never a body, never a cause.
 */
export class Undelivered extends Failure {

	readonly code: DeliveryCode
	readonly retryable: boolean
	/** Protocol status only: 'smtp 451', 'status 429'. */
	readonly hint?: string

	constructor(code: DeliveryCode, retryable: boolean, hint?: string) {
		super(502, `Mail delivery failed: ${code}`)
		this.name = 'Undelivered'
		this.code = code
		this.retryable = retryable
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
 * never .envelope. Exported so a third-party transport inherits the guarantee
 * instead of reimplementing it.
 */
export function classify(error: unknown): Undelivered {
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
	const undelivered = (delivery: DeliveryCode, retryable: boolean, detail?: string) =>
		new Undelivered(delivery, retryable, detail)

	if (name === 'Undelivered' && DELIVERY.has(code as DeliveryCode)) {
		const delivery = code as DeliveryCode
		return undelivered(delivery, RETRYABLE.has(delivery))
	}
	if (
		code === 'EAUTH'
		|| responseCode === 530
		|| responseCode === 535
		|| (responseCode === undefined && (status === 401 || status === 403))
	) {
		return undelivered('auth', false, hint)
	}
	if (code === 'ETLS' || code.startsWith('ERR_TLS') || code.includes('CERT')) {
		return undelivered('tls', false)
	}
	if (
		name === 'AbortError'
		|| name === 'TimeoutError'
		|| code === 'ETIMEDOUT'
		|| (code === 'ECONNECTION' && status === undefined)
		|| (responseCode === undefined && status === 408)
	) {
		return undelivered('timeout', true)
	}
	if (responseCode !== undefined && responseCode >= 400 && responseCode < 500) {
		return undelivered('throttled', true, hint)
	}
	if (responseCode !== undefined && responseCode >= 500) {
		return undelivered('rejected', false, hint)
	}
	if (status === 429) return undelivered('throttled', true, hint)
	if (status !== undefined && status >= 500) return undelivered('unavailable', true, hint)
	if (status !== undefined && status >= 400) return undelivered('rejected', false, hint)
	if (code) return undelivered('connection', true)

	return undelivered('unknown', false)
}
