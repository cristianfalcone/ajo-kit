/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import {
	TypographyBlockquote,
	TypographyH1,
	TypographyH2,
	TypographyH3,
	TypographyH4,
	TypographyInlineCode,
	TypographyLarge,
	TypographyLead,
	TypographyList,
	TypographyListItem,
	TypographyMuted,
	TypographyP,
	TypographySmall,
} from 'ajo-ui-playa/typography'

export default {
	title: 'UI/Typography',
	component: TypographyH1,
	parameters: {
		docs: { description: 'Semantic Ajo Kit Typography wrappers for headings, body text, lists, and code.' },
		layout: 'padded',
	},
} satisfies Meta<typeof TypographyH1>

export const Headings: Story = {
	render: () => (
		<div class="grid gap-6">
			<TypographyH1>Deploy an app</TypographyH1>
			<TypographyH2>Before you start</TypographyH2>
			<TypographyH3>Point the domain at the host</TypographyH3>
			<TypographyH4>Check the certificate</TypographyH4>
		</div>
	),
	play: async ({ canvas }) => {
		const h1 = canvas.querySelector<HTMLElement>('[data-slot="typography-h1"]')
		const h2 = canvas.querySelector<HTMLElement>('[data-slot="typography-h2"]')
		const h3 = canvas.querySelector<HTMLElement>('[data-slot="typography-h3"]')
		const h4 = canvas.querySelector<HTMLElement>('[data-slot="typography-h4"]')
		if (!h1 || !h2 || !h3 || !h4) throw new Error('Typography headings were not rendered')

		if (h1.tagName !== 'H1' || h2.tagName !== 'H2' || h3.tagName !== 'H3' || h4.tagName !== 'H4') {
			throw new Error('Typography headings did not use semantic heading elements')
		}

		// The page title is the one Fraunces line: light, start-aligned, no negative tracking.
		const title = getComputedStyle(h1)
		if (!title.fontFamily.includes('Fraunces') || title.fontWeight !== '360' || title.textAlign !== 'start' || title.letterSpacing !== 'normal') {
			throw new Error(`TypographyH1 is not the page title: ${title.fontFamily} ${title.fontWeight} ${title.textAlign} ${title.letterSpacing}`)
		}
		// Headings below it stay in the interface face, with no rule under them.
		for (const heading of [h2, h3, h4]) {
			const style = getComputedStyle(heading)
			if (style.fontFamily.includes('Fraunces') || style.borderBottomWidth !== '0px') {
				throw new Error(`${heading.tagName} is not a plain section heading: ${style.fontFamily} ${style.borderBottomWidth}`)
			}
		}
	},
}

export const Article: Story = {
	render: () => (
		<article class="mx-auto max-w-2xl">
			<TypographyH1>Deploying to your host</TypographyH1>
			<TypographyLead>
				Push a version and the host builds it, starts it and routes its domain to it.
			</TypographyLead>
			<TypographyP>
				Each version runs beside the last one until it passes its health check. Read <a href="#domains">how domains reach an app</a> before you add one.
			</TypographyP>
			<TypographyBlockquote>
				A version that fails its health check never takes traffic.
			</TypographyBlockquote>
			<TypographyP>
				Old versions stay on the host until you remove them, so a rollback takes seconds.
			</TypographyP>
		</article>
	),
	play: async ({ canvas }) => {
		const article = canvas.querySelector('article')
		const quote = canvas.querySelector<HTMLElement>('[data-slot="typography-blockquote"]')
		const paragraphs = canvas.querySelectorAll('[data-slot="typography-p"]')
		const link = canvas.querySelector<HTMLAnchorElement>('[data-slot="typography-p"] a')
		if (!article || !quote || paragraphs.length !== 2 || !link) {
			throw new Error('Typography article composition was not rendered')
		}

		// A quote is set in and muted, with no stripe on its start side.
		const style = getComputedStyle(quote)
		if (style.borderInlineStartWidth !== '0px' || Number.parseFloat(style.paddingInlineStart) <= 0) {
			throw new Error(`Typography blockquote kept a stripe or lost its indent: ${style.borderInlineStartWidth} ${style.paddingInlineStart}`)
		}
		// An inline link is underlined and its focus ring stands off its first and last letters.
		const anchor = getComputedStyle(link)
		if (anchor.textDecorationLine !== 'underline' || Number.parseFloat(anchor.outlineOffset) < 2) {
			throw new Error(`Typography inline link is not underlined or its ring touches the text: ${anchor.textDecorationLine} ${anchor.outlineOffset}`)
		}
	},
}

export const List: Story = {
	render: () => (
		<div>
			<TypographyList>
				<TypographyListItem>Apps: 6, and 5 of them running</TypographyListItem>
				<TypographyListItem>Domains: 6, each with a valid certificate</TypographyListItem>
				<TypographyListItem>Secrets: 12, none shown after they are saved</TypographyListItem>
			</TypographyList>
			<TypographyList ordered>
				<TypographyListItem>Add the domain.</TypographyListItem>
				<TypographyListItem>Point its DNS at the host.</TypographyListItem>
				<TypographyListItem>Wait for the certificate.</TypographyListItem>
			</TypographyList>
		</div>
	),
	play: async ({ canvas }) => {
		const unordered = canvas.querySelector<HTMLElement>('ul[data-slot="typography-list"]')
		const ordered = canvas.querySelector<HTMLElement>('ol[data-slot="typography-list"]')
		const items = canvas.querySelectorAll('[data-slot="typography-list-item"]')
		if (!unordered || !ordered || items.length !== 6) {
			throw new Error('Typography lists were not rendered with semantic list elements')
		}
		// A list follows the block before it by one rhythm step, as a paragraph does.
		const step = ordered.getBoundingClientRect().top - unordered.getBoundingClientRect().bottom
		if (Math.abs(step - 16) > 0.5) throw new Error(`Typography lists are ${step} px apart, not one 16 px step`)
	},
}

export const Inline: Story = {
	render: () => (
		<div class="grid gap-4">
			<TypographyP>
				Install <TypographyInlineCode>ajo-ui-playa</TypographyInlineCode> and import one family at a time.
			</TypographyP>
			<TypographyLarge>Delete this host?</TypographyLarge>
			<TypographySmall>Email address</TypographySmall>
			<TypographyMuted>Sign-in links and notices go here.</TypographyMuted>
		</div>
	),
	play: async ({ canvas }) => {
		const code = canvas.querySelector<HTMLElement>('[data-slot="typography-inline-code"]')
		const small = canvas.querySelector<HTMLElement>('[data-slot="typography-small"]')
		const muted = canvas.querySelector<HTMLElement>('[data-slot="typography-muted"]')
		if (!code || !small || !muted) throw new Error('Typography inline helpers were not rendered')

		if (code.tagName !== 'CODE' || small.tagName !== 'SMALL' || muted.tagName !== 'P') {
			throw new Error('Typography inline helpers did not use semantic elements')
		}
	},
}
