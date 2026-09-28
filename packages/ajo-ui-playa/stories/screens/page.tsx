/** @jsxImportSource ajo */
import type { Children, Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import { TypographyH1, TypographyH2, TypographyMuted } from 'ajo-ui-playa/typography'
import { CheckError } from '../play'

/**
 * The copy for the page's direction. The RTL capture reads Arabic: English
 * sentences under `lang="ar"` put every full stop at the start and hide real
 * bidi defects. Values a person copies (ids, domains, addresses, versions)
 * stay Latin inside `<bdi>` or an input with `dir="ltr"`.
 */
export const t = (en: string, ar: string) => document.documentElement.dir === 'rtl' ? ar : en

type PageArgs = {
	/** The page title, the one serif line on the screen. */
	title: string
	/** One sentence of context under the title. */
	lead?: string
	/** The page's primary action, at the end of the title line. */
	action?: Children
	/** The page's own frame: `main` on its own, `div` inside an app shell that owns `main`. */
	as?: 'div' | 'main'
	children?: Children
}

/** An app page as the screens compose it (Typography and Button, no PageHeader family): a start-aligned header, then content on the page. */
export const Page: Stateless<PageArgs> = ({ action, as: Tag = 'main', children, lead, title }) => (
	<Tag class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
		<header class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex min-w-0 flex-col gap-1">
				<TypographyH1>{title}</TypographyH1>
				{lead && <TypographyMuted>{lead}</TypographyMuted>}
			</div>
			{action}
		</header>
		{children}
	</Tag>
)

type SectionArgs = {
	title: string
	lead?: string
	class?: string
	children?: Children
}

/** A page section: its heading, an optional sentence, then its content. */
export const Section: Stateless<SectionArgs> = ({ children, class: classes, lead, title }) => (
	<section class={clx('flex min-w-0 flex-col gap-4', classes)}>
		<div class="flex flex-col gap-1">
			<TypographyH2>{title}</TypographyH2>
			{lead && <TypographyMuted>{lead}</TypographyMuted>}
		</div>
		{children}
	</section>
)

/** The boxes of `elements` by name: `name 1`, `name 2` and on, in document order. */
export const boxes = (elements: Iterable<Element>, name: string) =>
	new Map([...elements].map((element, index) => [`${name} ${index + 1}`, element.getBoundingClientRect()]))

/**
 * Asserts that a loading state held the loaded layout: every box has the same
 * top and height in both, so nothing jumps when the data arrives. Reports
 * through `CheckError('still')`, so a known defect can be listed.
 */
export const assertHeld = (loading: Map<string, DOMRect>, loaded: Map<string, DOMRect>) => {
	const lines: string[] = []
	for (const [name, rect] of loaded) {
		const before = loading.get(name)
		if (!before) lines.push(`${name} is missing while loading`)
		else if (Math.abs(before.top - rect.top) > 0.5 || Math.abs(before.height - rect.height) > 0.5) {
			lines.push(`${name} is ${before.top}/${before.height} loading and ${rect.top}/${rect.height} loaded`)
		}
	}
	for (const name of loading.keys()) if (!loaded.has(name)) lines.push(`${name} is missing once loaded`)
	if (lines.length) throw new CheckError('still', lines)
}
