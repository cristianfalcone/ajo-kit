import { expect, test } from '@playwright/test'
import { actionHeaders, createUser, loginRequest } from './helpers'

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
			abilities: ['tokens:read'],
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
		abilities: ['tokens:read'],
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

test('limited bearer tokens require matching API abilities', async ({ request }) => {
	const auth = { Authorization: 'Bearer seed-api-token' }

	const tokens = await request.get('/api/tokens', { headers: auth })
	expect(tokens.status()).toBe(200)

	const me = await request.get('/api/me', { headers: auth })
	expect(me.status()).toBe(403)
	await expect(me.json()).resolves.toMatchObject({ message: 'Missing ability: profile:read' })

	const create = await request.post('/api/tokens', {
		headers: auth,
		data: {
			name: 'Forbidden Token',
			abilities: ['tokens:read'],
		},
	})

	expect(create.status()).toBe(403)
	await expect(create.json()).resolves.toMatchObject({ message: 'Missing ability: tokens:create' })

	const remove = await request.delete('/api/tokens', {
		headers: auth,
		data: { id: 'none' },
	})

	expect(remove.status()).toBe(403)
	await expect(remove.json()).resolves.toMatchObject({ message: 'Missing ability: tokens:delete' })
})

test('bearer tokens do not authenticate route actions outside api', async ({ request }) => {
	const response = await request.post('/account/tokens?/make', {
		headers: {
			Accept: 'application/json',
			Authorization: 'Bearer seed-api-token',
		},
		data: {
			name: 'Route Action Token',
			abilities: ['tokens:read'],
		},
	})

	expect(response.status()).toBe(403)
	await expect(response.json()).resolves.toMatchObject({ error: { message: 'Invalid CSRF token' } })
})

test('cookie-auth API mutations require CSRF proof', async ({ request, baseURL }) => {
	const email = `csrf-api-${Date.now()}@example.com`
	await createUser({ email, name: 'CSRF API User' })
	await loginRequest(request, baseURL!, { email, password: 'password' })

	const blocked = await request.post('/api/tokens', {
		data: {
			name: 'Cookie API Token Blocked',
			abilities: ['tokens:read'],
		},
	})

	expect(blocked.status()).toBe(403)
	await expect(blocked.json()).resolves.toMatchObject({ message: 'Invalid CSRF token' })

	const allowed = await request.post('/api/tokens', {
		headers: actionHeaders(baseURL!),
		data: {
			name: 'Cookie API Token Allowed',
			abilities: ['tokens:read'],
		},
	})

	expect(allowed.status()).toBe(201)
	await expect(allowed.json()).resolves.toMatchObject({
		token: expect.any(String),
		message: 'Save this token securely. It will not be shown again.',
	})
})

test('api authorization header takes precedence over session cookies', async ({ request, baseURL }) => {
	const email = `mixed-api-${Date.now()}@example.com`
	await createUser({ email, name: 'Mixed API User' })
	await loginRequest(request, baseURL!, { email, password: 'password' })

	const response = await request.post('/api/tokens', {
		headers: {
			...actionHeaders(baseURL!),
			Authorization: 'Bearer seed-api-token',
		},
		data: {
			name: 'Mixed Credential Token',
			abilities: ['tokens:read'],
		},
	})

	expect(response.status()).toBe(403)
	await expect(response.json()).resolves.toMatchObject({ message: 'Missing ability: tokens:create' })
})

test('bearer token creation cannot exceed caller abilities', async ({ request }) => {
	const login = await request.post('/api/login', {
		data: {
			email: 'cristian@example.com',
			password: 'password',
			device_name: 'Playwright API Subset',
		},
	})

	expect(login.status()).toBe(200)

	const full = await login.json()
	const create = await request.post('/api/tokens', {
		headers: { Authorization: `Bearer ${full.token}` },
		data: {
			name: 'Token Creator',
			abilities: ['tokens:create'],
		},
	})

	expect(create.status()).toBe(201)

	const creator = await create.json()
	const escalate = await request.post('/api/tokens', {
		headers: { Authorization: `Bearer ${creator.token}` },
		data: {
			name: 'Escalated Token',
			abilities: ['*'],
		},
	})

	expect(escalate.status()).toBe(403)
	await expect(escalate.json()).resolves.toMatchObject({
		message: 'Requested abilities exceed bearer token abilities',
	})

	const sameScope = await request.post('/api/tokens', {
		headers: { Authorization: `Bearer ${creator.token}` },
		data: {
			name: 'Same Scope Token',
			abilities: ['tokens:create'],
		},
	})

	expect(sameScope.status()).toBe(201)
})
