import { expect, test } from '@playwright/test'

test('bearer API covers login, me, token create/list/delete and logout', async ({ request }) => {
	const login = await request.post('/api/login', {
		data: {
			email: 'cristian@example.com',
			password: 'password',
			device_name: 'Playwright API',
		},
	})

	expect(login.status()).toBe(200)

	const loginBody = await login.json()
	const token = loginBody.token as string
	const auth = { Authorization: `Bearer ${token}` }

	expect(token).toBeTruthy()
	expect(loginBody.user).toMatchObject({
		email: 'cristian@example.com',
	})

	const me = await request.get('/api/me', { headers: auth })
	expect(me.status()).toBe(200)
	await expect(me.json()).resolves.toMatchObject({
		email: 'cristian@example.com',
		abilities: ['*'],
	})

	const create = await request.post('/api/tokens', {
		headers: auth,
		data: {
			name: 'Playwright API Token',
			abilities: ['read'],
		},
	})

	expect(create.status()).toBe(201)

	const created = await create.json()
	expect(created.token).toBeTruthy()
	expect(created.message).toContain('Save this token securely')

	const tokens = await request.get('/api/tokens', { headers: auth })
	expect(tokens.status()).toBe(200)

	const tokenList = await tokens.json()
	const apiToken = tokenList.tokens.find((entry: { name: string }) => entry.name === 'Playwright API Token')

	expect(apiToken).toMatchObject({
		name: 'Playwright API Token',
		abilities: ['read'],
	})

	const remove = await request.delete('/api/tokens', {
		headers: auth,
		data: { id: apiToken.id },
	})

	expect(remove.status()).toBe(200)
	await expect(remove.json()).resolves.toMatchObject({ message: 'Token revoked' })

	const logout = await request.post('/api/logout', { headers: auth })
	expect(logout.status()).toBe(200)

	const afterLogout = await request.get('/api/me', { headers: auth })
	expect(afterLogout.status()).toBe(401)
})
