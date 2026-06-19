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

	await page.getByLabel('Change theme').click()
	expect(await page.evaluate(() => localStorage.getItem('theme.v1'))).toBe('light')
	await page.getByLabel('Change theme').click()
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
	await loginPage(page)

	const other = await playwrightRequest.newContext({ baseURL })
	await loginRequest(other, baseURL!, adminCredentials)

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
