import { configure as seam } from 'ajo-kit/mail'
import { env } from 'ajo-kit/platform'
import {
	Refused,
	Undelivered,
	classify,
	type DeliveryCode,
	type RefusalCode,
} from './errors'
import {
	seal,
	domain,
	type Message,
	type Policy,
	type Sealed,
} from './seal'

export { seal, domain, encode } from './seal'
export type { Address, Recipient, Message, Policy, Sealed, Envelope } from './seal'
export { Refused, Undelivered, classify } from './errors'
export type { RefusalCode, DeliveryCode } from './errors'
export { adapter } from './adapter'

/** What a transport returns on success. */
export interface Receipt {
	/** Provider-assigned id, when the provider assigns one. */
	readonly id?: string
}

/** A delivery mechanism. Receives Sealed and nothing else. */
export interface Transport {
	(mail: Sealed): Promise<Receipt | void>
	/** Name reported in delivery events. */
	readonly label?: string
	/** True for test and development transports. configure() refuses them in production. */
	readonly dev?: boolean
	/** Optional credential and connectivity check, used by probe(). */
	verify?(signal: AbortSignal): Promise<void>
}

/** Result of deliver(). Never a bare void. */
export type Outcome =
	| {
		readonly ok: true
		readonly id: string
		readonly transport: string
	}
	| {
		readonly ok: false
		readonly kind: 'refused'
		readonly code: RefusalCode
		readonly error: Refused
	}
	| {
		readonly ok: false
		readonly kind: 'undelivered'
		readonly code: DeliveryCode
		readonly retryable: boolean
		readonly error: Undelivered
	}

/** Body-free delivery event. No field of this type can hold a credential. */
export interface Delivery {
	readonly id: string
	readonly kind: string
	readonly transport: string
	readonly outcome: 'sent' | 'refused' | 'undelivered'
	readonly code?: RefusalCode | DeliveryCode
	readonly retryable?: boolean
	/** Recipient domain only, or undefined when the message never validated. */
	readonly domain?: string
	readonly ms: number
}

/** Process-wide mail policy, transport and observability settings. */
export interface Options extends Policy {
	transport: Transport
	/** Overrides transport.label in delivery events. */
	label?: string
	/** Maximum concurrent in-flight sends. Default 4. Backpressure, not throughput. */
	concurrency?: number
	/** Synchronous, non-throwing observer. Never receives a body. */
	observe?: (delivery: Delivery) => void
}

type Gate = ReturnType<typeof admit>

type Configuration = {
	readonly transport: Transport
	readonly label: string
	readonly policy: Policy
	readonly gate: Gate
	readonly observe?: (delivery: Delivery) => void
}

const CONCURRENCY = 4
const TIMEOUT = 10_000
const MAXIMUM_TIMER = 2_147_483_647
const CONTROL = /[\u0000-\u001f\u007f]/

let configuration: Configuration | undefined

const production = () => env('NODE_ENV') === 'production'

const refuse = (code: RefusalCode): never => {
	throw new Refused(code)
}

const duration = (value: number | undefined) => {
	const timeout = value ?? TIMEOUT
	if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > MAXIMUM_TIMER) {
		refuse('invalid-config')
	}
	return timeout
}

const concurrency = (value: number | undefined) => {
	const limit = value ?? CONCURRENCY
	if (!Number.isSafeInteger(limit) || limit <= 0) refuse('invalid-config')
	return limit
}

const label = (value: unknown): string => {
	if (typeof value !== 'string') return refuse('invalid-config')
	return value
}

/**
 * Bounded concurrency with no resident timer: a setTimeout exists only while a
 * send is genuinely waiting and is cleared on both paths. The slot is transferred
 * on release rather than decremented, so the limit cannot be overshot by callers
 * arriving in the same tick.
 */
const admit = (limit: number) => {

	let active = 0

	const waiting: (() => void)[] = []

	return {
		acquire: (deadline: number) => new Promise<void>((resolve, reject) => {

			if (active < limit) {
				active++
				resolve()
				return
			}

			const timer = setTimeout(() => {
				const index = waiting.indexOf(entry)
				if (index >= 0) waiting.splice(index, 1)
				reject(new Undelivered('busy', true))
			}, Math.max(0, deadline - Date.now()))

			const entry = () => {
				clearTimeout(timer)
				active++
				resolve()
			}

			waiting.push(entry)
		}),
		release: () => {
			active--
			waiting.shift()?.()
		},
	}
}

/**
 * Races the transport against the envelope signal. The race rejects the caller.
 * it cannot reclaim a socket a third-party transport leaked, which is why both
 * shipped transports honour the signal and close in finally.
 */
const bounded = <T>(work: Promise<T>, signal: AbortSignal) => new Promise<T>((resolve, reject) => {

	const stop = () => reject(new Undelivered('timeout', true))

	if (signal.aborted) return stop()

	signal.addEventListener('abort', stop, { once: true })

	work.then(resolve, reject).finally(() => signal.removeEventListener('abort', stop))
})

