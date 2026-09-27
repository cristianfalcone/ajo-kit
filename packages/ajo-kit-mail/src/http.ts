import { classify } from './errors'
import type { Receipt, Transport } from './index'
import type { Sealed } from './seal'

const RESPONSE_BYTES = 65_536

/** JSON provider settings. The body mapping is the only provider-specific code an app writes. */
export interface HttpOptions {
	url: string
	/** Static headers, or a factory so a rotated token is read per send, not captured at boot. */
	headers?: Record<string, string> | (() => Record<string, string>)
	/** Builds the provider payload from the validated envelope. */
	body: (mail: Sealed) => unknown
	/** Reads the provider id from the parsed success response. */
	id?: (payload: unknown) => string | undefined
}

/**
 * Creates a provider transport over global fetch. Failure bodies are cancelled
 * unread; a success body is read only to find the provider id, and the engine
 * bounds it at 64 KiB (maxBody).
 */
export function http(options: HttpOptions): Transport {
	return async mail => {
		let response: Response

		try {
			const configured = typeof options.headers === 'function'
				? options.headers()
				: options.headers
			const headers = new Headers(configured)

			if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
			if (mail.key !== undefined) headers.set('Idempotency-Key', mail.key)

			const init: RequestInit & { maxBody: number } = {
				method: 'POST',
				headers,
				body: JSON.stringify(options.body(mail)),
				signal: mail.signal,
				maxBody: RESPONSE_BYTES,
			}
			response = await fetch(options.url, init)
		} catch (error) {
			// Engine EDNS/ECONNECT/EPROTO/EBODYLIMIT become retryable connection;
			// ETLS becomes non-retryable tls; abort reasons become retryable timeout.
			throw classify(error)
		}

		if (!response.ok) {
			await response.body?.cancel().catch(() => {})
			throw classify({ status: response.status })
		}
		if (!options.id) {
			await response.body?.cancel().catch(() => {})
			return
		}

		try {
			// Parsed inside classify's reach, so no provider text is ever echoed.
			const text = await response.text()
			const id = text ? options.id(JSON.parse(text)) : undefined
			return id === undefined ? undefined : { id } satisfies Receipt
		} catch (error) {
			throw classify(error)
		}
	}
}
