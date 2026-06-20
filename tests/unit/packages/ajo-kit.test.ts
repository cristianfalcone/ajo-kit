import { mkdtempSync as temp, rmSync as rm } from 'node:fs'
import { createServer as server } from 'node:http'
import type { AddressInfo as Address } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach as after, describe, expect, test, vi } from 'vitest'
import { close, connect } from '../../../packages/ajo-kit/src/database'
import { merge, render } from '../../../packages/ajo-kit/src/head'
import { body } from '../../../packages/ajo-kit/src/form'
import {
	max,
	ttl,
	clear,
	get,
	invalidate,
	set,
} from '../../../packages/ajo-kit/src/cache'
import * as ssr from '../../../packages/ajo-kit/src/ssr'
import { Failure, Invalid, ip, normalize, origin } from '../../../packages/ajo-kit/src/constants'
import type { State } from '../../../packages/ajo-kit/src/constants'
import { kit } from '../../../packages/ajo-kit/src/vite'
import { object, parse, string, minLength as min, pipe } from '../../../packages/ajo-kit/src/validate'
import {
	finish,
	header,
	start,
	type Result,
} from '../../../packages/ajo-kit/src/timing'
import { compile, listen } from '../../../packages/ajo-kit/src/node'

const timing = process.env.AJO_TIMING
const app = process.env.APP_URL
const proxy = process.env.TRUST_PROXY
const env = process.env.NODE_ENV
const dbpath = process.env.DATABASE_PATH

const restore = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

after(async () => {
	restore('AJO_TIMING', timing)
	restore('APP_URL', app)
	restore('TRUST_PROXY', proxy)
	restore('NODE_ENV', env)
	restore('DATABASE_PATH', dbpath)
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	clear()
	await close()
})

