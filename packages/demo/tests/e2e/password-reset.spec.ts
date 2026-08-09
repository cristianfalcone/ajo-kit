import { randomUUID } from 'node:crypto'
import { expect, request as playwright, test } from './test'
import { count, goto, login, make, proof, reset } from './helpers'

test('forgot and reset password flow revokes old credentials', async ({ page, request, baseURL: base, fixture }) => {
	const email = `reset-${randomUUID()}@example.com`
	const user = await make(fixture, { email, name: 'Reset Flow User' })
	const token = `reset-token-${randomUUID()}`
	const credentials = { email, password: 'password' }

	await reset(fixture, user, token)

	const stale = await playwright.newContext({ baseURL: base })
	await login(stale, base!, credentials)
	expect((await stale.get('/api/me')).status()).toBe(200)

	const response = await request.post('/api/login', {
		data: {
			email,
			password: 'password',
			device_name: 'Reset Flow API',
		},
	})
	expect(response.status()).toBe(200)
	const bearer = (await response.json()).token as string
	const auth = { Authorization: `Bearer ${bearer}` }
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(200)

	await goto(page, '/forgot')
	await page.locator('input[name="email"]').fill('nobody@example.com')
	await page.getByRole('button', { name: 'Send Reset Link' }).click()
	await expect(page.getByText('If that email exists, we sent a reset link.')).toBeVisible()

	await goto(page, '/reset/not-a-real-token')
	await expect(page.getByText('This reset link is invalid or has expired.')).toBeVisible()

	await goto(page, `/reset/${token}`)
	await page.locator('input[name="password"]').fill('new-password-123')
	await page.locator('input[name="confirm"]').fill('wrong-password-123')
	await page.getByRole('button', { name: 'Reset Password' }).click()
	await expect(page.getByText('Passwords must match')).toBeVisible()

	await page.locator('input[name="password"]').fill('new-password-123')
	await page.locator('input[name="confirm"]').fill('new-password-123')
	await page.getByRole('button', { name: 'Reset Password' }).click()

	await expect(page).toHaveURL(/\/login$/)
	expect(await count(fixture, 'sessions', 'user = ?', user)).toBe(0)
	expect(await count(fixture, 'tokens', 'user = ?', user)).toBe(0)
	expect(await count(fixture, 'resets', 'user = ?', user)).toBe(0)
	expect((await stale.get('/api/me')).status()).toBe(401)
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(401)

	const first = await request.post('/login?/default', {
		headers: proof(base!),
		data: credentials,
	})
	expect(first.status()).toBe(401)

	await page.locator('input[name="email"]').fill(email)
	await page.locator('input[name="password"]').fill('new-password-123')
	await page.getByRole('button', { name: 'Sign In' }).click()

	await expect(page).toHaveURL(/\/dashboard$/)
	await expect(page.getByRole('heading', { name: 'Welcome back, Reset Flow User' })).toBeVisible()

	await stale.dispose()
})
