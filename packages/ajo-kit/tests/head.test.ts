// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest'
import { render } from 'ajo/html'
import { apply, merge, range, view, type Head } from '../src/head'

const ssr = (head: Head) => range(render(view(head)))

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

	test('SSR escapes text and attribute values inside the managed range', () => {
		const html = ssr({
			title: 'Docs </title><script>alert(1)</script>',
			meta: [{ name: 'description', content: '"quoted" & <b>' }],
			link: [{ rel: 'canonical', href: 'https://app.test/docs?a=1&b="2"', 'bad name': 'dropped' }],
		})

		expect(html).toBe(
			'<!--ajo:head-->' +
			'<title>Docs &#60;/title&#62;&#60;script&#62;alert(1)&#60;/script&#62;</title>' +
			'<meta name="description" content="&#34;quoted&#34; &#38; &#60;b&#62;">' +
			'<link rel="canonical" href="https://app.test/docs?a=1&#38;b=&#34;2&#34;">' +
			'<!--/ajo:head-->'
		)
	})

	test('apply removes omitted tags and never touches template tags around the range', () => {
		const before = '<meta name="viewport" content="width=device-width"><title>Template</title>'
		const after = '<link rel="icon" href="/icon.svg"><link rel="modulepreload" href="/app.js">'

		document.head.innerHTML = before + ssr({
			title: 'First',
			meta: [{ name: 'description', content: 'First page' }, { name: 'robots', content: 'noindex' }],
		}) + after
		const template = [...document.head.children].filter(node => !/First|noindex/.test(node.outerHTML))

		apply({ title: 'Second', link: [{ rel: 'canonical', href: '/second' }] })

		expect(document.head.innerHTML).toBe(before + '<!--ajo:head--><title>Second</title><link rel="canonical" href="/second"><!--/ajo:head-->' + after)
		expect(template.every(node => node.isConnected)).toBe(true)
		expect(document.title).toBe('Template')

		apply({})

		expect(document.head.innerHTML).toBe(before + '<!--ajo:head--><!--/ajo:head-->' + after)
	})
})
