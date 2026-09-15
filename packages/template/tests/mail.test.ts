import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

test('development selects capture without provider credentials', async () => {
	vi.stubEnv('NODE_ENV', 'development')
	vi.stubEnv('MAIL_URL', '')
	vi.stubEnv('MAIL_TOKEN', '')
	const { mailbox } = await import('../src/mail')
	expect(mailbox?.dev).toBe(true)
})

test('production requires explicit sender and HTTPS provider instead of capture', async () => {
	vi.stubEnv('NODE_ENV', 'production')
	vi.stubEnv('MAIL_FROM', '')
	await expect(import('../src/mail')).rejects.toThrow('Missing MAIL_FROM')
	vi.resetModules()
	vi.stubEnv('MAIL_FROM', 'notes@example.test')
	vi.stubEnv('MAIL_URL', 'http://provider.example.test/send')
	await expect(import('../src/mail')).rejects.toThrow()
	vi.resetModules()
	vi.stubEnv('MAIL_URL', 'https://provider.example.test/send')
	vi.stubEnv('MAIL_TOKEN', 'local-test-only-provider-token')
	const { mailbox } = await import('../src/mail')
	expect(mailbox).toBeNull()
})
