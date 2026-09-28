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
	'alert.tsx': 'gap-y-0.5',
	'attachment.tsx': 'gap-1.5 mt-0.5 p-1.5 px-1.5 px-2.5 py-1.5',
	'avatar.tsx': '-space-x-2',
	'breadcrumb.tsx': 'gap-1.5 gap-2.5',
	'bubble.tsx': 'px-1.5 px-3.5 py-0.5',
	'button.tsx': 'px-1.5 px-2.5',
	'card.tsx': 'gap-[var(--card-spacing)] pb-[var(--card-spacing)] pt-[var(--card-spacing)] px-[var(--card-spacing)] py-[var(--card-spacing)]',
	'carousel.tsx': '-ms-4 -mt-4',
	'chart.tsx': 'gap-1.5 px-2.5 py-1.5',
	'chip.tsx': '-mr-1 py-0.5',
	'command.tsx': '-mx-1 py-1.5',
	'drawer.tsx': 'mb-24 mt-24',
	'field.tsx': '-mb-2 -mt-1 -mt-1.5 -my-2 gap-1.5 gap-7 mt-px',
	'input-date.tsx': 'px-0.5 py-0.5',
	'input-group.tsx': 'gap-1.5 px-2.5',
	'internal/input-group.tsx': 'ml-[-0.35rem] ml-[-0.45rem] mr-[-0.35rem] mr-[-0.45rem] pb-2.5 pt-2.5 py-1.5',
	'internal/toggle.tsx': 'px-1.5 px-2.5',
	'item.tsx': 'gap-2.5 px-2.5',
	'message.tsx': 'px-3.5',
	'pagination.tsx': 'pl-2.5 pr-2.5 px-2.5',
	'preset/data.ts': '-mx-2 gap-1.5 my-0.5 px-1.5 py-0.5',
	'preset/floating.ts': '-mx-1 py-1.5',
	'preset/modal.ts': 'pr-10',
	'preset/pickers.ts': '-mx-1 gap-1.5 mr-[-0.35rem] mr-[-0.45rem] pr-9 px-2.5 py-1.5',
	'select.tsx': '-mr-1',
	'sidebar.tsx': '-mt-8 mx-3.5 px-2.5 py-0.5',
	'switch.tsx': 'px-px',
	'tabs.tsx': 'gap-1.5 p-[3px]',
	'toggle-group.tsx': 'gap-[var(--toggle-group-gap)]',
	'tooltip.tsx': 'py-1.5',
	'typography.tsx': 'px-[0.3rem] py-[0.2rem] scroll-m-20',
}

// Physical sides where a logical utility exists (ps, me, start, end,
// text-start, rounded-s, border-e...). Centring with left-1/2 is not one.
const physicalAllowed: Record<string, string> = {
	'accordion.tsx': 'text-left',
	'alert-dialog.tsx': 'text-left',
	'attachment.tsx': 'right-3',
	'avatar.tsx': 'right-0',
	'bubble.tsx': 'left-3 right-3 rounded-bl-2xl rounded-bl-md rounded-br-2xl rounded-br-md text-left',
	'button-group.tsx': 'rounded-r-md',
	'chip.tsx': '-mr-1',
	'dialog.tsx': 'right-4 text-left',
	'drawer.tsx': 'border-l border-r left-0 left-auto right-0 right-auto text-left',
	'field.tsx': 'ml-4',
	'input-otp.tsx': 'border-l border-l-0 rounded-l-md rounded-r-md',
	'internal/input-group.tsx': 'ml-[-0.35rem] ml-[-0.45rem] mr-[-0.35rem] mr-[-0.45rem] pl-2 pl-3 pr-2 pr-3',
	'internal/recipes.tsx': 'slide-in-from-left-2 slide-in-from-right-2',
	'internal/seams.ts': 'rounded-l-none rounded-r-none',
	'marker.tsx': 'ml-1 mr-1 text-left',
	'message.tsx': 'rounded-bl-2xl rounded-br-2xl',
	'navigation-menu.tsx': 'ml-1',
	'pagination.tsx': 'pl-2.5 pr-2.5',
	'preset/data.ts': 'pr-0 text-left text-right',
	'preset/floating.ts': 'left-2 ml-auto pl-8 pr-2',
	'preset/modal.ts': 'pr-10 right-2',
	'preset/pickers.ts': 'mr-[-0.35rem] mr-[-0.45rem] pl-2 pr-2 pr-3 pr-9 right-2',
	'resizable.tsx': 'left-0',
	'select.tsx': '-mr-1 pr-1',
	'sidebar.tsx': 'border-l border-r left-0 pr-8 right-0 right-1 right-3 text-left',
	'spinner.tsx': 'border-r-transparent',
	'tabs.tsx': 'left-0',
	'typography.tsx': 'border-l-2 ml-6 pl-6',
}

// Focus halos: a translucent ring-shadow beside or instead of the one focus
// ring, which forced colours drop and which misses 3:1 in the light theme.
const haloAllowed: Record<string, string> = {
	'accordion.tsx': 'ring-3 ring-ring/50',
	'attachment.tsx': 'ring-3 ring-ring/50',
	'bubble.tsx': 'ring-3 ring-ring/50',
	'calendar.tsx': 'ring-3 ring-ring/50',
	'chip.tsx': 'ring-3 ring-danger/25 ring-danger/40 ring-ring/50',
	'collapsible.tsx': 'ring-3 ring-ring/50',
	'dialog.tsx': 'ring-ring/50',
	'input-otp.tsx': 'ring-3 ring-danger/20 ring-ring/25',
	'internal/input-group.tsx': 'ring-3 ring-danger/20 ring-ring/25',
	'internal/toggle.tsx': 'ring-3 ring-danger/25 ring-ring/50',
	'item.tsx': 'ring-3 ring-ring/50',
	'navigation-menu.tsx': 'ring-3 ring-ring/50',
	'preset/choices.ts': 'ring-3 ring-danger/20 ring-ring/50',
	'preset/data.ts': 'ring-3 ring-ring/25 ring-ring/50',
	'preset/modal.ts': 'ring-3 ring-ring/50',
	'preset/pickers.ts': 'ring-3 ring-danger/20 ring-ring/25 ring-ring/50',
	'radio-group.tsx': 'ring-3 ring-danger/20 ring-ring/50',
	'resizable.tsx': 'ring-3 ring-ring/50',
	'sidebar.tsx': 'ring-3 ring-ring/50',
	'slider.tsx': 'ring-3 ring-4 ring-ring/50',
	'switch.tsx': 'ring-3 ring-ring/50',
	'tabs.tsx': 'ring-3 ring-ring/50',
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
const used: Record<string, string[]> = {}

beforeAll(async () => {
	const src = new URL('../src/', import.meta.url)
	const uno = await createGenerator({ presets: [playa()] })
	for (const file of readdirSync(src, { recursive: true, encoding: 'utf8' }).filter(file => /\.tsx?$/.test(file)).sort()) {
		const { matched } = await uno.generate(readFileSync(new URL(file, src), 'utf8'), { preflights: false })
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
