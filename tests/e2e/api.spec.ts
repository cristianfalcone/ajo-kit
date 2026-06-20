import { expect, test } from '@playwright/test'
import { proof, make, login } from './helpers'

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

	const tokens = await request.get('/api/tokens', { headers })
	expect(tokens.status()).toBe(200)

	const list = await tokens.json()
	const bearer = list.tokens.find((entry: { name: string }) => entry.name === 'Playwright API Token')

	expect(bearer).toMatchObject({
		name: 'Playwright API Token',
		abilities: ['tokens:read'],
	})

	const remove = await request.delete('/api/tokens', {
		headers,
		data: { id: bearer.id },
	})

	expect(remove.status()).toBe(200)
	await expect(remove.json()).resolves.toMatchObject({ message: 'Token revoked' })

	const logout = await request.post('/api/logout', { headers })
	expect(logout.status()).toBe(200)

	const gone = await request.get('/api/me', { headers })
	expect(gone.status()).toBe(401)
})

test('limited bearer tokens require matching API abilities', async ({ request }) => {
	const headers = { Authorization: 'Bearer seed-api-token' }

	const tokens = await request.get('/api/tokens', { headers })
	expect(tokens.status()).toBe(200)

	const me = await request.get('/api/me', { headers })
	expect(me.status()).toBe(403)
	await expect(me.json()).resolves.toMatchObject({ message: 'Missing ability: profile:read' })

	const create = await request.post('/api/tokens', {
		headers,
		data: {
			name: 'Forbidden Token',
			abilities: ['tokens:read'],
		},
	})

	expect(create.status()).toBe(403)
	await expect(create.json()).resolves.toMatchObject({ message: 'Missing ability: tokens:create' })

	const remove = await request.delete('/api/tokens', {
		headers,
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

test('cookie-auth API mutations require CSRF proof', async ({ request, baseURL: base }) => {
	const email = `csrf-api-${Date.now()}@example.com`
	await make({ email, name: 'CSRF API User' })
	await login(request, base!, { email, password: 'password' })

	const blocked = await request.post('/api/tokens', {
		data: {
			name: 'Cookie API Token Blocked',
			abilities: ['tokens:read'],
		},
	})

	expect(blocked.status()).toBe(403)
	await expect(blocked.json()).resolves.toMatchObject({ message: 'Invalid CSRF token' })

	const allowed = await request.post('/api/tokens', {
		headers: proof(base!),
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

test('api authorization header takes precedence over session cookies', async ({ request, baseURL: base }) => {
	const email = `mixed-api-${Date.now()}@example.com`
	await make({ email, name: 'Mixed API User' })
	await login(request, base!, { email, password: 'password' })

	const response = await request.post('/api/tokens', {
		headers: {
			...proof(base!),
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

test('api body parser returns client errors for malformed and oversized JSON', async ({ baseURL }) => {
	const headers = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
	}
	const invalid = await fetch(`${baseURL}/api/login`, {
		method: 'POST',
		headers,
		body: '{bad',
	})

	expect(invalid.status).toBe(422)
	await expect(invalid.json()).resolves.toMatchObject({
		status: 422,
		message: 'Invalid content',
	})

	const large = await fetch(`${baseURL}/api/login`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ value: 'x'.repeat(101 * 1024) }),
	})

	expect(large.status).toBe(413)
	await expect(large.json()).resolves.toMatchObject({
		status: 413,
		message: 'Content Too Large',
	})
})

test('bearer token creation cannot exceed caller abilities', async ({ request }) => {
	const res = await request.post('/api/login', {
		data: {
			email: 'cristian@example.com',
			password: 'password',
			device_name: 'Playwright API Subset',
		},
	})

	expect(res.status()).toBe(200)

	const full = await res.json()
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

	const scoped = await request.post('/api/tokens', {
		headers: { Authorization: `Bearer ${creator.token}` },
		data: {
			name: 'Same Scope Token',
			abilities: ['tokens:create'],
		},
	})

	expect(scoped.status()).toBe(201)
})
