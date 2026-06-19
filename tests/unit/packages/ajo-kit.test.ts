import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { close, connect } from '../../../packages/ajo-kit/src/database'
import { merge, render } from '../../../packages/ajo-kit/src/head'
import { formDataBody } from '../../../packages/ajo-kit/src/form'
import {
	CACHE_MAX,
	CACHE_TTL,
	cache,
	clearCache,
	getCache,
	invalidateCache,
	setCache,
} from '../../../packages/ajo-kit/src/cache'
import { parseSSR, renderSSRScript, serializeSSR } from '../../../packages/ajo-kit/src/ssr'
import { AppError, InvalidError, ip, trustedOrigin } from '../../../packages/ajo-kit/src/constants'
import type { State } from '../../../packages/ajo-kit/src/constants'
import { object, parse, string, minLength, pipe } from '../../../packages/ajo-kit/src/validate'
import {
	finishRouteTiming,
	serverTiming,
	timingEnabled,
	type TimingResult,
} from '../../../packages/ajo-kit/src/timing'

const previousTiming = process.env.AJO_TIMING
const previousAppUrl = process.env.APP_URL
const previousTrustProxy = process.env.TRUST_PROXY
const previousNodeEnv = process.env.NODE_ENV

const restoreEnv = (key: string, value: string | undefined) => {
	if (value === undefined) delete process.env[key]
	else process.env[key] = value
}

afterEach(async () => {
	restoreEnv('AJO_TIMING', previousTiming)
	restoreEnv('APP_URL', previousAppUrl)
	restoreEnv('TRUST_PROXY', previousTrustProxy)
	restoreEnv('NODE_ENV', previousNodeEnv)
	clearCache()
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
				description: 'Page description',
				meta: [
					{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
					{ property: 'og:type', content: 'website' },
				],
				link: [{ rel: 'icon', href: '/favicon.ico' }],
			},
		)

		expect(head).toEqual({
			title: 'Page',
			description: 'Page description',
			meta: [
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{ property: 'og:title', content: 'Base' },
				{ property: 'og:type', content: 'website' },
			],
			link: [{ rel: 'icon', href: '/favicon.ico' }],
		})
	})

	test('render emits title, description, canonical, meta and links', () => {
		const html = render({
			title: 'Docs',
			description: 'Ajo docs',
			canonical: 'https://app.test/docs',
			meta: [{ property: 'og:type', content: 'website' }],
			link: [{ rel: 'icon', href: '/favicon.ico' }],
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
	test('parse returns typed output and throws InvalidError with field details', () => {
		const Schema = object({ name: pipe(string(), minLength(3, 'Name too short')) })

		expect(parse(Schema, { name: 'Ajo' })).toEqual({ name: 'Ajo' })

		try {
			parse(Schema, { name: 'Aj' })
			throw new Error('expected parse to throw')
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidError)
			expect((error as InvalidError).status).toBe(400)
			expect((error as InvalidError).fields.name).toContain('Name too short')
		}
	})

	test('AppError serializes stable status and message', () => {
		expect(new AppError(418, 'Short and stout').toJSON()).toMatchObject({
			status: 418,
			message: 'Short and stout',
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
		expect(trustedOrigin(req)).toBe('https://app.test')

		delete process.env.APP_URL
		process.env.NODE_ENV = 'production'
		expect(() => trustedOrigin(req)).toThrow('APP_URL is required in production')

		process.env.NODE_ENV = 'development'
		process.env.TRUST_PROXY = '1'
		expect(trustedOrigin({ headers: { host: 'local.test', 'x-forwarded-proto': 'https' } } as any)).toBe('https://local.test')
	})
})

describe('ajo-kit client actions', () => {
	test('formDataBody preserves repeated field names as arrays', () => {
		const data = new FormData()

		data.set('name', 'Deploy key')
		data.append('abilities', 'read')
		data.append('abilities', 'write')

		expect(formDataBody(data)).toEqual({
			name: 'Deploy key',
			abilities: ['read', 'write'],
		})
	})

	test('formDataBody keeps a single selected value as an array for known array fields', () => {
		const data = new FormData()

		data.set('name', 'Deploy key')
		data.append('abilities', 'read')

		expect(formDataBody(data, new Set(['abilities']))).toEqual({
			name: 'Deploy key',
			abilities: ['read'],
		})
	})
})

describe('ajo-kit SSR payload', () => {
	test('serializeSSR is safe inside script tags and round-trips values', () => {
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

		const serialized = serializeSSR(value)

		expect(serialized).not.toContain('</script>')
		expect(serialized).not.toContain('<img')
		expect(serialized).not.toContain('\u2028')
		expect(serialized).not.toContain('\u2029')

		const parsed = parseSSR<typeof value>(serialized)

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

	test('renderSSRScript emits a data script, not executable boot code', () => {
		const script = renderSSRScript({ url: '/dashboard' })

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

	test('getCache updates usage and expires stale entries', () => {
		setCache('/old', state('/old'), { now: 0 })

		expect(getCache('/old', CACHE_TTL)).toBeTruthy()
		expect(getCache('/old', CACHE_TTL + 1)).toBeUndefined()
		expect(cache.has('/old')).toBe(false)
	})

	test('setCache prunes least recently used inactive entries', () => {
		for (let i = 0; i < CACHE_MAX; i++) setCache(`/page-${i}`, state(`/page-${i}`), { now: i })

		getCache('/page-0', CACHE_MAX + 1)
		setCache('/active', state('/active'), { activeUrl: '/active', now: CACHE_MAX + 2 })
		setCache('/extra', state('/extra'), { activeUrl: '/active', now: CACHE_MAX + 3 })

		expect(cache.has('/active')).toBe(true)
		expect(cache.has('/page-0')).toBe(true)
		expect(cache.size).toBeLessThanOrEqual(CACHE_MAX)
		expect(cache.has('/page-1')).toBe(false)
	})

	test('invalidateCache removes only matching topic entries', () => {
		setCache('/tokens', state('/tokens', ['tokens:1']))
		setCache('/sessions', state('/sessions', ['sessions:1']))

		invalidateCache(['tokens:1'])

		expect(cache.has('/tokens')).toBe(false)
		expect(cache.has('/sessions')).toBe(true)
	})
})

describe('ajo-kit timing and database', () => {
	test('timing flag honors disabled values and formats Server-Timing', () => {
		process.env.AJO_TIMING = '0'
		expect(timingEnabled()).toBe(false)

		process.env.AJO_TIMING = '1'
		expect(timingEnabled()).toBe(true)

		const result: TimingResult = {
			start: 0,
			total: 12.3,
			loader: 4.5,
			render: 6.7,
			status: 200,
			bytes: 123,
		}

		expect(serverTiming(result)).toBe('total;dur=12.3, loader;dur=4.5, render;dur=6.7')
		expect(finishRouteTiming(undefined, { status: 304, bytes: 0 })).toBeUndefined()
	})

	test('connect applies runtime SQLite pragmas', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ajo-kit-db-'))
		const path = join(dir, 'test.sqlite')

		try {
			const sqlite = connect(path)

			expect(sqlite.pragma('journal_mode', { simple: true })).toBe('wal')
			expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
			expect(sqlite.pragma('busy_timeout', { simple: true })).toBe(5000)
			expect(sqlite.pragma('synchronous', { simple: true })).toBe(1)
		} finally {
			await close()
			rmSync(dir, { recursive: true, force: true })
		}
	})
})