describe('ajo-kit head', () => {
	test('merge deduplicates keyed entries and lets later heads win', () => {
		const head = merge(
			{
				title: 'Base',
				meta: [
					{ name: 'viewport', content: 'width=device-width' },
					{ property: 'og:title', content: 'Base' },
				],
				link: [{ rel: 'icon', href: '/old.ico' }],
			},
			{
				title: 'Page',
				meta: [
					{ name: 'description', content: 'Page description' },
					{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
					{ property: 'og:type', content: 'website' },
				],
				link: [{ rel: 'icon', href: '/favicon.ico' }],
			},
		)

		expect(head).toEqual({
			title: 'Page',
			meta: [
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{ property: 'og:title', content: 'Base' },
				{ name: 'description', content: 'Page description' },
				{ property: 'og:type', content: 'website' },
			],
			link: [{ rel: 'icon', href: '/favicon.ico' }],
		})
	})

	test('render emits title, description, canonical, meta and links', () => {
		const html = render({
			title: 'Docs',
			meta: [
				{ name: 'description', content: 'Ajo docs' },
				{ property: 'og:type', content: 'website' },
			],
			link: [
				{ rel: 'canonical', href: 'https://app.test/docs' },
				{ rel: 'icon', href: '/favicon.ico' },
			],
		})

		expect(html).toContain('<title>Docs</title>')
		expect(html).toContain('name="description"')
		expect(html).toContain('content="Ajo docs"')
		expect(html).toContain('rel="canonical"')
		expect(html).toContain('href="https://app.test/docs"')
		expect(html).toContain('property="og:type"')
		expect(html).toContain('href="/favicon.ico"')
	})
})

describe('ajo-kit validation and errors', () => {
	test('parse returns typed output and throws Invalid with field details', () => {
		const Schema = object({ name: pipe(string(), min(3, 'Name too short')) })

		expect(parse(Schema, { name: 'Ajo' })).toEqual({ name: 'Ajo' })

		try {
			parse(Schema, { name: 'Aj' })
			throw new Error('expected parse to throw')
		} catch (error) {
			expect(error).toBeInstanceOf(Invalid)
			expect((error as Invalid).status).toBe(400)
			expect((error as Invalid).fields.name).toContain('Name too short')
		}
	})

	test('Failure serializes stable status and message', () => {
		expect(new Failure(418, 'Short and stout').toJSON()).toMatchObject({
			status: 418,
			message: 'Short and stout',
		})
	})

	test('Failure masks internal production messages', () => {
		process.env.NODE_ENV = 'production'

		expect(new Failure(500, 'database exploded').toJSON()).toEqual({
			status: 500,
			message: 'Internal Server Error',
		})
		expect(normalize(new Error('secret stack detail')).toJSON()).toEqual({
			status: 500,
			message: 'Internal Server Error',
		})
		expect(new Invalid({ name: ['Required'] }).toJSON()).toMatchObject({
			status: 400,
			message: 'Validation failed',
			fields: { name: ['Required'] },
		})
	})
})

describe('ajo-kit request security helpers', () => {
	test('uses forwarded client IPs only when proxy trust is explicit', () => {
		const req = {
			headers: { 'x-forwarded-for': '203.0.113.8, 10.0.0.1' },
			socket: { remoteAddress: '10.0.0.5' },
		} as any

		delete process.env.TRUST_PROXY
		expect(ip(req)).toBe('10.0.0.5')

		process.env.TRUST_PROXY = '1'
		expect(ip(req)).toBe('203.0.113.8')
		expect(ip({
			headers: { 'x-forwarded-for': 'bad, ::ffff:127.0.0.1' },
			socket: { remoteAddress: '10.0.0.5' },
		} as any)).toBe('10.0.0.5')
	})

	test('uses APP_URL as the trusted origin and requires it in production', () => {
		const req = {
			headers: {
				host: 'evil.test',
				'x-forwarded-proto': 'https',
			},
		} as any

		process.env.APP_URL = 'https://app.test/base'
		expect(origin(req)).toBe('https://app.test')

		delete process.env.APP_URL
		process.env.NODE_ENV = 'production'
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => origin(req)).toThrow('APP_URL is required in production')
		expect(log).toHaveBeenCalledWith('[security] APP_URL is required in production')
		expect(origin({ headers: { host: 'localhost:5173' } } as any)).toBe('http://localhost:5173')
		expect(origin({ headers: { host: '127.0.0.1:5173' } } as any)).toBe('http://127.0.0.1:5173')

		log.mockClear()
		process.env.APP_URL = 'ftp://app.test'
		expect(() => origin(req)).toThrow('Invalid APP_URL')
		expect(log).toHaveBeenCalledWith('[security] Invalid APP_URL')

		process.env.NODE_ENV = 'development'
		process.env.TRUST_PROXY = '1'
		delete process.env.APP_URL
		expect(origin({ headers: { host: 'local.test', 'x-forwarded-proto': 'https' } } as any)).toBe('https://local.test')
	})
})

describe('ajo-kit client actions', () => {
	test('body preserves repeated field names as arrays', () => {
		const data = new FormData()

		data.set('name', 'Deploy key')
		data.append('abilities', 'read')
		data.append('abilities', 'write')

		expect(body(data)).toEqual({
			name: 'Deploy key',
			abilities: ['read', 'write'],
		})
	})

	test('body keeps a single selected value as an array for known array fields', () => {
		const data = new FormData()

		data.set('name', 'Deploy key')
		data.append('abilities', 'read')

		expect(body(data, new Set(['abilities']))).toEqual({
			name: 'Deploy key',
			abilities: ['read'],
		})
	})
})

describe('ajo-kit vite plugin', () => {
	test('custom guard patterns are added to defaults', async () => {
		const plugin = kit({ guard: [/custom-only/] }).find(plugin => plugin.name === 'ajo-server-only')!
		const hook = plugin.resolveId as { handler: (source: string, importer?: string) => Promise<void> }
		const context = {
			environment: { name: 'client' },
			resolve: async (source: string) => ({ id: source }),
		}

		await expect(hook.handler.call(context, '/project/src/data/store.ts', '/project/src/page.tsx')).rejects.toThrow('Server-only module')
		await expect(hook.handler.call(context, '/project/custom-only/secret.ts', '/project/src/page.tsx')).rejects.toThrow('Server-only module')
	})
})

