import { randomUUID } from 'node:crypto'
import { expect, request as playwrightRequest, test } from '@playwright/test'
import { sign } from '../../packages/ajo-auth/src/verify'
import {
	actionHeaders,
	createResetToken,
	createUser,
	gotoReady,
	loginRequest,
	loginPage,
	rowCount,
} from './helpers'

test('login form rejects invalid credentials and accepts a valid account', async ({ page }) => {
	await gotoReady(page, '/login')

	await page.locator('input[name="email"]').fill('cristian@example.com')
	await page.locator('input[name="password"]').fill('wrong-password')
	await page.getByRole('button', { name: 'Sign In' }).click()

	await expect(page.getByText('Invalid credentials')).toBeVisible()

	await page.locator('input[name="password"]').fill('password')
	await page.getByRole('button', { name: 'Sign In' }).click()

	await expect(page).toHaveURL(/\/dashboard$/)
	await expect(page.getByText('Welcome back, Cristian Falcone')).toBeVisible()
	await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible()
})

test('registration creates a non-admin account and signs it in', async ({ page }) => {
	const email = `register-${Date.now()}@example.com`

	await gotoReady(page, '/register')
	await page.locator('input[name="email"]').fill(email)
	await page.locator('input[name="password"]').fill('password123')
	await page.locator('input[name="confirm"]').fill('password123')
	await page.getByRole('button', { name: 'Create Account' }).click()

	await expect(page).toHaveURL(/\/dashboard$/)
	await expect(page.getByRole('heading', { name: 'Welcome back, User' })).toBeVisible()
	await expect(page.getByText(email).first()).toBeVisible()
	await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0)
	expect(rowCount('users', 'email = ?', email)).toBe(1)
})

test('forgot and reset password flow revokes old credentials', async ({ page, request, baseURL }) => {
	const email = `reset-${randomUUID()}@example.com`
	const user = await createUser({ email, name: 'Reset Flow User' })
	const token = `reset-token-${randomUUID()}`
	const credentials = { email, password: 'password' }

	createResetToken(user, token)

	const oldSession = await playwrightRequest.newContext({ baseURL })
	await loginRequest(oldSession, baseURL!, credentials)
	expect((await oldSession.get('/api/me')).status()).toBe(200)

	const apiLogin = await request.post('/api/login', {
		data: {
			email,
			password: 'password',
			device_name: 'Reset Flow API',
		},
	})
	expect(apiLogin.status()).toBe(200)
	const apiToken = (await apiLogin.json()).token as string
	const auth = { Authorization: `Bearer ${apiToken}` }
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(200)

	await gotoReady(page, '/forgot')
	await page.locator('input[name="email"]').fill('nobody@example.com')
	await page.getByRole('button', { name: 'Send Reset Link' }).click()
	await expect(page.getByText('If that email exists, we sent a reset link.')).toBeVisible()

	await gotoReady(page, '/reset/not-a-real-token')
	await expect(page.getByText('This reset link is invalid or has expired.')).toBeVisible()

	await gotoReady(page, `/reset/${token}`)
	await page.locator('input[name="password"]').fill('new-password-123')
	await page.locator('input[name="confirm"]').fill('wrong-password-123')
	await page.getByRole('button', { name: 'Reset Password' }).click()
	await expect(page.getByText('Passwords must match')).toBeVisible()

	await page.locator('input[name="password"]').fill('new-password-123')
	await page.locator('input[name="confirm"]').fill('new-password-123')
	await page.getByRole('button', { name: 'Reset Password' }).click()

	await expect(page).toHaveURL(/\/login$/)
	expect(rowCount('sessions', 'user = ?', user)).toBe(0)
	expect(rowCount('tokens', 'user = ?', user)).toBe(0)
	expect(rowCount('resets', 'user = ?', user)).toBe(0)
	expect((await oldSession.get('/api/me')).status()).toBe(401)
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(401)

	const oldLogin = await request.post('/login?/default', {
		headers: actionHeaders(baseURL!),
		data: credentials,
	})
	expect(oldLogin.status()).toBe(401)

	await page.locator('input[name="email"]').fill(email)
	await page.locator('input[name="password"]').fill('new-password-123')
	await page.getByRole('button', { name: 'Sign In' }).click()

	await expect(page).toHaveURL(/\/dashboard$/)
	await expect(page.getByRole('heading', { name: 'Welcome back, Reset Flow User' })).toBeVisible()

	await oldSession.dispose()
})

test('verification signature marks an unverified account as verified', async ({ page }) => {
	const email = `verify-${Date.now()}@example.com`
	const user = await createUser({ email, name: 'Verify Flow User', verified: false })

	await page.goto(`/verify/${sign(user)}`)

	await expect(page.getByText('Your email has been verified!')).toBeVisible()
	expect(rowCount('users', 'email = ? and verified is not null', email)).toBe(1)
})

test('authenticated users can request a new verification email until verified', async ({ page }) => {
	const email = `resend-${Date.now()}@example.com`
	await createUser({ email, name: 'Resend Verify User', verified: false })

	await loginPage(page, { email, password: 'password' })
	await gotoReady(page, '/verify')
	await page.getByRole('button', { name: "Didn't receive the email? Click to resend" }).click()

	await expect(page.getByText('Verification email sent!')).toBeVisible()
})
