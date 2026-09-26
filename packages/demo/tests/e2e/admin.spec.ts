import { randomUUID } from 'node:crypto'
import { expect, request as playwright, test } from './test'
import type { APIRequestContext } from '@playwright/test'
import type { FixtureClient } from './fixture-client'
import { count, data, goto, login, make, proof, signin } from './helpers'

test('admin pages expose bounded lists, pagination and admin-only actions', async ({ page }) => {
	await signin(page)

	await goto(page, '/admin')
	await expect(page.getByRole('link', { name: 'Registration' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

	await goto(page, '/admin/users?size=5')
	await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
	await expect(page.getByText('Page 1 - 5 users')).toBeVisible()
	await page.getByRole('link', { name: 'Next' }).click()
	await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
	expect(page.url()).toContain('/admin/users?')
	expect(page.url()).toContain('page=2')
	expect(page.url()).toContain('size=5')
	await expect(page.getByText('Page 2 - 5 users')).toBeVisible()

	await goto(page, '/admin/sessions?size=100')
	await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible()
	await expect(page.getByText(/Page 1 - \d+ sessions/)).toHaveCount(0)

	await goto(page, '/admin/tokens?size=5')
	await expect(page.getByRole('heading', { name: 'API Tokens' })).toBeVisible()
	await expect(page.getByText('Seed API Token')).toBeVisible()
})

type Row = { id: string; email: string }

/** Signs a fresh user in on two devices and mints two API tokens for it. */
async function target(fixture: FixtureClient, request: APIRequestContext, base: string) {
	const email = `target-${randomUUID()}@example.com`
	const user = await make(fixture, { email, name: 'Revocation Target' })
	const credentials = { email, password: 'password' }
	const devices = [
		await playwright.newContext({ baseURL: base }),
		await playwright.newContext({ baseURL: base }),
	]

	for (const device of devices) await login(device, base, credentials)
	for (const device_name of ['First', 'Second']) {
		expect((await request.post('/api/login', { data: { ...credentials, device_name } })).status()).toBe(200)
	}

	return { email, user, devices }
}

const listed = async (request: APIRequestContext, email: string) => ({
	sessions: (await data(request, '/admin/sessions?size=100')).sessions.filter((row: Row) => row.email === email) as Row[],
	tokens: (await data(request, '/admin/tokens?size=100')).tokens.filter((row: Row) => row.email === email) as Row[],
})

test('a read-only admin renders admin pages but cannot revoke credentials', async ({ request, baseURL: base, fixture }) => {
	const { email, user, devices } = await target(fixture, request, base!)
	const support = `support-${randomUUID()}@example.com`

	await make(fixture, { email: support, role: 'support' })
	await login(request, base!, { email: support, password: 'password' })

	for (const path of ['/admin', '/admin/users', '/admin/sessions', '/admin/tokens', '/admin/registration']) {
		expect((await request.get(path)).status(), path).toBe(200)
	}

	const { sessions, tokens } = await listed(request, email)

	for (const [path, body] of [
		['/admin/sessions?/revoke', { id: sessions[0].id }],
		['/admin/sessions?/revokeUser', { user }],
		['/admin/tokens?/default', { id: tokens[0].id }],
		['/admin/registration?/mode', { signup: 'invite' }],
	] as const) {
		expect((await request.post(path, { headers: proof(base!), data: body })).status(), path).toBe(403)
	}

	expect(await count(fixture, 'sessions', 'user = ?', user)).toBe(2)
	expect(await count(fixture, 'tokens', 'user = ?', user)).toBe(2)

	for (const device of devices) await device.dispose()
})

test('admin revokes touch only the credential with the exact id', async ({ request, baseURL: base, fixture }) => {
	const { email, user, devices } = await target(fixture, request, base!)

	await login(request, base!)

	const { sessions, tokens } = await listed(request, email)
	const stats = async () => (await data(request, '/admin')).stats
	const before = await stats()
	const revoke = async (path: string, id: string) => {
		const response = await request.post(path, { headers: proof(base!), data: { id } })
		expect(response.status()).toBe(200)
		return (await response.json()).revoked
	}

	expect(sessions).toHaveLength(2)
	expect(tokens).toHaveLength(2)

	for (const id of ['%', '_', `${sessions[0].id.slice(0, -1)}_`]) {
		expect(await revoke('/admin/sessions?/revoke', id), id).toBe(false)
	}
	for (const id of ['%', '_', `_${tokens[0].id.slice(1)}`]) {
		expect(await revoke('/admin/tokens?/default', id), id).toBe(false)
	}

	expect(await stats()).toMatchObject({ sessions: before.sessions, tokens: before.tokens })

	expect(await revoke('/admin/sessions?/revoke', sessions[0].id)).toBe(true)
	expect(await revoke('/admin/tokens?/default', tokens[0].id)).toBe(true)
	expect(await count(fixture, 'sessions', 'user = ?', user)).toBe(1)
	expect(await count(fixture, 'tokens', 'user = ?', user)).toBe(1)

	for (const device of devices) await device.dispose()
})
