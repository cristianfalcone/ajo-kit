import { describe, expect, test } from 'vitest'
import { compile } from '../src/node'

describe('ajo-kit node helpers', () => {
	test('compile replaces SSR slots and drops missing slots', () => {
		const template = compile('<head><!-- ssr:head --></head><!-- ssr:data --><!-- ssr:missing -->')

		expect(template({ head: '<title>Ajo</title>', data: '<script></script>' }))
			.toBe('<head><title>Ajo</title></head><script></script>')
	})
})
