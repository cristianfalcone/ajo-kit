import { randomUUID } from 'node:crypto'
import { expect, request as playwrightRequest, test } from '@playwright/test'
import {
	actionHeaders,
	adminCredentials,
	createUser,
	gotoReady,
	loginPage,
	loginRequest,
	rowCount,
} from './helpers'

test('dashboard, theme toggle and profile actions reflect account state', async ({ page }) => {
	const email = `profile-admin-${Date.now()}@example.com`
	await createUser({ email, name: 'Profile Admin', role: 'admin' })

	await loginPage(page, { email, password: 'password' })

	await expect(page.getByText('Welcome back, Profile Admin')).toBeVisible()
	await expect(page.getByText('Active Sessions')).toBeVisible()
	await expect(page.getByText('Unread Messages')).toBeVisible()

	const theme = page.locator('button[aria-label="Change theme"]:visible')

	await theme.click()
	expect(await page.evaluate(() => localStorage.getItem('theme.v1'))).toBe('light')
	await theme.click()
	await expect(page.locator('html')).toHaveClass(/dark/)

	const name = `Cristian ${Date.now()}`

	await gotoReady(page, '/account/profile')
	await page.locator('input[name="name"]').fill(name)
	await page.getByRole('button', { name: 'Save Name' }).click()

	await expect(page.getByText('Name updated successfully!')).toBeVisible()
	await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()

	await page.locator('input[name="current"]').fill('wrong-password')
	await page.locator('input[name="password"]').fill('password123')
	await page.locator('input[name="confirm"]').fill('password123')
	await page.getByRole('button', { name: 'Change Password' }).click()

	await expect(page.getByText('Current password is incorrect')).toBeVisible()
})

test('password change rotates current session and revokes old credentials', async ({ page, request, baseURL }) => {
	const email = `password-${randomUUID()}@example.com`
	const user = await createUser({ email, name: 'Password Lifecycle User' })
	const credentials = { email, password: 'password' }

	await loginPage(page, credentials)
	const oldCookie = (await page.context().cookies()).find(cookie => cookie.name === 'session')?.value

	const other = await playwrightRequest.newContext({ baseURL })
	await loginRequest(other, baseURL!, credentials)
	expect((await other.get('/api/me')).status()).toBe(200)

	const apiLogin = await request.post('/api/login', {
		data: {
			email,
			password: 'password',
			device_name: 'Password Lifecycle API',
		},
	})
	expect(apiLogin.status()).toBe(200)
	const apiToken = (await apiLogin.json()).token as string
	const auth = { Authorization: `Bearer ${apiToken}` }
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(200)

	await gotoReady(page, '/account/profile')
	await page.locator('input[name="current"]').fill('password')
	await page.locator('input[name="password"]').fill('new-password-123')
	await page.locator('input[name="confirm"]').fill('new-password-123')
	await page.getByRole('button', { name: 'Change Password' }).click()

	await expect(page.getByText('Password changed successfully!')).toBeVisible()
	const newCookie = (await page.context().cookies()).find(cookie => cookie.name === 'session')?.value
	expect(newCookie).toBeTruthy()
	expect(newCookie).not.toBe(oldCookie)

	expect(rowCount('sessions', 'user = ?', user)).toBe(1)
	expect(rowCount('tokens', 'user = ?', user)).toBe(0)
	expect((await other.get('/api/me')).status()).toBe(401)
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(401)

	await gotoReady(page, '/dashboard')
	await expect(page.getByRole('heading', { name: 'Welcome back, Password Lifecycle User' })).toBeVisible()

	const oldLogin = await request.post('/login?/default', {
		headers: actionHeaders(baseURL!),
		data: credentials,
	})
	expect(oldLogin.status()).toBe(401)

	const newLogin = await request.post('/login?/default', {
		headers: actionHeaders(baseURL!),
		data: { email, password: 'new-password-123' },
	})
	expect(newLogin.status()).toBe(200)

	await other.dispose()
})

test('account token page creates and revokes a scoped token', async ({ page }) => {
	await loginPage(page)

	const tokenName = `Browser Token ${Date.now()}`

	await gotoReady(page, '/account/tokens')
	await page.locator('input[name="name"]').fill(tokenName)
	await page.locator('label', { hasText: 'tokens:read' }).click()
	await page.getByRole('button', { name: 'Create Token' }).click()

	await expect(page.getByText("Token created! Copy it now - it won't be shown again.")).toBeVisible()
	await expect(page.getByText(tokenName)).toBeVisible()

	const row = page.locator('tr', { hasText: tokenName })
	await row.getByTitle('Revoke this token').click()
	await expect(row).toHaveCount(0)
})

