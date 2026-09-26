import { createHash, randomUUID } from 'node:crypto'
import { expect, request as playwright, test } from './test'
import { count, data, goto, login, make, proof, signin } from './helpers'

test('password change rotates current session and revokes old credentials', async ({ page, request, baseURL: base, fixture }) => {
	const email = `password-${randomUUID()}@example.com`
	const user = await make(fixture, { email, name: 'Password Lifecycle User' })
	const credentials = { email, password: 'password' }

	await signin(page, credentials)
	const old = (await page.context().cookies()).find(cookie => cookie.name === 'session')?.value

	const other = await playwright.newContext({ baseURL: base })
	await login(other, base!, credentials)
	expect((await other.get('/api/me')).status()).toBe(200)

	const response = await request.post('/api/login', {
		data: {
			email,
			password: 'password',
			device_name: 'Password Lifecycle API',
		},
	})
	expect(response.status()).toBe(200)
	const bearer = (await response.json()).token as string
	const auth = { Authorization: `Bearer ${bearer}` }
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(200)

	await goto(page, '/account/profile')
	await page.locator('input[name="current"]').fill('password')
	await page.locator('input[name="password"]').fill('new-password-123')
	await page.locator('input[name="confirm"]').fill('new-password-123')
	await page.getByRole('button', { name: 'Change Password' }).click()

	await expect(page.getByText('Password changed successfully!')).toBeVisible()
	const fresh = (await page.context().cookies()).find(cookie => cookie.name === 'session')?.value
	expect(fresh).toBeTruthy()
	expect(fresh).not.toBe(old)

	expect(await count(fixture, 'sessions', 'user = ?', user)).toBe(1)
	expect(await count(fixture, 'tokens', 'user = ?', user)).toBe(0)
	expect((await other.get('/api/me')).status()).toBe(401)
	expect((await request.get('/api/me', { headers: auth })).status()).toBe(401)

	await goto(page, '/dashboard')
	await expect(page.getByRole('heading', { name: 'Welcome back, Password Lifecycle User' })).toBeVisible()

	const first = await request.post('/login?/default', {
		headers: proof(base!),
		data: credentials,
	})
	expect(first.status()).toBe(401)

	const second = await request.post('/login?/default', {
		headers: proof(base!),
		data: { email, password: 'new-password-123' },
	})
	expect(second.status()).toBe(200)

	await other.dispose()
})

test('account token page creates and revokes a scoped token', async ({ page }) => {
	await signin(page)

	const label = `Browser Token ${Date.now()}`

	await goto(page, '/account/tokens')
	await page.locator('input[name="name"]').fill(label)
	await page.locator('label', { hasText: 'tokens:read' }).click()
	await page.getByRole('button', { name: 'Create Token' }).click()

	await expect(page.getByText("Token created! Copy it now - it won't be shown again.")).toBeVisible()
	await expect(page.getByText(label)).toBeVisible()
	const copy = page.getByRole('button', { name: 'Copy and close' })
	await expect(copy).toBeVisible()
	const corners = await copy.evaluate(element => {
		const style = getComputedStyle(element)
		return {
			bottomLeft: Number.parseFloat(style.borderBottomLeftRadius),
			topLeft: Number.parseFloat(style.borderTopLeftRadius),
			topRight: Number.parseFloat(style.borderTopRightRadius),
		}
	})
	expect(corners.topLeft).toBe(0)
	expect(corners.bottomLeft).toBe(0)
	expect(corners.topRight).toBeGreaterThan(0)

	const row = page.locator('tr', { hasText: label })
	await row.getByRole('button', { name: 'Revoke this token' }).click()
	await expect(row).toHaveCount(0)
})