describe('ajo-kit SSR payload', () => {
	test('ssr.serialize is safe inside script tags and round-trips values', () => {
		const value = {
			text: '</script><script>globalThis.__xss=1</script>',
			html: '<img src=x onerror=alert(1)>',
			ampersand: '&',
			line: '\u2028',
			paragraph: '\u2029',
			date: new Date('2026-06-19T00:00:00.000Z'),
			map: new Map([['key', 'value']]),
			set: new Set(['a', 'b']),
			big: 10n,
			missing: undefined,
		}

		const serialized = ssr.serialize(value)

		expect(serialized).not.toContain('</script>')
		expect(serialized).not.toContain('<img')
		expect(serialized).not.toContain('\u2028')
		expect(serialized).not.toContain('\u2029')

		const parsed = ssr.parse<typeof value>(serialized)

		expect(parsed.text).toBe(value.text)
		expect(parsed.html).toBe(value.html)
		expect(parsed.ampersand).toBe('&')
		expect(parsed.date).toEqual(value.date)
		expect(parsed.map.get('key')).toBe('value')
		expect(parsed.set.has('a')).toBe(true)
		expect(parsed.big).toBe(10n)
		expect('missing' in parsed).toBe(true)
		expect(parsed.missing).toBeUndefined()
	})

	test('ssr.script emits a data script, not executable boot code', () => {
		const script = ssr.script({ url: '/dashboard' })

		expect(script).toContain('type="application/json"')
		expect(script).toContain('id="__SSR__"')
		expect(script).not.toContain('globalThis.__SSR__')
	})

})

describe('ajo-kit route cache', () => {
	const state = (url: string, topics: string[] = ['topic']): State => ({
		url,
		params: {},
		data: [],
		loading: false,
		topics,
	})

	test('get updates usage and expires stale entries', () => {
		set('/old', state('/old'), { now: 0 })

		expect(get('/old', ttl)).toBeTruthy()
		expect(get('/old', ttl + 1)).toBeUndefined()
	})

	test('set prunes least recently used inactive entries', () => {
		for (let i = 0; i < max; i++) set(`/page-${i}`, state(`/page-${i}`), { now: i })

		get('/page-0', max + 1)
		set('/active', state('/active'), { active: '/active', now: max + 2 })
		set('/extra', state('/extra'), { active: '/active', now: max + 3 })

		expect(get('/active', max + 3)).toBeTruthy()
		expect(get('/page-0', max + 3)).toBeTruthy()
		expect(get('/page-1', max + 3)).toBeUndefined()
	})

	test('invalidate removes only matching topic entries', () => {
		set('/tokens', state('/tokens', ['tokens:1']))
		set('/sessions', state('/sessions', ['sessions:1']))

		invalidate(['tokens:1'])

		expect(get('/tokens')).toBeUndefined()
		expect(get('/sessions')).toBeTruthy()
	})
})

