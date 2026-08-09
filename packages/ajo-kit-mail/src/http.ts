import { classify } from './errors'
import type { Receipt, Transport } from './index'
import type { Sealed } from './seal'

const RESPONSE_BYTES = 65_536

const exceeded = () => Object.assign(
	new TypeError(`Mail provider response exceeds ${RESPONSE_BYTES} bytes`),
	{ code: 'EBODYLIMIT' },
)

const streamed = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> => {
	const reader = stream.getReader()
	const bytes = new Uint8Array(RESPONSE_BYTES)
	let size = 0
	let complete = false

	try {
		while (true) {
			const chunk = await reader.read()
			if (chunk.done) {
				complete = true
				break
			}

			if (chunk.value.byteLength > RESPONSE_BYTES - size) throw exceeded()
			bytes.set(chunk.value, size)
			size += chunk.value.byteLength
		}
	} finally {
		if (complete) {
			reader.releaseLock()
		} else {
			await reader.cancel().catch(() => {})
		}
	}

	return bytes.subarray(0, size)
}

const bounded = async (response: Response): Promise<Uint8Array> => {
	const declared = response.headers.get('Content-Length')
	if (declared !== null && /^\d+$/.test(declared) && Number(declared) > RESPONSE_BYTES) {
		await response.body?.cancel().catch(() => {})
		throw exceeded()
	}

	// Node fetch exposes a Web stream but ignores maxBody. The ajo Response has
	// no .body: its fetch has already enforced maxBody before arrayBuffer().
	if (response.body) return streamed(response.body)

	const bytes = new Uint8Array(await response.arrayBuffer())
	if (bytes.byteLength > RESPONSE_BYTES) throw exceeded()
	return bytes
}

const payload = async (response: Response): Promise<unknown> => {
	const bytes = await bounded(response)
	if (!bytes.byteLength) return
	return JSON.parse(new TextDecoder().decode(bytes))
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
 * cancelled unread on Node; successful bodies over 64 KiB fail as a retryable
 * connection error on both hosts.
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
