import { Buffer } from 'node:buffer'
import { createServer, type Server, type Socket } from 'node:net'
import { inspect } from 'node:util'
import { createTransport } from 'nodemailer'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Undelivered } from '../src/errors'
import { seal, type Sealed } from '../src/seal'
import { smtp } from '../src/smtp'

vi.mock('nodemailer', { spy: true })

const PASSWORD = 'smtp-password-abc123'
const BODY = 'credential-body-xyz789'

interface Fixture {
	readonly port: number
	readonly connected: Promise<Socket>
	close(): Promise<void>
}

const fixture = async (accept: (socket: Socket) => void): Promise<Fixture> => {
	let connect!: (socket: Socket) => void
	const connected = new Promise<Socket>(resolve => {
		connect = resolve
	})
	const sockets = new Set<Socket>()
	const server: Server = createServer(socket => {
		sockets.add(socket)
		connect(socket)
		socket.once('close', () => sockets.delete(socket))
		socket.on('error', () => {})
		// A socket nobody reads from stays paused, and a paused socket never
		// emits 'end' or 'close'. Without this, a fixture whose accept() is a
		// no-op cannot observe the client hanging up -- so a test asserting the
		// connection was closed fails against an implementation that closed it.
		socket.resume()
		accept(socket)
	})

	await new Promise<void>((resolve, reject) => {
		server.listen(0, '127.0.0.1', resolve).once('error', reject)
	})

	const address = server.address()
	if (!address || typeof address === 'string') throw new Error('Expected a TCP fixture port')

	return {
		port: address.port,
		connected,
		close: async () => {
			for (const socket of sockets) socket.destroy()
			await new Promise<void>((resolve, reject) => {
				server.close(error => error ? reject(error) : resolve())
			})
		},
	}
}

const lines = (socket: Socket, receive: (line: string) => void) => {
	let pending = ''

	socket.on('data', chunk => {
		pending += chunk.toString('latin1')
		let end = pending.indexOf('\r\n')

		while (end >= 0) {
			const line = pending.slice(0, end)
			pending = pending.slice(end + 2)
			receive(line)
			end = pending.indexOf('\r\n')
		}
	})
}

const mail = (timeout = 2_000): Sealed => seal({
	to: {
		address: 'recipient@example.net',
		name: 'Recipient',
	},
	subject: 'Credential delivery',
	text: BODY,
	html: `<strong>${BODY}</strong>`,
	replyTo: 'reply@example.com',
}, {
	from: {
		address: 'sender@example.com',
		name: 'Ajo Mail',
	},
	timeout,
})

const thrown = async (work: () => Promise<unknown>) => {
	try {
		await work()
	} catch (error) {
		return error
	}

	throw new Error('Expected work to reject')
}

const waitForClose = async (socket: Socket) => {
	if (socket.destroyed) return

	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('Socket did not close')), 1_000)
		socket.once('close', () => {
			clearTimeout(timer)
			resolve()
		})
	})
}

afterEach(() => {
	// Both, and in this order. restoreAllMocks puts the real nodemailer back,
	// but it does not drain a mockReturnValueOnce that its test never consumed --
	// and a leftover one-shot makes the NEXT test inspect the previous test's
	// transport options. That is a fixture concern; it does not belong in src.
	vi.restoreAllMocks()
	vi.clearAllMocks()
})

