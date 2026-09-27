import { afterEach, describe, expect, test, vi } from 'vitest'
import { finish, header, start, type Result } from '../src/timing'
import { request } from '../src/http'

const timing = process.env.AJO_TIMING

afterEach(() => {
	if (timing === undefined) delete process.env.AJO_TIMING
	else process.env.AJO_TIMING = timing
})

describe('ajo-kit timing', () => {
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
		expect(finish({ start: 0 }, { status: 304, bytes: 0 })).toMatchObject({ status: 304, bytes: 0, total: expect.any(Number) })
	})

	test('a timed route reports its phases and body bytes without writing a length', async () => {
		const { create } = await import('../src/server')
		const app = await create('', {
			routes: { '/src/page.tsx': async () => ({ default: () => null }) },
			handlers: { '/src/handler.ts': async () => ({ page: async () => ({ word: 'héllo' }) }) },
			wares: {},
		})
		const get = () => app(request({ method: 'GET', target: '/', headers: { accept: 'application/json' }, read: async () => new Uint8Array() }))
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		process.env.AJO_TIMING = '1'
		const timed = await get()
		const bytes = new TextEncoder().encode(String(timed.body)).byteLength

		expect(timed.getHeader('server-timing')).toMatch(/^total;dur=[\d.]+, loader;dur=[\d.]+, render;dur=[\d.]+$/)
		expect(log).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[ajo\\] GET / 200 miss .* bytes=${bytes}$`)))
		expect(timed.hasHeader('x-ajo-bytes')).toBe(false)
		expect(timed.hasHeader('content-length')).toBe(false)

		process.env.AJO_TIMING = '0'
		expect((await get()).hasHeader('server-timing')).toBe(false)
	})
})
