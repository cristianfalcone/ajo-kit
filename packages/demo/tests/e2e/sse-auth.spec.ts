import { createHash } from 'node:crypto'
import { expect, request, test } from './test'
import { proof, admin as creds, login, open, type Stream } from './helpers'

const cookie = (state: { cookies: Array<{ name: string; value: string }> }) =>
	state.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')

const hash = (plain: string) => createHash('sha256').update(plain).digest('hex')

test('SSE updates private routes while the session remains valid', async ({ baseURL: base }) => {
	const root = await request.newContext({ baseURL: base })
	const other = await request.newContext({ baseURL: base })
	let stream: Stream | undefined

	try {
		await login(root, base!, creds)

		stream = await open(base!, '/admin/sessions', cookie(await root.storageState()))
		expect(stream.res.statusCode).toBe(200)

		await login(other, base!, creds)

		const message = JSON.parse(await stream.waitForMessage()) as { data?: unknown[]; hash?: string }

		expect(message.hash).toBeTruthy()
		expect(message.data?.length).toBeGreaterThan(0)
	} finally {
		stream?.close()
		await root.dispose()
		await other.dispose()
	}
})

test('SSE closes without revalidating private data after its session is revoked', async ({ baseURL: base, fixture }) => {
	const email = `sse-revoke-${Date.now()}@example.com`
	const credentials = { email, password: 'password' }
	await fixture.makeUser({ email, name: 'SSE Revoked User' })

	const root = await request.newContext({ baseURL: base })
	const client = await request.newContext({ baseURL: base })
	let stream: Stream | undefined

	try {
		await login(root, base!, creds)
		await login(client, base!, credentials)

		const state = await client.storageState()
		const session = state.cookies.find(cookie => cookie.name === 'session')?.value

		expect(session).toBeTruthy()

		stream = await open(base!, '/dashboard', cookie(state))
		expect(stream.res.statusCode).toBe(200)

		const revoke = await root.post('/admin/sessions?/revoke', {
			headers: proof(base!),
			data: { id: hash(session!) },
		})

		expect(revoke.status()).toBe(200)
		await expect(revoke.json()).resolves.toMatchObject({ revoked: true })

		await stream.waitForClose()
		// A revoked session gets one expired frame with an empty body, then the close.
		// A revalidated payload would carry data and a hash, which `{}` cannot.
		expect(stream.messages).toEqual(['{}'])
	} finally {
		stream?.close()
		await root.dispose()
		await client.dispose()
	}
})
