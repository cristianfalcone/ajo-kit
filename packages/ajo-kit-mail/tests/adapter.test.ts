import { describe, expect, test, vi } from 'vitest'
import type { Mail } from 'ajo-kit/mail'
import {
	adapter,
	Refused,
	Undelivered,
	type Sealed,
	type Transport,
} from '../src/index'

const message = (overrides: Partial<Mail> = {}): Mail => ({
	to: 'recipient@example.com',
	subject: 'Welcome',
	text: 'Hello from Ajo',
	...overrides,
})

const sender = 'sender@example.com'

describe('ajo-kit mail adapter', () => {
	test('delivers a plain Mail as a sealed envelope', async () => {
		const received: Sealed[] = []
		const transport: Transport = async mail => {
			received.push(mail)
			return { id: 'provider-id' }
		}
		const send = adapter({ from: sender, transport })

		await expect(send(message())).resolves.toBeUndefined()

		expect(received).toHaveLength(1)
		expect(received[0]).toMatchObject({
			kind: 'mail',
			from: { address: sender },
			to: { address: 'recipient@example.com' },
			subject: 'Welcome',
			text: 'Hello from Ajo',
		})
		expect(received[0]).not.toHaveProperty('html')
		expect(Object.isFrozen(received[0])).toBe(true)
	})

	test('preserves html presence and absence', async () => {
		const received: Sealed[] = []
		const transport: Transport = async mail => {
			received.push(mail)
		}
		const send = adapter({ from: sender, transport })

		await send(message({ html: '<p>Hello from Ajo</p>' }))
		await send(message())

		expect(received[0]?.html).toBe('<p>Hello from Ajo</p>')
		expect(received[1]).not.toHaveProperty('html')
	})

	test('throws a typed refusal for an invalid recipient', async () => {
		const transport: Transport = vi.fn(async () => {})
		const send = adapter({ from: sender, transport })
		let error: unknown

		try {
			await send(message({ to: 'invalid recipient' }))
		} catch (value) {
			error = value
		}

		expect(error).toBeInstanceOf(Refused)
		expect(error).toMatchObject({
			name: 'Refused',
			code: 'invalid-recipient',
		})
		expect(transport).not.toHaveBeenCalled()
	})

	test('throws a typed delivery failure instead of resolving', async () => {
		const transport: Transport = async () => {
			throw { code: 'ECONNRESET' }
		}
		const send = adapter({ from: sender, transport })

		await expect(send(message())).rejects.toMatchObject({
			name: 'Undelivered',
			code: 'connection',
			retryable: true,
		})
	})

	test('does not expose body or credential prose in a thrown error message', async () => {
		const body = 'body-reset-token'
		const credential = 'smtp-password'
		const transport: Transport = async () => {
			throw {
				code: 'EAUTH',
				message: `${body} ${credential}`,
			}
		}
		const send = adapter({ from: sender, transport })
		let error: unknown

		try {
			await send(message({ text: body }))
		} catch (value) {
			error = value
		}

		expect(error).toBeInstanceOf(Undelivered)
		expect((error as Error).message).toBe('Mail delivery failed: auth')
		expect((error as Error).message).not.toContain(body)
		expect((error as Error).message).not.toContain(credential)
	})
})
