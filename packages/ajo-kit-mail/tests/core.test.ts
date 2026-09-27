import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Message, Transport } from '../src/index'

const now = new Date('2026-07-25T12:00:00.000Z')
const environment = process.env.NODE_ENV

const message = (overrides: Partial<Message> = {}): Message => ({
	to: 'recipient@example.com',
	subject: 'Reset your password',
	text: 'Reset at https://example.com/reset/single-use-token',
	kind: 'reset',
	...overrides,
})

const fresh = async () => {
	vi.resetModules()
	return import('../src/index')
}

const restoreEnvironment = () => {
	if (environment === undefined) delete process.env.NODE_ENV
	else process.env.NODE_ENV = environment
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(now)
	vi.spyOn(AbortSignal, 'timeout').mockImplementation(delay => {
		const controller = new AbortController()
		setTimeout(() => controller.abort(), delay)
		return controller.signal
	})
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
	restoreEnvironment()
	vi.resetModules()
})

describe('ajo-kit-mail runtime deadline', () => {
	test('settles a transport that never resolves with a retryable timeout', async () => {
		const core = await fresh()
		const stalled: Transport = () => new Promise(() => {})

		core.configure({
			from: 'sender@example.com',
			transport: stalled,
			timeout: 100,
		})

		let settled = false
		const pending = core.deliver(message()).then(outcome => {
			settled = true
			return outcome
		})

		await vi.advanceTimersByTimeAsync(99)
		expect(settled).toBe(false)

		await vi.advanceTimersByTimeAsync(1)
		const outcome = await pending

		expect(settled).toBe(true)
		expect(outcome).toMatchObject({
			ok: false,
			kind: 'undelivered',
			code: 'timeout',
			retryable: true,
		})
	})
})

describe('ajo-kit-mail runtime outcomes', () => {
	test('refuses a development-only transport when production is true', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const core = await fresh()
		const { capture } = await import('../src/capture')

		expect(() => core.configure({
			from: 'sender@example.com',
			transport: capture(),
		})).toThrow(core.Refused)
		expect(log).toHaveBeenCalledWith('[mail] refused: invalid-config')

		expect(() => core.configure({
			from: 'sender@example.com',
			transport: async () => {},
		})).not.toThrow()
	})

	test('deliver never throws for absent configuration, refusal, failure, or success', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const core = await fresh()
		const absent = await core.deliver(message())

		expect(absent).toMatchObject({
			ok: false,
			kind: 'refused',
			code: 'no-transport',
		})

		const { capture } = await import('../src/capture')
		core.configure({
			from: 'sender@example.com',
			transport: capture(),
		})

		await expect(core.deliver(message({
			to: 'invalid recipient',
		}))).resolves.toMatchObject({
			ok: false,
			kind: 'refused',
			code: 'invalid-recipient',
		})

		await expect(core.deliver(message())).resolves.toMatchObject({ ok: true })

		const provider: Transport = async () => {
			throw {
				status: 429,
				message: 'single-use-token',
				response: 'recipient@example.com rejected',
			}
		}
		core.configure({
			from: 'sender@example.com',
			transport: provider,
		})

		await expect(core.deliver(message())).resolves.toMatchObject({
			ok: false,
			kind: 'undelivered',
			code: 'throttled',
			retryable: true,
		})

		core.configure({
			from: 'sender@example.com',
			transport: () => {
				throw new Error('synchronous failure')
			},
		})

		await expect(core.deliver(message())).resolves.toMatchObject({
			ok: false,
			kind: 'undelivered',
			code: 'unknown',
			retryable: false,
		})
		expect(log).toHaveBeenCalledWith('[mail] refused: no-transport')
	})

	test('resolves the transport id, else the envelope id', async () => {
		const core = await fresh()
		const { capture } = await import('../src/capture')
		const mailbox = capture()

		core.configure({
			from: 'sender@example.com',
			transport: mailbox,
		})

		await expect(core.deliver(message())).resolves.toEqual({ ok: true, id: mailbox.last()?.id })

		core.configure({
			from: 'sender@example.com',
			transport: async () => ({ id: 'provider-42' }),
		})

		await expect(core.deliver(message())).resolves.toEqual({ ok: true, id: 'provider-42' })

		let envelope = ''
		core.configure({
			from: 'sender@example.com',
			transport: async mail => {
				envelope = mail.id
			},
		})

		const outcome = await core.deliver(message())
		expect(outcome).toEqual({ ok: true, id: envelope })
		expect(envelope).not.toBe('')
	})

	test('carries the transport failure, hint included, to the caller', async () => {
		const core = await fresh()
		const failure = new core.Undelivered('throttled', 'smtp 451')

		core.configure({
			from: 'sender@example.com',
			transport: async () => {
				throw failure
			},
		})

		const outcome = await core.deliver(message())

		expect(outcome).toMatchObject({
			ok: false,
			kind: 'undelivered',
			code: 'throttled',
			retryable: true,
		})
		expect(outcome.ok || outcome.error).toBe(failure)
		expect(outcome.ok || outcome.error).toMatchObject({ hint: 'smtp 451' })
	})
})

describe('ajo-kit-mail capture transport', () => {
	test('drops the oldest envelope past its bound and returns retained links', async () => {
		const core = await fresh()
		const { capture } = await import('../src/capture')
		const mailbox = capture({ keep: 2 })

		core.configure({
			from: 'sender@example.com',
			transport: mailbox,
		})

		const first = await core.deliver(message({
			text: 'First https://example.com/first',
		}))
		const second = await core.deliver(message({
			text: 'Second https://example.com/docs',
		}))
		const third = await core.deliver(message({
			text: 'Docs https://example.com/docs reset https://example.com/reset/final-token',
		}))

		expect(first.ok).toBe(true)
		expect(second.ok).toBe(true)
		expect(third.ok).toBe(true)
		expect(mailbox.messages.map(mail => mail.id)).toEqual([
			second.ok ? second.id : '',
			third.ok ? third.id : '',
		])
		expect(mailbox.link()).toBe('https://example.com/docs')
		expect(mailbox.link(/\/reset\//)).toBe('https://example.com/reset/final-token')
		expect(mailbox.link(/\/reset\//g)).toBe('https://example.com/reset/final-token')

		mailbox.clear()
		expect(mailbox.messages).toHaveLength(0)
		expect(mailbox.last()).toBeUndefined()
	})

	test('logs id, kind and recipient domain only', async () => {
		const core = await fresh()
		const { capture } = await import('../src/capture')
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		core.configure({
			from: 'sender@example.com',
			transport: capture({ log: true }),
		})

		const outcome = await core.deliver(message())

		expect(log).toHaveBeenCalledWith(`[mail] ${outcome.ok ? outcome.id : ''} reset @example.com sent`)
	})
})
