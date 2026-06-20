import { createHash } from 'node:crypto'
import { get, type ClientRequest, type IncomingMessage } from 'node:http'
import { expect, request, test } from '@playwright/test'
import { proof, admin as creds, make, login } from './helpers'

type Stream = {
	req: ClientRequest
	res: IncomingMessage
	messages: string[]
	waitForMessage: (timeout?: number) => Promise<string>
	waitForClose: (timeout?: number) => Promise<void>
	close: () => void
}

const wait = <T,>(promise: Promise<T>, timeout: number, message: string) =>
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

const cookie = (state: { cookies: Array<{ name: string; value: string }> }) =>
	state.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')

const open = (base: string, path: string, cookie: string) =>
	new Promise<Stream>((resolve, reject) => {
		let settled = false
		const req = get(new URL(path, base), {
			headers: {
				Accept: 'text/event-stream',
				Cookie: cookie,
			}
		}, res => {
			const messages: string[] = []
			const waiters: Array<(message: string) => void> = []
			let buffer = ''
			let ended = false
			let release!: () => void
			const closed = new Promise<void>(resolve => { release = resolve })

			const done = () => {
				if (ended) return
				ended = true
				release()
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
					return wait(new Promise<string>(resolve => waiters.push(resolve)), timeout, 'Timed out waiting for SSE message')
				},
				waitForClose: (timeout = 5_000) =>
					wait(closed, timeout, 'Timed out waiting for SSE close'),
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

test('SSE closes without revalidating private data after its session is revoked', async ({ baseURL: base }) => {
	const email = `sse-revoke-${Date.now()}@example.com`
	const credentials = { email, password: 'password' }
	await make({ email, name: 'SSE Revoked User' })

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
		expect(stream.messages).toHaveLength(0)
	} finally {
		stream?.close()
		await root.dispose()
		await client.dispose()
	}
})
