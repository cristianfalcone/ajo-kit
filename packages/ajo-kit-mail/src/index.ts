import { env } from 'ajo-kit/platform'
import {
	Refused,
	Undelivered,
	classify,
	type DeliveryCode,
	type RefusalCode,
} from './errors'
import { seal, type Message, type Policy, type Sealed } from './seal'

export type { Address, Recipient, Message, Policy, Sealed } from './seal'
export { Refused, Undelivered, classify } from './errors'
export type { RefusalCode, DeliveryCode } from './errors'

/** What a transport returns on success. */
export interface Receipt {
	/** Provider-assigned id, when the provider assigns one. */
	readonly id?: string
}

/** A delivery mechanism. Receives Sealed and nothing else. */
export interface Transport {
	(mail: Sealed): Promise<Receipt | void>
	/** True for test and development transports. configure() refuses them in production. */
	readonly dev?: boolean
}

/** Result of deliver(). Never a bare void. */
export type Outcome =
	| {
		readonly ok: true
		readonly id: string
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

/** Process-wide sender, timeout and transport. */
export interface Options extends Policy {
	transport: Transport
}

let configuration: Options | undefined

const production = () => env('NODE_ENV') === 'production'

/**
 * Races the transport against the envelope signal. The race settles the caller;
 * it cannot reclaim a socket a third-party transport leaked, which is why both
 * shipped transports honour the signal themselves.
 */
const bounded = <T>(work: Promise<T>, signal: AbortSignal) => new Promise<T>((resolve, reject) => {

	const stop = () => reject(new Undelivered('timeout'))

	if (signal.aborted) return stop()

	signal.addEventListener('abort', stop, { once: true })

	work.then(resolve, reject).finally(() => signal.removeEventListener('abort', stop))
})

/**
 * Installs the transport process-wide.
 * Pure assignment: no socket, no pool, no timer, safe to re-run on every dev reload.
 */
export function configure(options: Options): void {
	if (options.transport.dev && production()) throw new Refused('invalid-config')
	configuration = options
}

/** Validates, delivers once inside the deadline, reports the outcome. Never throws. */
export async function deliver(message: Message): Promise<Outcome> {
	try {
		const current = configuration
		if (!current) throw new Refused('no-transport')

		const mail = seal(message, current)
		const receipt = await bounded(current.transport(mail), mail.signal)

		return { ok: true, id: receipt?.id || mail.id }
	} catch (error) {
		if (error instanceof Refused) return { ok: false, kind: 'refused', code: error.code, error }

		const failure = classify(error)
		return { ok: false, kind: 'undelivered', code: failure.code, retryable: failure.retryable, error: failure }
	}
}
