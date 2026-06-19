import { createHash } from 'node:crypto'
import { get, type ClientRequest, type IncomingMessage } from 'node:http'
import { expect, request as playwrightRequest, test } from '@playwright/test'
import { actionHeaders, adminCredentials, createUser, loginRequest } from './helpers'

type EventStream = {
	req: ClientRequest
	res: IncomingMessage
	messages: string[]
	waitForMessage: (timeout?: number) => Promise<string>
	waitForClose: (timeout?: number) => Promise<void>
	close: () => void
}

const waitFor = <T,>(promise: Promise<T>, timeout: number, message: string) =>
	new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), timeout)
		promise.then(
			value => {
				clearTimeout(timer)
				resolve(value)
			},
			error => {
				clearTimeout(timer)
				reject(error)
			}
		)
	})

const cookieHeader = (state: { cookies: Array<{ name: string; value: string }> }) =>
	state.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')

const openEventStream = (baseURL: string, path: string, cookie: string) =>
	new Promise<EventStream>((resolve, reject) => {
		let settled = false
		const req = get(new URL(path, baseURL), {
			headers: {
				Accept: 'text/event-stream',
				Cookie: cookie,
			}
		}, res => {
			const messages: string[] = []
			const waiters: Array<(message: string) => void> = []
			let buffer = ''
			let closed = false
			let resolveClosed!: () => void
			const closePromise = new Promise<void>(resolve => { resolveClosed = resolve })

			const done = () => {
				if (closed) return
				closed = true
				resolveClosed()
			}

			res.setEncoding('utf8')
			res.on('data', chunk => {
				buffer += chunk

				for (let index = buffer.indexOf('\n\n'); index >= 0; index = buffer.indexOf('\n\n')) {
					const raw = buffer.slice(0, index)
					buffer = buffer.slice(index + 2)
					const data = raw
						.split('\n')
						.filter(line => line.startsWith('data:'))
						.map(line => line.slice(5).trimStart())
						.join('\n')

					if (!data) continue

					messages.push(data)
					const waiter = waiters.shift()
					waiter?.(data)
				}
			})
			res.on('end', done)
			res.on('close', done)

			settled = true
			resolve({
				req,
				res,
				messages,
				waitForMessage: (timeout = 5_000) => {
					if (messages.length > 0) return Promise.resolve(messages[0])
					return waitFor(new Promise<string>(resolve => waiters.push(resolve)), timeout, 'Timed out waiting for SSE message')
				},
				waitForClose: (timeout = 5_000) =>
					waitFor(closePromise, timeout, 'Timed out waiting for SSE close'),
				close: () => {
					req.destroy()
					res.destroy()
				},
			})
		})

		req.setTimeout(5_000, () => {
			if (settled) return
			settled = true
			req.destroy()
			reject(new Error('Timed out opening SSE stream'))
		})
		req.on('error', error => {
			if (!settled) {
				settled = true
				reject(error)
			}
		})
	})

const hashCredential = (plain: string) => createHash('sha256').update(plain).digest('hex')

test('SSE updates private routes while the session remains valid', async ({ baseURL }) => {
	const admin = await playwrightRequest.newContext({ baseURL })
	const other = await playwrightRequest.newContext({ baseURL })
	let stream: EventStream | undefined

	try {
		await loginRequest(admin, baseURL!, adminCredentials)

		stream = await openEventStream(baseURL!, '/admin/sessions', cookieHeader(await admin.storageState()))
		expect(stream.res.statusCode).toBe(200)

		await loginRequest(other, baseURL!, adminCredentials)

		const message = JSON.parse(await stream.waitForMessage()) as { data?: unknown[]; hash?: string }

		expect(message.hash).toBeTruthy()
		expect(message.data?.length).toBeGreaterThan(0)
	} finally {
		stream?.close()
		await admin.dispose()
		await other.dispose()
	}
})

test('SSE closes without revalidating private data after its session is revoked', async ({ baseURL }) => {
	const email = `sse-revoke-${Date.now()}@example.com`
	const credentials = { email, password: 'password' }
	await createUser({ email, name: 'SSE Revoked User' })

	const admin = await playwrightRequest.newContext({ baseURL })
	const user = await playwrightRequest.newContext({ baseURL })
	let stream: EventStream | undefined

	try {
		await loginRequest(admin, baseURL!, adminCredentials)
		await loginRequest(user, baseURL!, credentials)

		const userState = await user.storageState()
		const session = userState.cookies.find(cookie => cookie.name === 'session')?.value

		expect(session).toBeTruthy()

		stream = await openEventStream(baseURL!, '/dashboard', cookieHeader(userState))
		expect(stream.res.statusCode).toBe(200)

		const revoke = await admin.post('/admin/sessions?/revoke', {
			headers: actionHeaders(baseURL!),
			data: { id: hashCredential(session!) },
		})

		expect(revoke.status()).toBe(200)
		await expect(revoke.json()).resolves.toMatchObject({ revoked: true })

		await stream.waitForClose()
		expect(stream.messages).toHaveLength(0)
	} finally {
		stream?.close()
		await admin.dispose()
		await user.dispose()
	}
})
