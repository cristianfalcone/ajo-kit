import { afterEach, describe, expect, test, vi } from 'vitest'

const mail = {
	to: 'person@example.com',
	subject: 'Reset your password',
	text: 'Reset at https://example.com/reset/single-use-secret',
}

afterEach(() => {
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
	vi.resetModules()
})

describe('ajo-kit mail', () => {
	test('default transport omits the body outside production and refuses production sends', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const { send } = await import('../src/mail/index')

		await send(mail)

		const output = log.mock.calls.flat().join(' ')

		expect(output).toContain(mail.to)
		expect(output).toContain(mail.subject)
		expect(output).toContain('No mail transport configured')
		expect(output).not.toContain(mail.text)
		expect(output).not.toContain('single-use-secret')

		vi.resetModules()
		vi.stubEnv('NODE_ENV', 'production')
		log.mockClear()
		const production = await import('../src/mail/index')

		await expect(production.send(mail)).rejects.toThrow('Call configure()')
		expect(log).not.toHaveBeenCalled()
	})
})
