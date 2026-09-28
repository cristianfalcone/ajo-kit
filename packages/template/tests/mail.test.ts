import { afterEach, expect, test, vi } from 'vitest'
import { start } from './server'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

test('development selects capture without provider credentials', async () => {
	vi.stubEnv('NODE_ENV', 'development')
	vi.stubEnv('MAIL_URL', '')
	vi.stubEnv('MAIL_TOKEN', '')
	const { mailbox } = await import('../src/mail')
	expect(mailbox?.dev).toBe(true)
})

test('production without any MAIL_* value starts with mail off and refuses every send', async () => {
	vi.stubEnv('NODE_ENV', 'production')
	for (const name of ['MAIL_FROM', 'MAIL_URL', 'MAIL_TOKEN']) vi.stubEnv(name, undefined)
	const { mailbox, refusal } = await import('../src/mail')
	expect(mailbox).toBeNull()
	expect(refusal).toContain('admin Secrets screen')
	const { deliver } = await import('ajo-kit-mail')
	expect(await deliver({ to: 'reader@example.test', subject: 'Notes', text: 'Kept here' }))
		.toMatchObject({ ok: false, kind: 'refused', code: 'no-transport' })
})

test('production mail needs every MAIL_* value and an HTTPS provider', async () => {
	vi.stubEnv('NODE_ENV', 'production')
	vi.stubEnv('MAIL_FROM', 'notes@example.test')
	vi.stubEnv('MAIL_URL', '')
	vi.stubEnv('MAIL_TOKEN', '')
	await expect(import('../src/mail')).rejects.toThrow('Missing MAIL_URL, MAIL_TOKEN')
	vi.resetModules()
	vi.stubEnv('MAIL_URL', 'http://provider.example.test/send')
	vi.stubEnv('MAIL_TOKEN', 'local-test-only-provider-token')
	await expect(import('../src/mail')).rejects.toThrow('MAIL_URL must use HTTPS')
	vi.resetModules()
	vi.stubEnv('MAIL_URL', 'https://provider.example.test/send')
	const { mailbox, refusal } = await import('../src/mail')
	expect(mailbox).toBeNull()
	expect(refusal).toBeNull()
})

test('with mail off, the notes page shows the refusal and verify and email answer 409 before any limit', async () => {
	const app = await start(undefined, { NODE_ENV: 'production', MAIL_FROM: undefined, MAIL_URL: undefined, MAIL_TOKEN: undefined })
	try {
		const request = (path: string, cookie?: string, body?: unknown, accept = 'application/json') => fetch(`${app.url}${path}`, {
			method: body === undefined ? 'GET' : 'POST',
			redirect: 'manual',
			headers: {
				Accept: accept,
				...(body !== undefined && { 'Content-Type': 'application/json', Origin: app.url }),
				...(cookie && { Cookie: cookie }),
			},
			...(body !== undefined && { body: JSON.stringify(body) }),
		})
		const password = 'a-long-test-password'
		expect((await request('/register', undefined, { name: 'Reader', email: 'reader@example.test', password, confirm: password })).status).toBe(200)
		const cookie = (await request('/login', undefined, { email: 'reader@example.test', password })).headers.get('set-cookie')!.split(';')[0]
		const { data } = await (await request('/notes', cookie)).json()
		expect(data.at(-1)).toMatchObject({ mail: null, refusal: expect.stringContaining('admin Secrets screen') })
		const html = await (await request('/notes', cookie, undefined, 'text/html')).text()
		expect(html).toContain('admin Secrets screen')
		expect(html).not.toContain('Send verification email')
		expect(html).not.toContain('Email my notes')
		for (const action of ['verify', 'verify', 'email', 'email']) {
			const response = await request(`/notes?/${action}`, cookie, {})
			expect(response.status).toBe(409)
			expect(JSON.stringify(await response.json())).toContain('admin Secrets screen')
		}
	} finally {
		await app.close()
	}
}, 60_000)
