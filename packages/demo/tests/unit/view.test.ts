import { afterEach, expect, test, vi } from 'vitest'
import { agent, ago, instant } from '/src/view'

const zone = process.env.TZ

afterEach(() => {
	process.env.TZ = zone
	vi.useRealTimers()
})

test('agent names Edge before the Chrome it embeds and Android before Linux', () => {
	const edge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
	const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
	const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

	expect(agent(edge)).toBe('Edge on Windows')
	expect(agent(android)).toBe('Chrome on Android')
	expect(agent(iphone)).toBe('Safari on iOS')
	expect(agent(null)).toBe('Unknown device')
})

test('instant reads SQLite CURRENT_TIMESTAMP values as UTC, like ISO ones', () => {
	process.env.TZ = 'America/Argentina/Buenos_Aires'

	expect(instant('2026-09-27 10:00:00').toISOString()).toBe('2026-09-27T10:00:00.000Z')
	expect(instant('2026-09-27T10:00:00.000Z').toISOString()).toBe('2026-09-27T10:00:00.000Z')
})

test('ago speaks relative time for SQLite and ISO timestamps', () => {
	process.env.TZ = 'America/Argentina/Buenos_Aires'
	vi.useFakeTimers({ now: Date.parse('2026-09-27T12:00:00Z') })

	expect(ago('2026-09-27T11:59:50.000Z')).toBe('now')
	expect(ago('2026-09-27 11:55:00')).toBe('5 minutes ago')
	expect(ago('2026-09-27 09:00:00')).toBe('3 hours ago')
	expect(ago('2026-09-25T12:00:00.000Z')).toBe('2 days ago')
})