test('session page revokes other sessions but keeps the current browser session', async ({ page, baseURL }) => {
	const email = `sessions-${Date.now()}@example.com`
	await createUser({ email, name: 'Sessions User' })
	const credentials = { email, password: 'password' }

	await loginPage(page, credentials)

	const other = await playwrightRequest.newContext({ baseURL })
	await loginRequest(other, baseURL!, credentials)

	await gotoReady(page, '/account/sessions')
	await expect(page.getByText('Revoke All Other Sessions')).toBeVisible()
	await page.getByRole('button', { name: 'Revoke All Other Sessions' }).click()

	await expect(page.getByText('Revoke All Other Sessions')).toHaveCount(0)
	await expect(page.getByText('Current')).toBeVisible()

	await other.dispose()
})

test('admin pages expose bounded lists, pagination and admin-only actions', async ({ page }) => {
	await loginPage(page)

	await gotoReady(page, '/admin')
	await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

	await gotoReady(page, '/admin/users?size=5')
	await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
	await expect(page.getByText('Page 1 - 5 users')).toBeVisible()
	await page.getByRole('link', { name: 'Next' }).click()
	await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
	expect(page.url()).toContain('/admin/users?')
	expect(page.url()).toContain('page=2')
	expect(page.url()).toContain('size=5')
	await expect(page.getByText('Page 2 - 5 users')).toBeVisible()

	await gotoReady(page, '/admin/sessions?size=100')
	await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible()
	await expect(page.getByText(/Page 1 - \d+ sessions/)).toHaveCount(0)

	await gotoReady(page, '/admin/tokens?size=5')
	await expect(page.getByRole('heading', { name: 'API Tokens' })).toBeVisible()
	await expect(page.getByText('Seed API Token')).toBeVisible()
})

test('non-admin account delete requires password confirmation and deletes the account', async ({ page }) => {
	const email = `delete-${Date.now()}@example.com`
	await createUser({ email, name: 'Delete Flow User' })

	await loginPage(page, { email, password: 'password' })
	await gotoReady(page, '/account/delete')

	await expect(page).toHaveURL(/\/confirm\?redirect=/)
	await page.locator('input[name="password"]').fill('password')
	await page.getByRole('button', { name: 'Confirm' }).click()

	await expect(page).toHaveURL(/\/account\/delete$/)
	await page.locator('input[name="confirmation"]').fill('DELETE')
	await page.getByRole('button', { name: 'Delete My Account' }).click()

	await expect(page).toHaveURL(/\/login$/)
	expect(rowCount('users', 'email = ?', email)).toBe(0)
})

test('password confirmation is scoped to the current session', async ({ page, browser, baseURL }) => {
	const email = `confirm-scope-${randomUUID()}@example.com`
	const credentials = { email, password: 'password' }
	await createUser({ email, name: 'Confirm Scope User' })

	await loginPage(page, credentials)

	const otherContext = await browser.newContext({ baseURL })
	const other = await otherContext.newPage()
	await loginPage(other, credentials)

	await gotoReady(page, '/account/delete')
	await expect(page).toHaveURL(/\/confirm\?redirect=/)
	await page.locator('input[name="password"]').fill('password')
	await page.getByRole('button', { name: 'Confirm' }).click()
	await expect(page).toHaveURL(/\/account\/delete$/)

	await gotoReady(other, '/account/delete')
	await expect(other).toHaveURL(/\/confirm\?redirect=/)

	await otherContext.close()
})

test('password confirmation rate limits failed attempts', async ({ page }) => {
	const email = `confirm-limit-${randomUUID()}@example.com`
	await createUser({ email, name: 'Confirm Limit User' })

	await loginPage(page, { email, password: 'password' })
	await gotoReady(page, '/confirm?redirect=/account/delete')

	for (let i = 0; i < 5; i++) {
		await page.locator('input[name="password"]').fill(`wrong-${i}`)
		await page.getByRole('button', { name: 'Confirm' }).click()
		await expect(page.getByText('Invalid password')).toBeVisible()
	}

	await page.locator('input[name="password"]').fill('wrong-final')
	await page.getByRole('button', { name: 'Confirm' }).click()
	await expect(page.getByText('Too many confirmation attempts. Try again later.')).toBeVisible()
})

test('admin API action rejects cross-site session mutation without same-origin proof', async ({ request }) => {
	await request.post('/login?/default', {
		headers: actionHeaders('http://127.0.0.1:5180'),
		data: adminCredentials,
	})

	const response = await request.post('/admin/sessions?/revoke', {
		headers: { Accept: 'application/json' },
		data: { id: 'missing' },
	})

	expect(response.status()).toBe(403)
})
