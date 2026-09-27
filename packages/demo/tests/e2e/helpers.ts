import { get, type ClientRequest, type IncomingMessage } from 'node:http'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const admin = {
	email: 'cristian@example.com',
	password: 'password',
}

export const member = {
	email: 'emily@example.com',
	password: 'password',
}

export const proof = (base: string) => ({
	Accept: 'application/json',
	Origin: base,
})

export async function login(request: APIRequestContext, base: string, credentials = admin) {
	const response = await request.post('/login?/default', {
		headers: proof(base),
		data: credentials,
	})

	expect(response.status()).toBe(200)

	return response.json()
}

/** Reads the page loader data of a route through its JSON navigation response. */
export async function data(request: APIRequestContext, path: string) {
	const response = await request.get(path, { headers: { Accept: 'application/json' } })

	expect(response.status()).toBe(200)

	return (await response.json()).data.at(-1)
}

export async function signin(page: Page, credentials = admin) {
	await goto(page, '/login')
	await page.locator('input[name="email"]').fill(credentials.email)
	await page.locator('input[name="password"]').fill(credentials.password)
	await page.getByRole('button', { name: 'Sign In' }).click()
	await expect(page).toHaveURL(/\/dashboard$/)
}

export async function ready(page: Page) {
	await page.locator('html[data-ajo-ready="true"]').waitFor()
}

export async function goto(page: Page, url: string) {
	await page.goto(url)
	await ready(page)
}

/** Whether a Vary header lists the token. */
export const vary = (value: string | undefined, token: string) =>
	value?.toLowerCase().split(',').map(part => part.trim()).includes(token.toLowerCase())

export type Stream = {
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

/** Opens an SSE stream on a route and collects the data of each event. */
export const open = (base: string, path: string, cookie = '') =>
	new Promise<Stream>((resolve, reject) => {
		let settled = false
		const req = get(new URL(path, base), {
			headers: {
				Accept: 'text/event-stream',
				...(cookie && { Cookie: cookie }),
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
