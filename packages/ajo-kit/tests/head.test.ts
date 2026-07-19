import { describe, expect, test } from 'vitest'
import { merge, render } from '../src/head'

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
