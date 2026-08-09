import { expect, test } from './test'
import { count, goto, make, signin } from './helpers'

test('verification signature marks an unverified account as verified', async ({ page, fixture }) => {
	const email = `verify-${Date.now()}@example.com`
	const user = await make(fixture, { email, name: 'Verify Flow User', verified: false })

	await page.goto(await fixture.verificationPath(user))

	await expect(page.getByText('Your email has been verified!')).toBeVisible()
	expect(await count(fixture, 'users', 'email = ? and verified is not null', email)).toBe(1)
})

test('authenticated users can request a new verification email until verified', async ({ page, fixture }) => {
	const email = `resend-${Date.now()}@example.com`
	await make(fixture, { email, name: 'Resend Verify User', verified: false })

	await signin(page, { email, password: 'password' })
	await goto(page, '/verify')
	await fixture.mailClear()
	await page.getByRole('button', { name: 'Resend verification email' }).click()

	await expect(page.getByText('Verification email sent.')).toBeVisible()
	const message = await fixture.mailLast(email)
	expect(message).toMatchObject({ to: email, subject: 'Verify your email' })
	expect(message?.text).toContain('/verify/')
})

test('dashboard unverified status links to verification page', async ({ page, fixture }) => {
	const email = `dashboard-verify-${Date.now()}@example.com`
	await make(fixture, { email, name: 'Dashboard Verify User', verified: false })

	await signin(page, { email, password: 'password' })

	await page.getByRole('link', { name: 'Unverified' }).click()

	await expect(page).toHaveURL(/\/verify$/)
	await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible()
})
