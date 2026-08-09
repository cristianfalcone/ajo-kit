import { randomUUID } from 'node:crypto'
import { expect, test } from './test'
import { count, goto, make, signin } from './helpers'

test('non-admin account delete requires password confirmation and deletes the account', async ({ page, fixture }) => {
	const email = `delete-${Date.now()}@example.com`
	await make(fixture, { email, name: 'Delete Flow User' })

	await signin(page, { email, password: 'password' })
	await goto(page, '/account/delete')

	await expect(page).toHaveURL(/\/confirm\?redirect=/)
	await page.locator('input[name="password"]').fill('password')
	await page.getByRole('button', { name: 'Confirm' }).click()

	await expect(page).toHaveURL(/\/account\/delete$/)
	await page.locator('input[name="confirmation"]').fill('DELETE')
	await page.getByRole('button', { name: 'Delete My Account' }).click()

	await expect(page).toHaveURL(/\/login$/)
	expect(await count(fixture, 'users', 'email = ?', email)).toBe(0)
})

test('password confirmation is scoped to the current session', async ({ page, browser, baseURL: base, fixture }) => {
	const email = `confirm-scope-${randomUUID()}@example.com`
	const credentials = { email, password: 'password' }
	await make(fixture, { email, name: 'Confirm Scope User' })

	await signin(page, credentials)

	const ctx = await browser.newContext({ baseURL: base })
	const tab = await ctx.newPage()
	await signin(tab, credentials)

	await goto(page, '/account/delete')
	await expect(page).toHaveURL(/\/confirm\?redirect=/)
	await page.locator('input[name="password"]').fill('password')
	await page.getByRole('button', { name: 'Confirm' }).click()
	await expect(page).toHaveURL(/\/account\/delete$/)

	await goto(tab, '/account/delete')
	await expect(tab).toHaveURL(/\/confirm\?redirect=/)

	await tab.close()
	await ctx.close()
})

test('password confirmation rate limits failed attempts', async ({ page, fixture }) => {
	const email = `confirm-limit-${randomUUID()}@example.com`
	await make(fixture, { email, name: 'Confirm Limit User' })

	await signin(page, { email, password: 'password' })
	await goto(page, '/confirm?redirect=/account/delete')

	for (let i = 0; i < 5; i++) {
		await page.locator('input[name="password"]').fill(`wrong-${i}`)
		await page.getByRole('button', { name: 'Confirm' }).click()
		await expect(page.getByText('Invalid password')).toBeVisible()
	}

	await page.locator('input[name="password"]').fill('wrong-final')
	await page.getByRole('button', { name: 'Confirm' }).click()
	await expect(page.getByText('Too many confirmation attempts. Try again later.')).toBeVisible()
})