test('session page revokes other sessions but keeps the current browser session', async ({ page, baseURL: base, fixture }) => {
	const email = `sessions-${Date.now()}@example.com`
	await make(fixture, { email, name: 'Sessions User' })
	const credentials = { email, password: 'password' }

	await signin(page, credentials)

	const other = await playwright.newContext({ baseURL: base })
	await login(other, base!, credentials)

	await goto(page, '/account/sessions')
	await expect(page.getByText('Revoke All Other Sessions')).toBeVisible()
	await page.getByRole('button', { name: 'Revoke All Other Sessions' }).click()

	await expect(page.getByText('Revoke All Other Sessions')).toHaveCount(0)
	await expect(page.getByText('Current')).toBeVisible()

	await other.dispose()
})

test('password change limits wrong current passwords before verifying them', async ({ request, baseURL: base, fixture }) => {
	const email = `password-limit-${randomUUID()}@example.com`
	await make(fixture, { email, name: 'Password Limit User' })
	await login(request, base!, { email, password: 'password' })

	const change = async (current: string) => (await request.post('/account/profile?/password', {
		headers: proof(base!),
		data: { current, password: 'new-password-123', confirm: 'new-password-123' },
	})).status()

	for (let attempt = 0; attempt < 4; attempt++) expect(await change('wrong-password')).toBe(401)
	expect(await change('password')).toBe(200)

	for (let attempt = 0; attempt < 5; attempt++) expect(await change('wrong-password')).toBe(401)
	expect(await change('new-password-123')).toBe(429)
})

test('account revokes touch only the credential with the exact id', async ({ request, baseURL: base, fixture }) => {
	const email = `revoke-${randomUUID()}@example.com`
	const user = await make(fixture, { email, name: 'Exact Revoke User' })
	const credentials = { email, password: 'password' }
	const devices = [
		await playwright.newContext({ baseURL: base }),
		await playwright.newContext({ baseURL: base }),
	]

	for (const device of devices) await login(device, base!, credentials)

	const bearers: string[] = []

	for (const device_name of ['First', 'Second', 'Third']) {
		const response = await request.post('/api/login', { data: { ...credentials, device_name } })
		expect(response.status()).toBe(200)
		bearers.push((await response.json()).token)
	}

	await login(request, base!, credentials)

	const auth = { Authorization: `Bearer ${bearers[0]}` }
	const own = createHash('sha256').update(bearers[0]).digest('hex')
	const sessions = (await data(request, '/account/sessions')).sessions.filter((row: { current: boolean }) => !row.current) as { id: string }[]
	const tokens = (await data(request, '/account/tokens')).tokens as { id: string }[]
	const [spare, target] = tokens.filter(token => token.id !== own)
	const revoke = async (path: string, id: string) => {
		const response = await request.post(path, { headers: proof(base!), data: { id } })
		expect(response.status()).toBe(200)
		return (await response.json()).revoked
	}

	expect(tokens).toHaveLength(3)
	expect(sessions).toHaveLength(2)

	for (const id of ['%', '_', `${sessions[0].id.slice(0, -1)}_`]) {
		expect(await revoke('/account/sessions?/revoke', id), id).toBe(false)
	}
	for (const id of ['%', '_', `_${spare.id.slice(1)}`]) {
		expect(await revoke('/account/tokens?/revoke', id), id).toBe(false)
		expect((await request.delete('/api/tokens', { headers: auth, data: { id } })).status(), id).toBe(404)
	}

	expect(await count(fixture, 'sessions', 'user = ?', user)).toBe(3)
	expect(await count(fixture, 'tokens', 'user = ?', user)).toBe(3)

	expect(await revoke('/account/sessions?/revoke', sessions[0].id)).toBe(true)
	expect(await revoke('/account/tokens?/revoke', spare.id)).toBe(true)
	expect((await request.delete('/api/tokens', { headers: auth, data: { id: target.id } })).status()).toBe(200)
	expect(await count(fixture, 'sessions', 'user = ?', user)).toBe(2)
	expect(await count(fixture, 'tokens', 'user = ?', user)).toBe(1)

	for (const device of devices) await device.dispose()
})
