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
	TypographyTable,
	TypographyTBody,
	TypographyTD,
	TypographyTH,
	TypographyTHead,
	TypographyTRow,
} from '/src/ui/typography'

export default {
	title: 'UI/Typography',
	component: TypographyH1,
	parameters: {
		docs: { description: 'Semantic Ajo Kit Typography wrappers for headings, body text, lists, code, and tables.' },
		layout: 'padded',
	},
} satisfies Meta<typeof TypographyH1>

export const Headings: Story = {
	render: () => (
		<div class="grid gap-6">
			<TypographyH1>Taxing Laughter: The Joke Tax Chronicles</TypographyH1>
			<TypographyH2>The People of the Kingdom</TypographyH2>
			<TypographyH3>The Joke Tax</TypographyH3>
			<TypographyH4>People stopped telling jokes</TypographyH4>
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

		if (h1.className.includes('tracking-tight')) {
			throw new Error('Typography should not introduce negative letter-spacing')
		}
	},
}

export const Article: Story = {
	render: () => (
		<article class="mx-auto max-w-2xl">
			<TypographyH1>Taxing Laughter: The Joke Tax Chronicles</TypographyH1>
			<TypographyLead>
				A story about a lazy king, an overreaching tax, and a court jester.
			</TypographyLead>
			<TypographyP>
				Once upon a time, in a far-off land, there was a very lazy king who spent all day lounging on his throne.
			</TypographyP>
			<TypographyBlockquote>
				"After all," he said, "everyone enjoys a good joke."
			</TypographyBlockquote>
			<TypographyP>
				The people started to tell jokes again, and soon the entire kingdom was in on the joke.
			</TypographyP>
		</article>
	),
	play: async ({ canvas }) => {
		const article = canvas.querySelector('article')
		const quote = canvas.querySelector<HTMLElement>('[data-slot="typography-blockquote"]')
		const paragraphs = canvas.querySelectorAll('[data-slot="typography-p"]')
		if (!article || !quote || paragraphs.length !== 2) {
			throw new Error('Typography article composition was not rendered')
		}
	},
}

export const List: Story = {
	render: () => (
		<div class="grid gap-4">
			<TypographyList>
				<TypographyListItem>1st level of puns: 5 gold coins</TypographyListItem>
				<TypographyListItem>2nd level of jokes: 10 gold coins</TypographyListItem>
				<TypographyListItem>3rd level of one-liners: 20 gold coins</TypographyListItem>
			</TypographyList>
			<TypographyList ordered>
				<TypographyListItem>Draft the joke tax.</TypographyListItem>
				<TypographyListItem>Publish the decree.</TypographyListItem>
				<TypographyListItem>Repeal it immediately.</TypographyListItem>
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
	},
}

export const Table: Story = {
	render: () => (
		<TypographyTable>
			<TypographyTHead>
				<TypographyTRow>
					<TypographyTH>King's Treasury</TypographyTH>
					<TypographyTH>People's happiness</TypographyTH>
				</TypographyTRow>
			</TypographyTHead>
			<TypographyTBody>
				<TypographyTRow>
					<TypographyTD>Empty</TypographyTD>
					<TypographyTD>Overflowing</TypographyTD>
				</TypographyTRow>
				<TypographyTRow>
					<TypographyTD>Modest</TypographyTD>
					<TypographyTD>Satisfied</TypographyTD>
				</TypographyTRow>
				<TypographyTRow>
					<TypographyTD>Full</TypographyTD>
					<TypographyTD>Ecstatic</TypographyTD>
				</TypographyTRow>
			</TypographyTBody>
		</TypographyTable>
	),
	play: async ({ canvas }) => {
		const table = canvas.querySelector<HTMLElement>('[data-slot="typography-table"]')
		const heads = canvas.querySelectorAll<HTMLTableCellElement>('[data-slot="typography-th"]')
		const cells = canvas.querySelectorAll('[data-slot="typography-td"]')
		if (!table || heads.length !== 2 || cells.length !== 6) {
			throw new Error('Typography table was not rendered')
		}

		if (heads[0]?.scope !== 'col') {
			throw new Error('Typography table header should default to column scope')
		}
	},
}

export const Inline: Story = {
	render: () => (
		<div class="grid gap-4">
			<TypographyP>
				Install <TypographyInlineCode>@radix-ui/react-alert-dialog</TypographyInlineCode> only in React projects.
			</TypographyP>
			<TypographyLarge>Are you absolutely sure?</TypographyLarge>
			<TypographySmall>Email address</TypographySmall>
			<TypographyMuted>Enter your email address.</TypographyMuted>
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
