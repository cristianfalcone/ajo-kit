import { expect, test } from './test'
import { count, goto, invite, proof, setSignup } from './helpers'

test('invite-only policy hides public signup and blocks direct registration', async ({ page, request, baseURL: base, fixture }) => {
	const email = `blocked-${Date.now()}@example.com`

	await setSignup(fixture, 'invite')

	try {
		await goto(page, '/login')
		await expect(page.getByRole('link', { name: 'Sign up' })).toHaveCount(0)

		await goto(page, '/register')
		await expect(page.getByRole('heading', { name: 'Registration is by invitation only' })).toBeVisible()
		await expect(page.locator('input[name="email"]')).toHaveCount(0)

		const response = await request.post('/register?/default', {
			headers: proof(base!),
			data: {
				email,
				password: 'password123',
				confirm: 'password123',
			},
		})

		expect(response.status()).toBe(403)
		await expect(response.json()).resolves.toMatchObject({
			error: {
				message: 'Registration is by invitation only',
				status: 403,
			},
		})
		expect(await count(fixture, 'users', 'email = ?', email)).toBe(0)
	} finally {
		await setSignup(fixture, 'open')
	}
})

test('invitation link creates a non-admin account and cannot be reused', async ({ page, request, baseURL: base, fixture }) => {
	const email = `invite-${Date.now()}@example.com`
	const token = await invite(fixture, { email, name: 'Invited User' })

	await goto(page, `/register/${token}`)
	await expect(page.getByText(email)).toBeVisible()

	await page.locator('input[name="name"]').fill('Accepted Invite User')
	await page.locator('input[name="password"]').fill('password123')
	await page.locator('input[name="confirm"]').fill('password123')
	await page.getByRole('button', { name: 'Create Account' }).click()

	await expect(page).toHaveURL(/\/dashboard$/)
	await expect(page.getByRole('heading', { name: 'Welcome back, Accepted Invite User' })).toBeVisible()
	await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0)
	expect(await count(fixture, 'users', 'email = ?', email)).toBe(1)
	expect(await count(fixture, 'invites', 'email = ? and accepted is not null', email)).toBe(1)

	const reuse = await request.post(`/register/${token}?/default`, {
		headers: proof(base!),
		data: {
			password: 'password123',
			confirm: 'password123',
		},
	})

	expect(reuse.status()).toBe(400)
	expect(await count(fixture, 'users', 'email = ?', email)).toBe(1)
})

test('invalid invitations fail closed without creating an account', async ({ page, request, baseURL: base, fixture }) => {
	const expired = await invite(fixture, {
		email: `expired-${Date.now()}@example.com`,
		expiry: '2026-01-01T00:00:00.000Z',
	})
	const revokedEmail = `revoked-${Date.now()}@example.com`
	const revoked = await invite(fixture, { email: revokedEmail, revoked: true })
	const missing = `missing-${Date.now()}`

	for (const token of [expired, revoked, missing]) {
		await goto(page, `/register/${token}`)
		await expect(page.getByText('This invitation link is invalid or has expired.')).toBeVisible()

		const response = await request.post(`/register/${token}?/default`, {
			headers: proof(base!),
			data: {
				password: 'password123',
				confirm: 'password123',
			},
		})

		expect(response.status()).toBe(400)
	}

	expect(await count(fixture, 'users', 'email = ?', revokedEmail)).toBe(0)
})

test('invitation for an existing email fails without consuming the invite', async ({ request, baseURL: base, fixture }) => {
	const token = await invite(fixture, { email: 'emily@example.com' })
	const response = await request.post(`/register/${token}?/default`, {
		headers: proof(base!),
		data: {
			password: 'password123',
			confirm: 'password123',
		},
	})

	expect(response.status()).toBe(400)
	await expect(response.json()).resolves.toMatchObject({
		error: {
			message: 'Email already registered',
			status: 400,
		},
	})
	expect(await count(fixture, 'invites', 'email = ? and accepted is null and revoked is null', 'emily@example.com')).toBe(1)
})
