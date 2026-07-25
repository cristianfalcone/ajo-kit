import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type {
	Delivery,
	Message,
	Transport,
} from '../src/index'

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

describe('ajo-kit-mail runtime deadlines and admission', () => {
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

	test('keeps a third send waiting and reports busy when its deadline passes', async () => {
		const core = await fresh()
		const releases: (() => void)[] = []
		const transport: Transport = () => new Promise<void>(resolve => {
			releases.push(resolve)
		})

		core.configure({
			from: 'sender@example.com',
			transport,
			timeout: 200,
			concurrency: 2,
		})

		const first = core.deliver(message({ key: 'first' }))
		const second = core.deliver(message({ key: 'second' }))

		await vi.advanceTimersByTimeAsync(0)
		expect(releases).toHaveLength(2)

		const third = core.deliver(message({
			key: 'third',
			expires: Date.now() + 50,
		}))

		await vi.advanceTimersByTimeAsync(49)
		expect(releases).toHaveLength(2)

		await vi.advanceTimersByTimeAsync(1)
		await expect(third).resolves.toMatchObject({
			ok: false,
			kind: 'undelivered',
			code: 'busy',
			retryable: true,
		})
		expect(releases).toHaveLength(2)

		for (const release of releases) release()

		await expect(first).resolves.toMatchObject({ ok: true })
		await expect(second).resolves.toMatchObject({ ok: true })
	})
})

describe('ajo-kit-mail runtime outcomes', () => {
	test('isolates an observer that throws from a successful send', async () => {
		const core = await fresh()
		const { capture } = await import('../src/capture')
		const mailbox = capture()
		const observe = vi.fn((_delivery: Delivery) => {
			throw new Error('observer failed')
		})

		core.configure({
			from: 'sender@example.com',
			transport: mailbox,
			observe,
		})

		const outcome = await core.deliver(message())

		expect(outcome).toMatchObject({
			ok: true,
			transport: 'capture',
		})
		expect(observe).toHaveBeenCalledOnce()
		expect(mailbox.messages).toHaveLength(1)

		const event = observe.mock.calls[0][0]
		expect(event).toMatchObject({
			kind: 'reset',
			transport: 'capture',
			outcome: 'sent',
			domain: 'example.com',
			ms: 0,
		})
		expect(event).not.toHaveProperty('to')
		expect(event).not.toHaveProperty('subject')
		expect(event).not.toHaveProperty('text')
	})

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
		const mailbox = capture()
		const events: Delivery[] = []
		core.configure({
			from: 'sender@example.com',
			transport: mailbox,
			observe: delivery => events.push(delivery),
		})

		await expect(core.deliver(message({
			to: 'invalid recipient',
		}))).resolves.toMatchObject({
			ok: false,
			kind: 'refused',
			code: 'invalid-recipient',
		})

		mailbox.fail('connection')
		await expect(core.deliver(message())).resolves.toMatchObject({
			ok: false,
			kind: 'undelivered',
			code: 'connection',
			retryable: true,
		})

		await expect(core.deliver(message())).resolves.toMatchObject({
			ok: true,
			transport: 'capture',
		})
		expect(events).toMatchObject([
			{
				outcome: 'refused',
				code: 'invalid-recipient',
				domain: undefined,
			},
			{
				outcome: 'undelivered',
				code: 'connection',
				retryable: true,
				domain: 'example.com',
			},
			{
				outcome: 'sent',
				domain: 'example.com',
			},
		])

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
		expect(log).toHaveBeenCalledWith('[mail] refused: no-transport')
	})

	test('send throws typed failures and adapts configured delivery into the ajo-kit seam', async () => {
		const core = await fresh()
		const { capture } = await import('../src/capture')
		const mailbox = capture()

		core.configure({
			from: 'sender@example.com',
			transport: mailbox,
		})

		const id = await core.send(message())
		expect(id).toBe(mailbox.last()?.id)

		const seam = await import('ajo-kit/mail')
		await seam.send({
			to: 'second@example.com',
			subject: 'Welcome',
			text: 'Hello',
		})
		expect(mailbox.last()?.to.address).toBe('second@example.com')

		mailbox.fail('rejected')
		await expect(core.send(message())).rejects.toMatchObject({
			name: 'Undelivered',
			code: 'rejected',
			retryable: false,
		})
	})

	test('probe verifies only when supported and bounds a stalled check', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const core = await fresh()

		await expect(core.probe()).resolves.toMatchObject({
			ok: false,
			error: {
				name: 'Refused',
				code: 'no-transport',
			},
		})

		const verify = vi.fn(() => new Promise<void>(() => {}))
		const transport = Object.assign(
			(async () => {}) satisfies Transport,
			{ verify },
		)

		core.configure({
			from: 'sender@example.com',
			transport,
			timeout: 75,
		})

		const pending = core.probe()
		await vi.advanceTimersByTimeAsync(75)
		await expect(pending).resolves.toMatchObject({
			ok: false,
			error: {
				name: 'Undelivered',
				code: 'timeout',
				retryable: true,
			},
		})
		expect(verify).toHaveBeenCalledOnce()

		const { capture } = await import('../src/capture')
		core.configure({
			from: 'sender@example.com',
			transport: capture(),
		})
		await expect(core.probe()).resolves.toEqual({ ok: true })
		expect(log).toHaveBeenCalledWith('[mail] refused: no-transport')
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
	})

	test('injects a bounded number of failures and clear resets all capture state', async () => {
		const core = await fresh()
		const { capture } = await import('../src/capture')
		const mailbox = capture()

		core.configure({
			from: 'sender@example.com',
			transport: mailbox,
		})
		mailbox.fail('unavailable', 2)

		await expect(core.deliver(message())).resolves.toMatchObject({
			ok: false,
			code: 'unavailable',
		})
		await expect(core.deliver(message())).resolves.toMatchObject({
			ok: false,
			code: 'unavailable',
		})
		await expect(core.deliver(message())).resolves.toMatchObject({ ok: true })

		mailbox.fail('connection')
		mailbox.clear()
		await expect(core.deliver(message())).resolves.toMatchObject({ ok: true })
		expect(mailbox.messages).toHaveLength(1)
	})
})
