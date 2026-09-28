import { readdirSync, readFileSync } from 'node:fs'
import { createGenerator } from 'unocss'
import { beforeAll, expect, test } from 'vitest'
import { playa } from 'ajo-ui-playa'

// What the rhythm, direction and focus rules still allow, file by file:
// today's uses, which the family lanes remove. The lists only shrink: a new
// use fails, and so does a listed one that is gone.

// Spacing off the scale: a spacing step other than 4, 8, 12, 16, 24, 32 or
// 48 px, an arbitrary value, or a negative margin.
const offScaleAllowed: Record<string, string> = {
	'avatar.tsx': '-space-x-1.5',
	'carousel.tsx': '-ms-4 -mt-4',
	'chart.tsx': 'gap-1.5 px-2.5 py-1.5',
	'pagination.tsx': 'pl-2.5 pr-2.5 px-2.5',
	'preset/data.ts': '-mx-2 gap-1.5 my-0.5 px-1.5 py-0.5',
	'preset/floating.ts': '-mx-1 py-1.5',
	'switch.tsx': 'px-px',
	'tooltip.tsx': 'py-1.5',
}

// Physical sides where a logical utility exists (ps, me, start, end,
// text-start, rounded-s, border-e...). Centring with left-1/2 is not one.
const physicalAllowed: Record<string, string> = {
	// Drawer's `side` names a physical edge.
	'drawer.tsx': 'border-l border-r left-0 left-auto right-0 right-auto',
	'internal/recipes.tsx': 'slide-in-from-left-2 slide-in-from-right-2',
	'navigation-menu.tsx': 'ml-1',
	'pagination.tsx': 'pl-2.5 pr-2.5',
	'preset/data.ts': 'pr-0 text-left text-right',
	'preset/floating.ts': 'left-2 ml-auto pl-8 pr-2',
	'sidebar.tsx': 'border-l border-r left-0 right-0',
	'tabs.tsx': 'left-0',
}

// Focus halos: a translucent ring-shadow beside or instead of the one focus
// ring, which forced colours drop and which misses 3:1 in the light theme.
const haloAllowed: Record<string, string> = {
	'navigation-menu.tsx': 'ring-3 ring-ring/50',
	'preset/choices.ts': 'ring-3 ring-danger/20 ring-ring/50',
	'preset/data.ts': 'ring-3 ring-ring/25 ring-ring/50',
	'radio-group.tsx': 'ring-3 ring-danger/20 ring-ring/50',
	'slider.tsx': 'ring-3 ring-4 ring-ring/50',
	'switch.tsx': 'ring-3 ring-ring/50',
}

const scale = new Set(['0', '1', '2', '3', '4', '6', '8', '12', 'auto'])
const spacing = /^(-?)(?:(?:scroll-)?[mp][xytrblse]?|gap(?:-[xy])?|space-[xy])-(.+)$/
const offScale = (name: string) => {
	const match = spacing.exec(name)
	return Boolean(match && (match[1] || !scale.has(match[2])))
}
const physical = (name: string) => !/^(?:left|right)-1\/2$/.test(name) &&
	/^-?(?:(?:scroll-)?[mp][lr]-|(?:left|right)-|(?:text|float|clear)-(?:left|right)$|border-[lr](?:-|$)|rounded-(?:[lr]|[tb][lr])(?:-|$)|origin-(?:(?:top|bottom)-)?(?:left|right)$|slide-(?:in-from|out-to)-(?:left|right)-)/.test(name)
const halo = (name: string) => /^ring-(?:[34]|(?:ring|danger)(?:\/\d+)?)$/.test(name)

// The utility a token applies, without its variants: `sm:has-[>svg]:px-3` is `px-3`.
const utility = (token: string) => {
	let depth = 0
	let start = 0
	for (let index = 0; index < token.length; index++) {
		const char = token[index]
		if (char === '[' || char === '(') depth++
		else if (char === ']' || char === ')') depth--
		else if (char === ':' && !depth) start = index + 1
	}
	return token.slice(start).replace(/^!/, '')
}

// Every utility each source file uses, as UnoCSS matches it: shortcut
// bodies in the preset modules count, words in prose that match nothing do not.
// `used` drops the variants and `tokens` keeps them.
const used: Record<string, string[]> = {}
const tokens: Record<string, string[]> = {}

beforeAll(async () => {
	const src = new URL('../src/', import.meta.url)
	const uno = await createGenerator({ presets: [playa()] })
	for (const file of readdirSync(src, { recursive: true, encoding: 'utf8' }).filter(file => /\.tsx?$/.test(file)).sort()) {
		const { matched } = await uno.generate(readFileSync(new URL(file, src), 'utf8'), { preflights: false })
		tokens[file.replaceAll('\\', '/')] = [...matched].sort()
		used[file.replaceAll('\\', '/')] = [...new Set([...matched].map(utility))].sort()
	}
}, 60_000)

const check = (rule: (name: string) => boolean, allowed: Record<string, string>) => {
	const found = Object.fromEntries(Object.entries(used)
		.map(([file, names]) => [file, names.filter(rule)] as const)
		.filter(([, names]) => names.length))
	const listed = (file: string) => new Set(allowed[file]?.split(' ') ?? [])
	const added = Object.entries(found).flatMap(([file, names]) => names.filter(name => !listed(file).has(name)).map(name => `${file}: ${name}`))
	const gone = Object.keys(allowed).flatMap(file => [...listed(file)].filter(name => !found[file]?.includes(name)).map(name => `${file}: ${name}`))
	expect(added, 'new uses break the rule').toEqual([])
	expect(gone, 'gone: remove them from the list').toEqual([])
}

test('spacing stays on the 4 px scale', () => check(offScale, offScaleAllowed))

test('direction is logical', () => check(physical, physicalAllowed))

test('focus shows one ring, never a halo', () => check(halo, haloAllowed))

// A placeholder never reads as a value: it takes the third text level (D27),
// not the value colour and not the muted help colour.
test('placeholders take the faint text colour', () => {
	const placeholder = /(?:^|:)(?:placeholder|data-\[placeholder(?:=true)?\]):/
	const colours = Object.entries(tokens).flatMap(([file, names]) => names
		.filter(name => placeholder.test(name) && /^text-(?!xs$|sm$|base$|lg$|xl$|\d)/.test(utility(name)))
		.map(name => `${file}: ${name}`))
	expect(colours.length, 'no placeholder colour found').toBeGreaterThan(0)
	expect(colours.filter(name => !name.endsWith(':text-faint-foreground'))).toEqual([])
})