describe('smtp option and message mapping', () => {
	test('maps mandatory STARTTLS, verified TLS and the envelope deadline into nodemailer', async () => {
		const sendMail = vi.fn().mockResolvedValue({ messageId: 'smtp-message-id' })
		const close = vi.fn()
		vi.mocked(createTransport).mockReturnValueOnce({
			sendMail,
			close,
			verify: vi.fn().mockResolvedValue(true),
		} as unknown as ReturnType<typeof createTransport>)
		const transport = smtp({
			host: 'smtp.example.com',
			user: 'smtp-user',
			pass: PASSWORD,
		})

		await expect(transport(mail())).resolves.toEqual({ id: 'smtp-message-id' })

		expect(createTransport).toHaveBeenCalledOnce()
		const options = vi.mocked(createTransport).mock.calls[0]![0] as {
			connectionTimeout?: number
			greetingTimeout?: number
			socketTimeout?: number
			dnsTimeout?: number
		}
		expect(options).toMatchObject({
			host: 'smtp.example.com',
			port: 587,
			secure: false,
			pool: false,
			requireTLS: true,
			ignoreTLS: false,
			opportunisticTLS: false,
			name: 'example.com',
			auth: {
				user: 'smtp-user',
				pass: PASSWORD,
			},
			tls: {
				rejectUnauthorized: true,
				minVersion: 'TLSv1.2',
			},
			disableFileAccess: true,
			disableUrlAccess: true,
			logger: false,
			debug: false,
			transactionLog: false,
		})
		expect(options).not.toHaveProperty('url')
		expect(options.connectionTimeout).toBeGreaterThan(0)
		expect(options.connectionTimeout).toBeLessThanOrEqual(2_000)
		expect(options.greetingTimeout).toBe(options.connectionTimeout)
		expect(options.socketTimeout).toBe(options.connectionTimeout)
		expect(options.dnsTimeout).toBe(options.connectionTimeout)
		expect(sendMail).toHaveBeenCalledWith({
			from: {
				address: 'sender@example.com',
				name: 'Ajo Mail',
			},
			to: {
				address: 'recipient@example.net',
				name: 'Recipient',
			},
			replyTo: {
				address: 'reply@example.com',
			},
			subject: 'Credential delivery',
			text: BODY,
			html: `<strong>${BODY}</strong>`,
			envelope: {
				from: 'sender@example.com',
				to: ['recipient@example.net'],
			},
			disableFileAccess: true,
			disableUrlAccess: true,
		})
		expect(close).toHaveBeenCalledOnce()
		expect(transport.label).toBe('smtp')
	})

	test('uses implicit TLS only when explicitly requested', async () => {
		const close = vi.fn()
		vi.mocked(createTransport).mockReturnValueOnce({
			sendMail: vi.fn().mockResolvedValue({ messageId: 'implicit-id' }),
			close,
			verify: vi.fn().mockResolvedValue(true),
		} as unknown as ReturnType<typeof createTransport>)

		await smtp({
			host: 'smtp.example.com',
			port: 465,
			implicit: true,
		})(mail())

		expect(vi.mocked(createTransport).mock.calls[0]![0]).toMatchObject({
			port: 465,
			secure: true,
			requireTLS: false,
			ignoreTLS: false,
			opportunisticTLS: false,
		})
		expect(close).toHaveBeenCalledOnce()
	})

	test('verifies credentials with the same TLS policy and closes in finally', async () => {
		const verify = vi.fn().mockResolvedValue(true)
		const close = vi.fn()
		vi.mocked(createTransport).mockReturnValueOnce({
			sendMail: vi.fn(),
			close,
			verify,
		} as unknown as ReturnType<typeof createTransport>)
		const transport = smtp({
			host: 'smtp.example.com',
			name: 'mail.example.com',
			user: 'smtp-user',
			pass: PASSWORD,
		})

		await expect(transport.verify!(new AbortController().signal)).resolves.toBeUndefined()

		expect(vi.mocked(createTransport).mock.calls[0]![0]).toMatchObject({
			secure: false,
			requireTLS: true,
			ignoreTLS: false,
			opportunisticTLS: false,
			name: 'mail.example.com',
			tls: {
				rejectUnauthorized: true,
				minVersion: 'TLSv1.2',
			},
		})
		expect(verify).toHaveBeenCalledOnce()
		expect(close).toHaveBeenCalledOnce()
	})
})