describe('ajo-kit timing and database', () => {
	test('compile replaces SSR slots and drops missing slots', () => {
		const template = compile('<head><!-- ssr:head --></head><!-- ssr:data --><!-- ssr:missing -->')

		expect(template({ head: '<title>Ajo</title>', data: '<script></script>' }))
			.toBe('<head><title>Ajo</title></head><script></script>')
	})

	test('strict listen rejects an occupied port instead of incrementing', async () => {
		const busy = server((_, res) => res.end('busy'))

		await new Promise<void>((resolve, reject) => {
			busy.listen(0, resolve).once('error', reject)
		})

		const address = busy.address()
		if (!address || typeof address === 'string') throw new Error('Expected TCP test port')

		try {
			await expect(
				listen({ handler: (_: unknown, res: { end: (body: string) => void }) => res.end('ok') }, (address as Address).port, { strict: true })
			).rejects.toMatchObject({ code: 'EADDRINUSE' })
		} finally {
			await new Promise<void>((resolve, reject) => {
				busy.close(error => error ? reject(error) : resolve())
			})
		}
	})

	test('timing flag honors disabled values and formats Server-Timing', () => {
		process.env.AJO_TIMING = '0'
		expect(start()).toBeUndefined()

		process.env.AJO_TIMING = '1'
		expect(start()).toMatchObject({ start: expect.any(Number) })

		const result: Result = {
			start: 0,
			total: 12.3,
			loader: 4.5,
			render: 6.7,
			status: 200,
			bytes: 123,
		}

		expect(header(result)).toBe('total;dur=12.3, loader;dur=4.5, render;dur=6.7')
		expect(finish(undefined, { status: 304, bytes: 0 })).toBeUndefined()
	})

	test('connect applies runtime SQLite pragmas', async () => {
		const dir = temp(join(tmpdir(), 'ajo-kit-db-'))
		const path = join(dir, 'test.sqlite')

		try {
			const sqlite = connect(path)

			expect(sqlite.pragma('journal_mode', { simple: true })).toBe('wal')
			expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
			expect(sqlite.pragma('busy_timeout', { simple: true })).toBe(5000)
			expect(sqlite.pragma('synchronous', { simple: true })).toBe(1)
		} finally {
			await close()
			rm(dir, { recursive: true, force: true })
		}
	})

	test('app unread count uses ISO timestamp ordering and active chat exclusion', async () => {
		const dir = temp(join(tmpdir(), 'ajo-kit-unread-'))
		const path = join(dir, 'test.sqlite')

		process.env.DATABASE_PATH = path

		try {
			vi.doMock('@kit/database', () => import('../../../packages/ajo-kit/src/database'))
			vi.doMock('@kit/validate', () => import('../../../packages/ajo-kit/src/validate'))
			const { db: open, unread } = await import('../../../src/data/index')
			const store = open()

			await store.schema
				.createTable('participants')
				.addColumn('chat', 'integer')
				.addColumn('user', 'integer')
				.addColumn('seen', 'text')
				.execute()
			await store.schema
				.createTable('messages')
				.addColumn('id', 'integer', c => c.primaryKey())
				.addColumn('chat', 'integer')
				.addColumn('user', 'integer')
				.addColumn('text', 'text')
				.addColumn('created', 'text')
				.execute()

			await store.insertInto('participants').values([
				{ chat: 1, user: 1, seen: '2026-06-19T10:00:00.000Z' },
				{ chat: 2, user: 1, seen: null },
			]).execute()
			await store.insertInto('messages').values([
				{ id: 1, chat: 1, user: 2, text: 'old', created: '2026-06-19T09:59:59.000Z' },
				{ id: 2, chat: 1, user: 2, text: 'new', created: '2026-06-19T10:00:01.000Z' },
				{ id: 3, chat: 1, user: 1, text: 'own', created: '2026-06-19T10:00:02.000Z' },
				{ id: 4, chat: 2, user: 2, text: 'unseen', created: '2026-06-19T08:00:00.000Z' },
			]).execute()

			await expect(unread(1)).resolves.toBe(2)
			await expect(unread(1, 1)).resolves.toBe(1)
		} finally {
			vi.doUnmock('@kit/database')
			vi.doUnmock('@kit/validate')
			await close()
			rm(dir, { recursive: true, force: true })
		}
	})

	test('sample seed fetches remote data before deleting local tables', async () => {
		const fetch = vi.fn(async () => ({ ok: false }))
		const db = { deleteFrom: vi.fn() }
		vi.stubGlobal('fetch', fetch)

		const { seed } = await import('../../../db/seeds/sample')

		await expect(seed(db as any)).rejects.toThrow('Failed to fetch')
		expect(fetch).toHaveBeenCalledWith('https://dummyjson.com/users?limit=10')
		expect(db.deleteFrom).not.toHaveBeenCalled()
	})
})
