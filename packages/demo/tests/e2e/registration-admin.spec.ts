import { expect, request as playwright, test } from './test'
import { count, getSignup, goto, login, member, proof, setSignup, signin } from './helpers'

test('admin manages registration policy and invitations', async ({ page, browser, baseURL: base, fixture }) => {
	const email = `admin-invite-${Date.now()}@example.com`
	const guest = await browser.newContext({ baseURL: base })
	const tab = await guest.newPage()

	await setSignup(fixture, 'open')

	try {
		await signin(page)
		await goto(page, '/admin/registration')
		await expect(page.getByRole('heading', { name: 'Registration' })).toBeVisible()

		await page.getByRole('button', { name: 'Invite only' }).click()
		await expect.poll(() => getSignup(fixture)).toBe('invite')

		await goto(tab, '/login')
		await expect(tab.getByRole('link', { name: 'Sign up' })).toHaveCount(0)
		await goto(tab, '/register')
		await expect(tab.getByRole('heading', { name: 'Registration is by invitation only' })).toBeVisible()

		await goto(page, '/admin/registration')
		await page.locator('input[name="email"]').fill(email)
		await page.locator('input[name="name"]').fill('Admin Invited User')
		await page.getByRole('button', { name: 'Send Invitation' }).click()

		await expect.poll(() => count(fixture, 'invitations', 'email = ?', email)).toBe(1)
		await expect(page.getByText(email)).toBeVisible()

		const row = page.locator('tr', { hasText: email })
		await row.getByRole('button', { name: 'Revoke invitation' }).click()
		await expect.poll(() => count(fixture, 'invitations', 'email = ? and revoked is not null', email)).toBe(1)
		await expect(row.getByText('Revoked')).toBeVisible()

		await page.getByRole('button', { name: 'Open' }).click()
		await expect.poll(() => getSignup(fixture)).toBe('open')

		await goto(tab, '/login')
		await expect(tab.getByRole('link', { name: 'Sign up' })).toBeVisible()
	} finally {
		await setSignup(fixture, 'open')
		await guest.close()
	}
})

test('non-admin cannot access admin registration page or actions', async ({ page, baseURL: base }) => {
	await signin(page, member)
	await goto(page, '/admin/registration')
	await expect(page.getByRole('heading', { name: 'Missing ability: admin:read' })).toBeVisible()

	const api = await playwright.newContext({ baseURL: base })

	try {
		await login(api, base!, member)
		const response = await api.post('/admin/registration?/mode', {
			headers: proof(base!),
			data: { signup: 'invite' },
		})

		expect(response.status()).toBe(403)
	} finally {
		await api.dispose()
	}
})
