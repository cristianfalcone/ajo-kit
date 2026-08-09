import { randomUUID } from 'node:crypto'
import { expect, request as playwright, test } from './test'
import { count, goto, login, make, proof, signin } from './helpers'

test('password change rotates current session and revokes old credentials', async ({ page, request, baseURL: base, fixture }) => {
	const email = `password-${randomUUID()}@example.com`
	const user = await make(fixture, { email, name: 'Password Lifecycle User' })
	const credentials = { email, password: 'password' }

	await signin(page, credentials)
	const old = (await page.context().cookies()).find(cookie => cookie.name === 'session')?.value

	const other = await playwright.newContext({ baseURL: base })
	await login(other, base!, credentials)
	expect((await other.get('/api/me')).status()).toBe(200)

	const response = await request.post('/api/login', {
		data: {
			email,
			password: 'password',
			device_name: 'Password Lifecycle API',
		},
	})
	expect(response.status()).toBe(200)
	const bearer = (await response.json()).token as string
	const auth = { Authorization: `Bearer ${bearer}` }
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(200)

	await goto(page, '/account/profile')
	await page.locator('input[name="current"]').fill('password')
	await page.locator('input[name="password"]').fill('new-password-123')
	await page.locator('input[name="confirm"]').fill('new-password-123')
	await page.getByRole('button', { name: 'Change Password' }).click()

	await expect(page.getByText('Password changed successfully!')).toBeVisible()
	const fresh = (await page.context().cookies()).find(cookie => cookie.name === 'session')?.value
	expect(fresh).toBeTruthy()
	expect(fresh).not.toBe(old)

	expect(await count(fixture, 'sessions', 'user = ?', user)).toBe(1)
	expect(await count(fixture, 'tokens', 'user = ?', user)).toBe(0)
	expect((await other.get('/api/me')).status()).toBe(401)
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(401)

	await goto(page, '/dashboard')
	await expect(page.getByRole('heading', { name: 'Welcome back, Password Lifecycle User' })).toBeVisible()

	const first = await request.post('/login?/default', {
		headers: proof(base!),
		data: credentials,
	})
	expect(first.status()).toBe(401)

	const second = await request.post('/login?/default', {
		headers: proof(base!),
		data: { email, password: 'new-password-123' },
	})
	expect(second.status()).toBe(200)

	await other.dispose()
})

test('account token page creates and revokes a scoped token', async ({ page }) => {
	await signin(page)

	const label = `Browser Token ${Date.now()}`

	await goto(page, '/account/tokens')
	await page.locator('input[name="name"]').fill(label)
	await page.locator('label', { hasText: 'tokens:read' }).click()
	await page.getByRole('button', { name: 'Create Token' }).click()

	await expect(page.getByText("Token created! Copy it now - it won't be shown again.")).toBeVisible()
	await expect(page.getByText(label)).toBeVisible()
	const copy = page.getByRole('button', { name: 'Copy and close' })
	await expect(copy).toBeVisible()
	const corners = await copy.evaluate(element => {
		const style = getComputedStyle(element)
		return {
			bottomLeft: Number.parseFloat(style.borderBottomLeftRadius),
			topLeft: Number.parseFloat(style.borderTopLeftRadius),
			topRight: Number.parseFloat(style.borderTopRightRadius),
		}
	})
	expect(corners.topLeft).toBe(0)
	expect(corners.bottomLeft).toBe(0)
	expect(corners.topRight).toBeGreaterThan(0)

	const row = page.locator('tr', { hasText: label })
	await row.getByRole('button', { name: 'Revoke this token' }).click()
	await expect(row).toHaveCount(0)
})

test('session page revokes other sessions but keeps the current browser session', async ({ page, baseURL: base, fixture }) => {
	const email = `sessions-${Date.now()}@example.com`
	await make(fixture, { email, name: 'Sessions User' })
	const credentials = { email, password: 'password' }

	await signin(page, credentials)

	const other = await playwright.newContext({ baseURL: base })
	await login(other, base!, credentials)

	await goto(page, '/account/sessions')
	await expect(page.getByText('Revoke All Other Sessions')).toBeVisible()
	await page.getByRole('button', { name: 'Revoke All Other Sessions' }).click()

	await expect(page.getByText('Revoke All Other Sessions')).toHaveCount(0)
	await expect(page.getByText('Current')).toBeVisible()

	await other.dispose()
})
