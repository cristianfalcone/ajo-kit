import { describe, expect, test } from 'vitest'
import * as ssr from '../src/ssr'

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
