import { expect, test } from '@playwright/test'
import { make } from './helpers'

test('bearer API covers login, me, token create/list/delete and logout', async ({ request }) => {
	const res = await request.post('/api/login', {
		data: {
			email: 'cristian@example.com',
			password: 'password',
			device_name: 'Playwright API',
		},
	})

	expect(res.status()).toBe(200)

	const body = await res.json()
	const token = body.token as string
	const headers = { Authorization: `Bearer ${token}` }

	expect(token).toBeTruthy()
	expect(body.user).toMatchObject({
		email: 'cristian@example.com',
	})

	const me = await request.get('/api/me', { headers })
	expect(me.status()).toBe(200)
	await expect(me.json()).resolves.toMatchObject({
		email: 'cristian@example.com',
		abilities: ['*'],
	})

	const create = await request.post('/api/tokens', {
		headers,
		data: {
			name: 'Playwright API Token',
			abilities: ['tokens:read'],
		},
	})

	expect(create.status()).toBe(201)

	const created = await create.json()
	expect(created.token).toBeTruthy()
	expect(created.message).toContain('Save this token securely')

	const wildcard = await request.post('/api/tokens', {
		headers,
		data: {
			name: 'Playwright Wildcard API Token',
			abilities: ['tokens:*', 'tokens:read'],
		},
	})

	expect(wildcard.status()).toBe(201)

	const tokens = await request.get('/api/tokens', { headers })
	expect(tokens.status()).toBe(200)

	const list = await tokens.json()
	const bearer = list.tokens.find((entry: { name: string }) => entry.name === 'Playwright API Token')
	const broad = list.tokens.find((entry: { name: string }) => entry.name === 'Playwright Wildcard API Token')

	expect(bearer).toMatchObject({
		name: 'Playwright API Token',
		abilities: ['tokens:read'],
	})
	expect(broad).toMatchObject({
		name: 'Playwright Wildcard API Token',
		abilities: ['tokens:*'],
	})

	const remove = await request.delete('/api/tokens', {
		headers,
		data: { id: bearer.id },
	})

	expect(remove.status()).toBe(200)
	await expect(remove.json()).resolves.toMatchObject({ message: 'Token revoked' })

	const removeWildcard = await request.delete('/api/tokens', {
		headers,
		data: { id: broad.id },
	})

	expect(removeWildcard.status()).toBe(200)

	const logout = await request.post('/api/logout', { headers })
	expect(logout.status()).toBe(200)

	const gone = await request.get('/api/me', { headers })
	expect(gone.status()).toBe(401)
})

test('api login token is bounded by non-admin account abilities', async ({ request }) => {
	const email = `api-member-${Date.now()}@example.com`
	await make({ email, name: 'API Member' })

	const res = await request.post('/api/login', {
		data: {
			email,
			password: 'password',
			device_name: 'Playwright Member API',
		},
	})

	expect(res.status()).toBe(200)

	const body = await res.json()
	const headers = { Authorization: `Bearer ${body.token}` }
	const me = await request.get('/api/me', { headers })

	expect(me.status()).toBe(200)
	await expect(me.json()).resolves.toMatchObject({
		email,
		abilities: expect.arrayContaining(['profile:read', 'tokens:create']),
	})

	const admin = await request.post('/api/tokens', {
		headers,
		data: {
			name: 'Member Admin Token',
			abilities: ['admin:read'],
		},
	})

	expect(admin.status()).toBe(403)
	await expect(admin.json()).resolves.toMatchObject({
		message: 'Requested abilities exceed account abilities',
	})

	const full = await request.post('/api/tokens', {
		headers,
		data: {
			name: 'Member Full Token',
			abilities: ['*'],
		},
	})

	expect(full.status()).toBe(201)

	const tokens = await request.get('/api/tokens', { headers })
	const list = await tokens.json()
	const created = list.tokens.find((entry: { name: string }) => entry.name === 'Member Full Token')

	expect(created.abilities).toContain('tokens:create')
	expect(created.abilities).not.toContain('*')
	expect(created.abilities).not.toContain('admin:read')
})
