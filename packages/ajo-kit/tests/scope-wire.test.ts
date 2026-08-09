// The server half of the cache scope: where the label comes from, which
// channels carry it, and — the reason all of this exists — that the fresh
// 304 shortcut never confirms one identity's material for another. The last
// test in the first block is the leak ce8bc85 closed halfway: B presenting
// A's freshness material must reach the loaders and get B's own answer.

import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import type { Middleware, Request } from '../src/http'

// A ware that lets each test choose an identity per request: a session id, a
// bearer token id, or an explicit scope override — the three seams the
// derivation reads, plus anonymous when none is present.
const identity: Middleware = (req, _res, next) => {
	const session = req.headers['x-test-session']
	const token = req.headers['x-test-token']
	const override = req.headers['x-test-scope']
	if (typeof session === 'string') req.session = { id: session }
	if (typeof token === 'string') req.token = { id: token, abilities: [] }
	if (typeof override === 'string') req.scope = override
	next()
}

let revision = 0

vi.mock('virtual:ajo/routes', () => ({
	routes: {
		'/src/page.tsx': async () => ({ default: () => null }),
	},
}))

vi.mock('virtual:ajo/handlers', () => ({
	handlers: {
		'/src/handler.ts': async () => ({
			page: async (req: Request) => {
				req.track?.('greetings')
				// Per-identity data, derived but not reversible: identical
				// payloads would make the content-identity 304 legitimate and
				// the leak test meaningless. The revision moves only when a
				// test asks it to, so the live channel has something to push.
				return {
					greeting: req.session ? `user-${req.session.id.slice(0, 2)}` : 'anon',
					revision,
				}
			},
		}),
	},
	wares: {
		'/src/wares.ts': async () => ({ default: [identity] }),
	},
}))

let server: Server
let origin: string

