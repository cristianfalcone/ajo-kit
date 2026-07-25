import { Buffer } from 'node:buffer'
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, test } from 'vitest'
import { http } from '../src/http'
import { seal, type Message } from '../src/seal'

const RESPONSE_BYTES = 65_536

const message = (overrides: Partial<Message> = {}, timeout = 2_000) => seal({
	to: 'recipient@example.com',
	subject: 'Reset your password',
	text: 'Use https://example.com/reset/token-secret',
	...overrides,
}, {
	from: {
		address: 'sender@example.com',
		name: 'Ajo Mail',
	},
	timeout,
})

const requestBody = async (request: IncomingMessage) => {
	const chunks: Buffer[] = []

	for await (const chunk of request) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
	}

	return Buffer.concat(chunks).toString('utf8')
}

const withServer = async <T>(
	handler: (request: IncomingMessage, response: ServerResponse) => void,
	work: (url: string) => Promise<T>,
) => {
	const server = createServer(handler)

	await new Promise<void>((resolve, reject) => {
		server.listen(0, '127.0.0.1', resolve).once('error', reject)
	})

	const address = server.address()
	if (!address || typeof address === 'string') throw new Error('Expected TCP test port')

	try {
		return await work(`http://127.0.0.1:${(address as AddressInfo).port}`)
	} finally {
		await new Promise<void>((resolve, reject) => {
			server.close(error => error ? reject(error) : resolve())
			server.closeAllConnections()
		})
	}
}

describe('ajo-kit-mail HTTP transport', () => {
	test('posts mapped JSON with fresh headers and returns the provider id', async () => {
		let authorization = 'Bearer old'
		let received!: {
			authorization: string | undefined
			contentType: string | undefined
			body: string
		}
		let resolveRequest!: () => void
		const request = new Promise<void>(resolve => {
			resolveRequest = resolve
		})

		await withServer((incoming, response) => {
			void requestBody(incoming).then(body => {
				received = {
					authorization: incoming.headers.authorization,
					contentType: incoming.headers['content-type'],
					body,
				}
				response.writeHead(200, { 'Content-Type': 'application/json' })
				response.end('{"MessageID":"provider-42"}')
				resolveRequest()
			})
		}, async url => {
			const transport = http({
				url,
				headers: () => ({ Authorization: authorization }),
				body: mail => ({
					from: mail.from.address,
					to: mail.to.address,
					subject: mail.subject,
					text: mail.text,
				}),
				id: result => (result as { MessageID?: string }).MessageID,
			})
			authorization = 'Bearer rotated'

			await expect(transport(message())).resolves.toEqual({ id: 'provider-42' })
			await request
			expect(transport.label).toBe('http')
		})

		expect(received).toEqual({
			authorization: 'Bearer rotated',
			contentType: 'application/json',
			body: JSON.stringify({
				from: 'sender@example.com',
				to: 'recipient@example.com',
				subject: 'Reset your password',
				text: 'Use https://example.com/reset/token-secret',
			}),
		})
	})

	test('forwards Idempotency-Key only from an envelope that has one', async () => {
		const keys: (string | undefined)[] = []

		await withServer((request, response) => {
			request.resume()
			keys.push(request.headers['idempotency-key'] as string | undefined)
			response.writeHead(204)
			response.end()
		}, async url => {
			const transport = http({
				url,
				headers: { 'Idempotency-Key': 'static-config-must-not-leak' },
				body: mail => ({ id: mail.id }),
			})

			await transport(message())
			await transport(message({ key: 'reset:123' }))
		})

		expect(keys).toEqual([undefined, 'reset:123'])
	})

	test.each([
		{ status: 401, code: 'auth', retryable: false, hint: 'status 401' },
		{ status: 429, code: 'throttled', retryable: true, hint: 'status 429' },
		{ status: 503, code: 'unavailable', retryable: true, hint: 'status 503' },
		{ status: 400, code: 'rejected', retryable: false, hint: 'status 400' },
		{ status: 408, code: 'timeout', retryable: true, hint: undefined },
	])('classifies HTTP $status as $code', async ({ status, code, retryable, hint }) => {
		await withServer((request, response) => {
			request.resume()
			response.writeHead(status)
			response.end()
		}, async url => {
			const transport = http({
				url,
				body: mail => ({ id: mail.id }),
			})

			await expect(transport(message())).rejects.toMatchObject({
				status: 502,
				code,
				retryable,
				...(hint && { hint }),
			})
		})
	})

	test('closes a non-2xx socket before the server emits any response body', async () => {
		let resolveClosed!: () => void
		let rejectClosed!: (error: unknown) => void
		const closed = new Promise<void>((resolve, reject) => {
			resolveClosed = resolve
			rejectClosed = reject
		})

		await withServer((request, response) => {
			request.resume()
			let bodyWritten = false
			const timer = setTimeout(() => {
				bodyWritten = true
				response.end('recipient@example.com token-secret')
			}, 250)

			response.writeHead(401, { 'Content-Type': 'text/plain' })
			response.flushHeaders()
			response.once('close', () => {
				clearTimeout(timer)

				try {
					expect(bodyWritten).toBe(false)
					expect(request.socket.destroyed).toBe(true)
					resolveClosed()
				} catch (error) {
					rejectClosed(error)
				}
			})
		}, async url => {
			const transport = http({
				url,
				body: mail => ({ id: mail.id }),
			})

			await expect(transport(message())).rejects.toMatchObject({
				code: 'auth',
				hint: 'status 401',
			})
			await closed
		})
	})

	test('parses only the first 64 KiB of a one MiB success response', async () => {
		const document = JSON.stringify({ id: 'bounded' })
		const first = document + ' '.repeat(RESPONSE_BYTES - Buffer.byteLength(document))
		const rest = 'not-json'.repeat(Math.ceil((1_048_576 - RESPONSE_BYTES) / 8))
			.slice(0, 1_048_576 - RESPONSE_BYTES)

		expect(Buffer.byteLength(first) + Buffer.byteLength(rest)).toBe(1_048_576)

		await withServer((request, response) => {
			request.resume()
			response.writeHead(200, { 'Content-Type': 'application/json' })
			response.end(first + rest)
		}, async url => {
			const transport = http({
				url,
				body: mail => ({ id: mail.id }),
				id: result => (result as { id?: string }).id,
			})

			await expect(transport(message())).resolves.toEqual({ id: 'bounded' })
		})
	})

	test('passes the envelope AbortSignal to fetch', async () => {
		let resolveClosed!: () => void
		const closed = new Promise<void>(resolve => {
			resolveClosed = resolve
		})

		await withServer((request) => {
			request.resume()
			request.socket.once('close', resolveClosed)
		}, async url => {
			const transport = http({
				url,
				body: mail => ({ id: mail.id }),
			})

			await expect(transport(message({}, 50))).rejects.toMatchObject({
				code: 'timeout',
				retryable: true,
			})
			await closed
		})
	})
})
