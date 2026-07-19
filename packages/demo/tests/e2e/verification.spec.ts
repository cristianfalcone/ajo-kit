import { expect, test } from '@playwright/test'
import { verify } from 'ajo-kit-auth'
import { count, goto, make, signin } from './helpers'

test('verification signature marks an unverified account as verified', async ({ page }) => {
	const email = `verify-${Date.now()}@example.com`
	const user = await make({ email, name: 'Verify Flow User', verified: false })

	await page.goto(`/verify/${verify.sign(user)}`)

	await expect(page.getByText('Your email has been verified!')).toBeVisible()
	expect(count('users', 'email = ? and verified is not null', email)).toBe(1)
})

test('authenticated users can request a new verification email until verified', async ({ page }) => {
	const email = `resend-${Date.now()}@example.com`
	await make({ email, name: 'Resend Verify User', verified: false })

	await signin(page, { email, password: 'password' })
	await goto(page, '/verify')
	await page.getByRole('button', { name: 'Resend verification email' }).click()

	await expect(page.getByText('Verification email sent.')).toBeVisible()
})

test('dashboard unverified status links to verification page', async ({ page }) => {
	const email = `dashboard-verify-${Date.now()}@example.com`
	await make({ email, name: 'Dashboard Verify User', verified: false })

	await signin(page, { email, password: 'password' })

	await page.getByRole('link', { name: 'Unverified' }).click()

	await expect(page).toHaveURL(/\/verify$/)
	await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible()
})