beforeAll(async () => {
	const { create } = await import('../src/server')
	const app = await create(slots => `${slots.head ?? ''}|${slots.data ?? ''}|${slots.root ?? ''}`)
	server = createServer(app.handler as Parameters<typeof createServer>[1])
	await new Promise<void>(resolve => server.listen(0, resolve))
	origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((resolve, reject) =>
	server.close(error => error ? reject(error) : resolve())))

type Body = {
	data: unknown[]
	hash: string
	topics: string[]
	versions: Record<string, number>
	scope: string
}

const json = async (headers: Record<string, string> = {}) => {
	const response = await fetch(`${origin}/`, {
		headers: { Accept: 'application/json', ...headers },
	})
	return { response, body: response.status === 304 ? undefined : await response.json() as Body }
}

describe('where the scope comes from', () => {
	test('an anonymous request is scoped anon', async () => {
		const { body } = await json()
		expect(body!.scope).toBe('anon')
	})

	test('a session yields a stable opaque label, never the session id itself', async () => {
		const first = await json({ 'X-Test-Session': 'alpha-session-id' })
		const again = await json({ 'X-Test-Session': 'alpha-session-id' })

		expect(again.body!.scope).toBe(first.body!.scope)
		expect(first.body!.scope).not.toBe('anon')
		// The session id is a database lookup key; the wire must never carry it.
		expect(JSON.stringify(first.body)).not.toContain('alpha-session-id')
	})

	test('different identities get different labels', async () => {
		const alpha = await json({ 'X-Test-Session': 'alpha-session-id' })
		const beta = await json({ 'X-Test-Session': 'beta-session-id' })

		expect(beta.body!.scope).not.toBe(alpha.body!.scope)
	})

	// Token, session and user ids are independent keyspaces. An auth layer
	// numbering all three from one — token 42 belonging to user 7, user 42
	// elsewhere — must not hand them the same partition.
	test('the same raw id in a different keyspace is a different label', async () => {
		const session = await json({ 'X-Test-Session': 'shared-id' })
		const token = await json({ 'X-Test-Token': 'shared-id' })

		expect(token.body!.scope).not.toBe(session.body!.scope)
	})

	test('an auth layer that sets req.scope wins over derivation', async () => {
		const { body } = await json({ 'X-Test-Session': 'alpha-session-id', 'X-Test-Scope': 'custom' })
		expect(body!.scope).toBe('custom')
	})

	test('the SSR document carries the scope for hydration to adopt', async () => {
		const response = await fetch(`${origin}/`, { headers: { 'X-Test-Session': 'alpha-session-id' } })
		const html = await response.text()
		const { body } = await json({ 'X-Test-Session': 'alpha-session-id' })

		expect(html).toContain('__SSR__')
		expect(html).toContain(body!.scope)
		expect(html).not.toContain('alpha-session-id')
	})

	// The third channel. Without this the live handler could stop declaring or
	// stop honouring the scope and every other test would stay green.
	test('the live channel declares the scope in its messages', async () => {
		const { body } = await json({ 'X-Test-Session': 'alpha-session-id' })
		const controller = new AbortController()

		const response = await fetch(`${origin}/`, {
			headers: { Accept: 'text/event-stream', 'X-Test-Session': 'alpha-session-id' },
			signal: controller.signal,
		})

		const reader = response.body!.getReader()
		const { emit } = await import('../src/server')

		// One emit on the topic the page tracks; the first data frame is ours.
		const frame = (async () => {
			const decoder = new TextDecoder()
			let buffer = ''
			while (!buffer.includes('\n\n') || !buffer.includes('data:')) {
				const { value, done } = await reader.read()
				if (done) break
				buffer += decoder.decode(value, { stream: true })
			}
			return buffer
		})()

		setTimeout(() => { revision++; emit('greetings') }, 50)
		const text = await frame
		controller.abort()

		const line = text.split('\n').find(l => l.startsWith('data:'))!
		expect(JSON.parse(line.slice(5)).scope).toBe(body!.scope)
	})
})

describe('the fresh shortcut and the leak it must not reopen', () => {
	test('the owner of the material gets a fresh 304', async () => {
		const alpha = { 'X-Test-Session': 'alpha-session-id' }
		const { body } = await json(alpha)

		const { response } = await json({
			...alpha,
			'X-Have': body!.hash,
			'X-Ajo-Versions': JSON.stringify(body!.versions),
			'X-Ajo-Scope': body!.scope,
		})

		expect(response.status).toBe(304)
		expect(response.headers.get('x-ajo-cache')).toBe('fresh')
	})

	test('another identity presenting that material reaches the loaders', async () => {
		const { body: alpha } = await json({ 'X-Test-Session': 'alpha-session-id' })

		// The pre-scope leak: B navigates with A's cached hash and versions in
		// the same tab. The shortcut used to confirm them without running a
		// loader; now the scope mismatch sends B down the loader path and the
		// answer is computed as B.
		const { response, body } = await json({
			'X-Test-Session': 'beta-session-id',
			'X-Have': alpha!.hash,
			'X-Ajo-Versions': JSON.stringify(alpha!.versions),
			'X-Ajo-Scope': alpha!.scope,
		})

		expect(response.status).toBe(200)
		expect(body!.scope).not.toBe(alpha!.scope)
		// Not merely a different label on the same material: the payload is B's.
		expect(JSON.stringify(body!.data)).toContain('user-be')
		expect(JSON.stringify(body!.data)).not.toContain('user-al')
	})

	test('freshness material without a scope proof reaches the loaders', async () => {
		const alpha = { 'X-Test-Session': 'alpha-session-id' }
		const { body } = await json(alpha)

		const { response } = await json({
			...alpha,
			'X-Have': body!.hash,
			'X-Ajo-Versions': JSON.stringify(body!.versions),
		})

		// Not fresh: an old client that cannot prove its partition gets the
		// loader path. The content-identity 304 may still apply — that one is
		// computed from this request's own loaders, so it cannot leak.
		expect(response.headers.get('x-ajo-cache')).not.toBe('fresh')
	})
})