const sanitized = (error: unknown) => {
	try {
		return classify(error)
	} catch {
		return new Undelivered('unknown', false)
	}
}

const elapsed = (started: number) => Math.max(0, Date.now() - started)

const receipt = (value: Receipt | void, fallback: string) => {
	try {
		const id = value?.id
		return typeof id === 'string' && id && !CONTROL.test(id) ? id : fallback
	} catch {
		return fallback
	}
}

const report = (
	current: Configuration,
	mail: Sealed | undefined,
	outcome: Outcome,
	started: number,
) => {
	if (!current.observe) return

	const event: Delivery = {
		id: outcome.ok ? outcome.id : mail?.id ?? 'unknown',
		kind: mail?.kind ?? 'mail',
		transport: current.label,
		outcome: outcome.ok ? 'sent' : outcome.kind,
		...(!outcome.ok && { code: outcome.code }),
		...(!outcome.ok && outcome.kind === 'undelivered' && { retryable: outcome.retryable }),
		domain: mail ? domain(mail.to.address) : undefined,
		ms: elapsed(started),
	}

	try {
		current.observe(event)
	} catch {
		// Observability must never change delivery semantics.
	}
}

const refused = (error: Refused): Outcome => ({
	ok: false,
	kind: 'refused',
	code: error.code,
	error,
})

const undelivered = (error: unknown): Outcome => {
	const failure = sanitized(error)
	return {
		ok: false,
		kind: 'undelivered',
		code: failure.code,
		retryable: failure.retryable,
		error: failure,
	}
}

const execute = async (message: Message): Promise<Outcome> => {
	const started = Date.now()
	const current = configuration

	if (!current) return refused(new Refused('no-transport'))

	let mail: Sealed

	try {
		mail = seal(message, current.policy)
	} catch (error) {
		const outcome = refused(error instanceof Refused ? error : new Refused('invalid-config'))
		report(current, undefined, outcome, started)
		return outcome
	}

	try {
		await current.gate.acquire(mail.deadline)
	} catch (error) {
		const outcome = undelivered(error)
		report(current, mail, outcome, started)
		return outcome
	}

	let outcome: Outcome

	try {
		if (mail.signal.aborted || mail.deadline <= Date.now()) {
			throw new Undelivered('timeout', true)
		}

		const transport = current.transport
		const result = await bounded(
			Promise.resolve().then(() => transport(mail)),
			mail.signal,
		)
		outcome = {
			ok: true,
			id: receipt(result, mail.id),
			transport: current.label,
		}
	} catch (error) {
		outcome = undelivered(error)
	} finally {
		current.gate.release()
	}

	report(current, mail, outcome, started)
	return outcome
}

/**
 * Installs the transport process-wide and adapts it into ajo-kit's mail seam, so
 * existing send() call sites gain validation and a deadline without being edited.
 * Pure assignment: no socket, no pool, no timer, safe to re-run on every dev reload.
 */
export function configure(options: Options): void {
	try {
		if (!options || typeof options !== 'object' || typeof options.transport !== 'function') {
			refuse('invalid-config')
		}
		if (options.transport.dev === true && production()) refuse('invalid-config')
		if (options.transport.verify !== undefined && typeof options.transport.verify !== 'function') {
			refuse('invalid-config')
		}
		if (options.observe !== undefined && typeof options.observe !== 'function') {
			refuse('invalid-config')
		}

		const transport = options.transport
		const current: Configuration = {
			transport,
			label: label(options.label ?? transport.label ?? 'mail'),
			policy: {
				from: options.from,
				...(options.replyTo !== undefined && { replyTo: options.replyTo }),
				...(options.timeout !== undefined && { timeout: options.timeout }),
				...(options.limit !== undefined && { limit: options.limit }),
			},
			gate: admit(concurrency(options.concurrency)),
			...(options.observe && { observe: options.observe }),
		}

		configuration = current
		seam(async mail => { await send(mail) })
	} catch (error) {
		if (error instanceof Refused) throw error
		throw new Refused('invalid-config')
	}
}

/** Validates, delivers once inside the deadline, reports the outcome. Never throws. */
export async function deliver(message: Message): Promise<Outcome> {
	try {
		return await execute(message)
	} catch (error) {
		return undelivered(error)
	}
}

/** Delivers once and resolves to the message id or throws Refused or Undelivered. */
export async function send(message: Message): Promise<string> {
	const outcome = await deliver(message)
	if (!outcome.ok) throw outcome.error
	return outcome.id
}

/** Runs the transport's optional credential check. Opens a connection only when called. */
export async function probe(
	timeout?: number,
): Promise<
	{ ok: true }
	| {
		ok: false
		error: Refused | Undelivered
	}
> {
	try {
		const current = configuration
		if (!current) throw new Refused('no-transport')

		const verify = current.transport.verify
		if (!verify) return { ok: true }

		const signal = AbortSignal.timeout(duration(timeout ?? current.policy.timeout))
		await bounded(
			Promise.resolve().then(() => verify.call(current.transport, signal)),
			signal,
		)
		return { ok: true }
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Refused ? error : sanitized(error),
		}
	}
}
