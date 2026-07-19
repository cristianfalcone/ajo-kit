import { expect, test } from '@playwright/test'
import { count, goto } from './helpers'

test('login form rejects invalid credentials and accepts a valid account', async ({ page }) => {
	await goto(page, '/login')

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

	await goto(page, '/register')
	await page.locator('input[name="email"]').fill(email)
	await page.locator('input[name="password"]').fill('password123')
	await page.locator('input[name="confirm"]').fill('password123')
	await page.getByRole('button', { name: 'Create Account' }).click()

	await expect(page).toHaveURL(/\/dashboard$/)
	await expect(page.getByRole('heading', { name: 'Welcome back, User' })).toBeVisible()
	await expect(page.getByText(email).first()).toBeVisible()
	await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0)
	expect(count('users', 'email = ?', email)).toBe(1)
})
