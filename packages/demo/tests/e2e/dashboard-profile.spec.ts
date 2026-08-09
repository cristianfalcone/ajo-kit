import { expect, test } from './test'
import { goto, make, signin } from './helpers'

test('dashboard, theme toggle and profile actions reflect account state', async ({ page, fixture }) => {
	const email = `profile-admin-${Date.now()}@example.com`
	await make(fixture, { email, name: 'Profile Admin', role: 'admin' })

	await signin(page, { email, password: 'password' })

	await expect(page.getByText('Welcome back, Profile Admin')).toBeVisible()
	await expect(page.getByText('Active Sessions')).toBeVisible()
	await expect(page.getByText('Unread Messages')).toBeVisible()

	const theme = page.locator('button[aria-label="Change theme"]:visible')

	await theme.click()
	expect(await page.evaluate(() => localStorage.getItem('theme.v1'))).toBe('light')
	await theme.click()
	await expect(page.locator('html')).toHaveClass(/dark/)

	const name = `Cristian ${Date.now()}`

	await goto(page, '/account/profile')
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
