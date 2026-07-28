// @vitest-environment happy-dom
// The client half of the cache scope: hydration adopts the server-declared
// label, every cache write lands under it, a response carrying a different
// label drops the previous partition outright, and revalidation presents the
// scope beside the freshness material. Login and logout are SPA redirects —
// no reload separates two identities in one tab — so this adoption dance is
// the only wall between them.

import { afterEach, expect, test, vi } from 'vitest'
import type { Page, State } from '../src/constants'

const load = async () => {
	const app = await import('../src/app')
	const cache = await import('../src/cache')
	return { ...app, cache }
}

afterEach(async () => {
	const { clear } = await import('../src/cache')
	clear()
	vi.unstubAllGlobals()
	// Fresh module state per test: the adopted scope is module-level in app.tsx.
	vi.resetModules()
})

const page = (): Page => ({
	segments: [''],
	loader: async () => ({ default: () => null }),
	params: {},
	pattern: '',
})

const drain = async (generator: AsyncGenerator<unknown>) => {
	for await (const _ of generator) { /* run to completion */ }
}

const state = (url: string, scope: string): State => ({
	url,
	params: {},
	data: [{}],
	loading: false,
	hash: 'h-' + url,
	scope,
})

test('hydration adopts the SSR scope and caches the first state under it', async () => {
	const { init, resolve, layouts, cache } = await load()

	init(state('/a', 'scope-a'))
	await drain(resolve('/a', layouts, page()))

	expect(cache.get('/a', { scope: 'scope-a' })).toBeTruthy()
	expect(cache.get('/a', { scope: 'scope-b' })).toBeUndefined()
})

test('a response with a new scope drops the previous partition before writing', async () => {
	const { init, resolve, layouts, cache } = await load()

	init(state('/a', 'scope-a'))
	await drain(resolve('/a', layouts, page()))
	expect(cache.get('/a', { scope: 'scope-a' })).toBeTruthy()

	// The next navigation answers as a different identity: the login/logout
	// SPA redirect case. The old partition must be gone, not merely shadowed.
	vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
		data: [{}],
		hash: 'h-b',
		scope: 'scope-b',
	}), { status: 200, headers: { 'Content-Type': 'application/json' } })))

	await drain(resolve('/b', layouts, page()))

	expect(cache.get('/b', { scope: 'scope-b' })).toBeTruthy()
	expect(cache.get('/a', { scope: 'scope-a' })).toBeUndefined()
})

test('revalidation presents the scope beside the freshness material', async () => {
	const { init, resolve, layouts } = await load()

	init(state('/a', 'scope-a'))
	await drain(resolve('/a', layouts, page()))

	const seen: Record<string, string>[] = []
	vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit) => {
		seen.push({ ...(init?.headers as Record<string, string>) })
		return new Response(JSON.stringify({ data: [{}], hash: 'h2', scope: 'scope-a' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}))

	await drain(resolve('/a', layouts, page()))

	expect(seen[0]['X-Have']).toBe('h-/a')
	expect(seen[0]['X-Ajo-Scope']).toBe('scope-a')
})

test('an unscoped boot caches nothing rather than guessing a partition', async () => {
	const { init, resolve, layouts, cache } = await load()

	// A server that declared no scope: the cache module fails closed, and the
	// client must not invent a label to force it open.
	init({ ...state('/a', ''), scope: undefined })
	await drain(resolve('/a', layouts, page()))

	expect(cache.get('/a', { scope: 'anon' })).toBeUndefined()
})

// Identity moves forward. These two hold the line against a reply computed
// under the previous identity — an abandoned navigation, a refresh dispatched
// before the cookie changed — undoing the identity that replaced it.
test('a response in flight across an identity change cannot roll the scope back', async () => {
	const { init, resolve, layouts, cache, current } = await load()

	init(state('/a', 'scope-a'))
	await drain(resolve('/a', layouts, page()))

	// A navigation issued as scope-a whose reply is still on the wire.
	let release!: (body: unknown) => void
	const slow = new Promise<unknown>(resolve => { release = resolve })

	vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/c'
		? new Response(JSON.stringify(await slow), { status: 200, headers: { 'Content-Type': 'application/json' } })
		: new Response(JSON.stringify({ data: [{}], hash: 'h-b', scope: 'scope-b' }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

	const pending = drain(resolve('/c', layouts, page()))

	// While it is in flight the identity changes: login, logout, either way a
	// navigation answers under a new scope.
	await drain(resolve('/b', layouts, page()))
	const era = current()
	expect(cache.get('/b', { scope: 'scope-b' })).toBeTruthy()

	// Now the old identity's reply finally lands.
	release({ data: [{ stale: true }], hash: 'h-old', scope: 'scope-a' })
	await pending

	// The client is still scope-b: its partition survived, and the stale
	// payload was not cached under an identity it does not belong to.
	expect(current()).toBe(era)
	expect(cache.get('/b', { scope: 'scope-b' })).toBeTruthy()
	expect(cache.get('/c', { scope: 'scope-b' })).toBeUndefined()
	expect(cache.get('/c', { scope: 'scope-a' })).toBeUndefined()
})
