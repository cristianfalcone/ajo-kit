import { afterEach, expect, test, vi } from 'vitest'

const message = {
	to: 'person@example.com',
	subject: 'Verify your email',
	text: 'Open https://example.com/verify/single-use-token',
}

afterEach(() => {
	vi.unstubAllEnvs()
	vi.resetModules()
})

test('development delivers through a capture that logs no address or body', async () => {
	vi.stubEnv('NODE_ENV', 'development')
	const log = vi.spyOn(console, 'log').mockImplementation(() => {})
	await import('/src/mail')
	const { deliver } = await import('ajo-kit-mail')

	expect(await deliver(message)).toMatchObject({ ok: true })
	expect(log).toHaveBeenCalledTimes(1)
	expect(String(log.mock.calls[0])).not.toMatch(/person@|single-use-token/)
})

test('production leaves mail unconfigured, so delivery is refused', async () => {
	vi.stubEnv('NODE_ENV', 'production')
	await import('/src/mail')
	const { deliver } = await import('ajo-kit-mail')

	expect(await deliver(message)).toMatchObject({ ok: false, kind: 'refused', code: 'no-transport' })
})
