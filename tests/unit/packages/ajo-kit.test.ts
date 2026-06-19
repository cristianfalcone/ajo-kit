import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { close, connect } from '../../../packages/ajo-kit/src/database'
import { merge, render } from '../../../packages/ajo-kit/src/head'
import { formDataBody } from '../../../packages/ajo-kit/src/form'
import { AppError, InvalidError } from '../../../packages/ajo-kit/src/constants'
import { object, parse, string, minLength, pipe } from '../../../packages/ajo-kit/src/validate'
import {
	finishRouteTiming,
	serverTiming,
	timingEnabled,
	type TimingResult,
} from '../../../packages/ajo-kit/src/timing'

const previousTiming = process.env.AJO_TIMING

afterEach(async () => {
	process.env.AJO_TIMING = previousTiming
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