describe('smtp STARTTLS barrier', () => {
	test('refuses an EHLO response without STARTTLS before AUTH, MAIL or body data', async () => {
		const commands: string[] = []
		const server = await fixture(socket => {
			socket.write('220 fixture ESMTP\r\n')
			lines(socket, line => {
				commands.push(line)
				if (line.startsWith('EHLO ')) {
					socket.write('250-fixture\r\n250 AUTH PLAIN\r\n')
				} else if (line === 'STARTTLS') {
					socket.write('454 TLS unavailable\r\n')
				} else if (line.startsWith('AUTH ')) {
					socket.write('535 Authentication failed\r\n')
				} else {
					socket.write('250 OK\r\n')
				}
			})
		})

		try {
			const error = await thrown(() => smtp({
				host: '127.0.0.1',
				port: server.port,
				user: 'smtp-user',
				pass: PASSWORD,
			})(mail()))

			expect(error).toMatchObject({
				code: 'tls',
				retryable: false,
			})
			expect(commands.some(command => command.startsWith('EHLO example.com'))).toBe(true)
			expect(commands).toContain('STARTTLS')
			expect(commands.some(command => command.startsWith('AUTH '))).toBe(false)
			expect(commands.some(command => command.startsWith('MAIL FROM:'))).toBe(false)
			expect(commands.join('\n')).not.toContain(PASSWORD)
			expect(commands.join('\n')).not.toContain(BODY)
		} finally {
			await server.close()
		}
	})

	test('writes no credential or message data while the TLS handshake is incomplete', async () => {
		const commands: string[] = []
		const handshake: Buffer[] = []
		let upgrading = false
		let sawHandshake!: () => void
		const receivedHandshake = new Promise<void>(resolve => {
			sawHandshake = resolve
		})
		const server = await fixture(socket => {
			socket.write('220 fixture ESMTP\r\n')
			let pending = ''

			socket.on('data', chunk => {
				if (upgrading) {
					handshake.push(Buffer.from(chunk))
					sawHandshake()
					socket.destroy()
					return
				}

				pending += chunk.toString('latin1')
				let end = pending.indexOf('\r\n')

				while (end >= 0) {
					const line = pending.slice(0, end)
					pending = pending.slice(end + 2)
					commands.push(line)
					if (line.startsWith('EHLO ')) {
						socket.write('250-fixture\r\n250-STARTTLS\r\n250 AUTH PLAIN\r\n')
					} else if (line === 'STARTTLS') {
						upgrading = true
						socket.write('220 Ready to start TLS\r\n')
					}
					end = pending.indexOf('\r\n')
				}
			})
		})

		try {
			const delivery = thrown(() => smtp({
				host: '127.0.0.1',
				port: server.port,
				user: 'smtp-user',
				pass: PASSWORD,
			})(mail()))

			await receivedHandshake
			const error = await delivery
			const bytes = Buffer.concat(handshake).toString('latin1')

			expect(error).toMatchObject({
				code: 'tls',
				retryable: false,
			})
			expect(commands).toEqual([
				'EHLO example.com',
				'STARTTLS',
			])
			expect(bytes).not.toContain('AUTH ')
			expect(bytes).not.toContain('MAIL FROM:')
			expect(bytes).not.toContain('RCPT TO:')
			expect(bytes).not.toContain(PASSWORD)
			expect(bytes).not.toContain(BODY)
		} finally {
			await server.close()
		}
	})
})

