import { classify } from './errors'
import type { Receipt, Transport } from './index'
import type { Sealed } from './seal'

const RESPONSE_BYTES = 65_536

const payload = async (response: Response): Promise<unknown> => {
	if (!response.body) return

	const reader = response.body.getReader()
	const bytes = new Uint8Array(RESPONSE_BYTES)
	let size = 0
	let complete = false

	try {
		while (size < RESPONSE_BYTES) {
			const chunk = await reader.read()
			if (chunk.done) {
				complete = true
				break
			}

			const length = Math.min(chunk.value.byteLength, RESPONSE_BYTES - size)
			bytes.set(chunk.value.subarray(0, length), size)
			size += length
		}
	} finally {
		if (complete) {
			reader.releaseLock()
		} else {
			await reader.cancel().catch(() => {})
		}
	}

	if (!size) return
	return JSON.parse(new TextDecoder().decode(bytes.subarray(0, size)))
}

/** JSON provider settings. The body mapping is the only provider-specific code an app writes. */
export interface HttpOptions {
	url: string
	/** Static headers, or a factory so a rotated token is read per send, not captured at boot. */
	headers?: Record<string, string> | (() => Record<string, string>)
	/** Builds the provider payload from the validated envelope. */
	body: (mail: Sealed) => unknown
	/** Reads the provider id from the parsed success response. */
	id?: (payload: unknown) => string | undefined
	/** Reported in delivery events. Default 'http'. */
	label?: string
}

/**
 * Creates a provider transport over global fetch. Non-success bodies are
 * cancelled unread, while success bodies are retained only up to 64 KiB.
 */
export function http(options: HttpOptions): Transport {
	const transport: Transport = async mail => {
		let response: Response

		try {
			const configured = typeof options.headers === 'function'
				? options.headers()
				: options.headers
			const headers = new Headers(configured)

			if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
			headers.delete('Idempotency-Key')
			if (mail.key !== undefined) headers.set('Idempotency-Key', mail.key)

			response = await fetch(options.url, {
				method: 'POST',
				headers,
				body: JSON.stringify(options.body(mail)),
				signal: mail.signal,
			})
		} catch (error) {
			throw classify(error)
		}

		if (!response.ok) {
			await response.body?.cancel().catch(() => {})
			throw classify({ status: response.status })
		}

		try {
			const result = await payload(response)
			const id = options.id?.(result)

			return id === undefined ? undefined : { id } satisfies Receipt
		} catch (error) {
			throw classify(error)
		}
	}

	return Object.assign(transport, {
		label: options.label ?? 'http',
	})
}
