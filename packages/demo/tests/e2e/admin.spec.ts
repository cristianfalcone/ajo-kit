import { expect, test } from '@playwright/test'
import { goto, signin } from './helpers'

test('admin pages expose bounded lists, pagination and admin-only actions', async ({ page }) => {
	await signin(page)

	await goto(page, '/admin')
	await expect(page.getByRole('link', { name: 'Registration' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

	await goto(page, '/admin/users?size=5')
	await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
	await expect(page.getByText('Page 1 - 5 users')).toBeVisible()
	await page.getByRole('link', { name: 'Next' }).click()
	await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
	expect(page.url()).toContain('/admin/users?')
	expect(page.url()).toContain('page=2')
	expect(page.url()).toContain('size=5')
	await expect(page.getByText('Page 2 - 5 users')).toBeVisible()

	await goto(page, '/admin/sessions?size=100')
	await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible()
	await expect(page.getByText(/Page 1 - \d+ sessions/)).toHaveCount(0)

	await goto(page, '/admin/tokens?size=5')
	await expect(page.getByRole('heading', { name: 'API Tokens' })).toBeVisible()
	await expect(page.getByText('Seed API Token')).toBeVisible()
})