describe('smtp failure mapping and cleanup', () => {
	test('maps SMTP 421 to a retryable throttled failure', async () => {
		const server = await fixture(socket => {
			socket.write('421 Service unavailable\r\n')
		})

		try {
			const delivery = smtp({
				host: '127.0.0.1',
				port: server.port,
			})(mail())
			const socket = await server.connected
			const error = await thrown(() => delivery)

			expect(error).toMatchObject({
				code: 'throttled',
				retryable: true,
				hint: 'smtp 421',
			})
			await waitForClose(socket)
		} finally {
			await server.close()
		}
	})

	test.each([
		{
			label: '550 at RCPT',
			provider: { code: 'EENVELOPE', responseCode: 550 },
			code: 'rejected',
			retryable: false,
			hint: 'smtp 550',
		},
		{
			label: '535 during authentication',
			provider: { code: 'EAUTH', responseCode: 535 },
			code: 'auth',
			retryable: false,
			hint: 'smtp 535',
		},
	])('maps $label and closes in finally', async ({ provider, code, retryable, hint }) => {
		const close = vi.fn()
		vi.mocked(createTransport).mockReturnValueOnce({
			sendMail: vi.fn().mockRejectedValue(provider),
			close,
			verify: vi.fn().mockResolvedValue(true),
		} as unknown as ReturnType<typeof createTransport>)

		const error = await thrown(() => smtp({
			host: 'smtp.example.com',
		})(mail()))

		expect(error).toMatchObject({ code, retryable, hint })
		expect(close).toHaveBeenCalledOnce()
	})

	test('maps a stalled socket to timeout and closes the connection', async () => {
		const server = await fixture(() => {})

		try {
			const delivery = smtp({
				host: '127.0.0.1',
				port: server.port,
				implicit: true,
			})(mail(100))
			const socket = await server.connected
			const error = await thrown(() => delivery)

			expect(error).toMatchObject({
				code: 'timeout',
				retryable: true,
			})
			await waitForClose(socket)
		} finally {
			await server.close()
		}
	})

	test('closes in finally when the envelope signal aborts pending work', async () => {
		const close = vi.fn()
		vi.mocked(createTransport).mockReturnValueOnce({
			sendMail: vi.fn().mockReturnValue(new Promise(() => {})),
			close,
			verify: vi.fn().mockResolvedValue(true),
		} as unknown as ReturnType<typeof createTransport>)

		const error = await thrown(() => smtp({
			host: 'smtp.example.com',
		})(mail(30)))

		expect(error).toMatchObject({
			code: 'timeout',
			retryable: true,
		})
		expect(close).toHaveBeenCalledOnce()
	})

	test('destroys password-bearing provider prose without logging it', async () => {
		const provider = Object.assign(new Error(`authentication failed for ${PASSWORD}`), {
			code: 'EAUTH',
			responseCode: 535,
			response: `535 ${PASSWORD}`,
			envelope: {
				from: 'sender@example.com',
				to: ['recipient@example.net'],
			},
		})
		provider.stack = `Error: ${PASSWORD}\n at provider`
		const close = vi.fn()
		vi.mocked(createTransport).mockReturnValueOnce({
			sendMail: vi.fn().mockRejectedValue(provider),
			close,
			verify: vi.fn().mockResolvedValue(true),
		} as unknown as ReturnType<typeof createTransport>)
		const logs = [
			vi.spyOn(console, 'debug').mockImplementation(() => {}),
			vi.spyOn(console, 'error').mockImplementation(() => {}),
			vi.spyOn(console, 'info').mockImplementation(() => {}),
			vi.spyOn(console, 'log').mockImplementation(() => {}),
			vi.spyOn(console, 'warn').mockImplementation(() => {}),
		]

		const error = await thrown(() => smtp({
			host: 'smtp.example.com',
			user: 'smtp-user',
			pass: PASSWORD,
		})(mail()))
		const rendered = [
			inspect(error, { depth: 8 }),
			JSON.stringify(error),
			error instanceof Error ? error.stack ?? '' : '',
		]

		expect(error).toBeInstanceOf(Undelivered)
		expect(error).toMatchObject({
			code: 'auth',
			retryable: false,
			hint: 'smtp 535',
		})
		expect(rendered.every(value => !value.includes(PASSWORD))).toBe(true)
		expect(logs.every(log => log.mock.calls.every(call => !inspect(call).includes(PASSWORD)))).toBe(true)
		expect(logs.every(log => log.mock.calls.length === 0)).toBe(true)
		expect(close).toHaveBeenCalledOnce()
	})
})
