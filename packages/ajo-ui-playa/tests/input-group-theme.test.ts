import { readFileSync } from 'node:fs'
import type { VNode } from 'ajo'
import { render as ssr } from 'ajo/html'
import { jsx } from 'ajo/jsx-runtime'
import { createGenerator } from 'unocss'
import { describe, expect, it } from 'vitest'
import { playa } from 'ajo-ui-playa'
import { Field, FieldLabel } from 'ajo-ui-playa/field'
import { Input, InputFile } from 'ajo-ui-playa/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupTextarea } from 'ajo-ui-playa/input-group'
import { SelectInput } from 'ajo-ui-playa/select'

const widths = (classes: string) =>
	classes.split(/\s+/).filter(token => token.startsWith('w-'))
const classes = (node: unknown) => (node as VNode & { class?: string }).class ?? ''
const attribute = (node: unknown, name: string) => (node as Record<string, unknown>)[name]
// The class list of the element that carries a data-slot, in rendered HTML.
const slotClass = (html: string, slot: string) => new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`).exec(html)?.[0].match(/class="([^"]*)"/)?.[1].split(' ') ?? []
// Rendered HTML escapes the selector characters inside class names.
const unescape = (html: string) => html.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
const generate = async (html: string) => (await (await createGenerator({ presets: [playa()] })).generate(unescape(html), { preflights: false })).css
// Below sm every control text is 16 px: this rule must reach each part that sets text-sm.
const mobileText = '@media (max-width: calc(40rem - 0.1px)){\n.max-sm\\:text-base{font-size:var(--text-base-fontSize)'

describe('input-group theme seam', () => {
	it('exposes full and caller-owned widths through the public adapters', () => {
		expect(widths(classes(InputGroup({})))).toEqual(['w-full'])
		expect(widths(classes(SelectInput({})))).toEqual([])
		expect(widths(classes(SelectInput({ class: 'w-[22rem]' })))).toEqual(['w-[22rem]'])
		expect(classes(InputGroup({ class: 'max-w-sm' }))).toContain('max-w-sm')
	})
})

describe('text field sizes', () => {
	it('stamps the control size on Input and InputGroup', () => {
		expect(attribute(Input({}), 'data-size')).toBe('default')
		expect(attribute(Input({ size: 'sm' }), 'data-size')).toBe('sm')
		expect(attribute(InputGroup({}), 'data-size')).toBe('default')
		expect(attribute(InputGroup({ size: 'lg' }), 'data-size')).toBe('lg')
	})

	it('sizes a group, its buttons and its addon text from the group alone', async () => {
		const html = ssr(jsx(InputGroup, {
			size: 'sm',
			children: [
				jsx(InputGroupInput, { 'aria-label': 'Domain' }),
				jsx(InputGroupAddon, { align: 'inline-end', children: jsx(InputGroupButton, { children: 'Check' }) }),
			],
		}))
		const { css } = await (await createGenerator({ presets: [playa()] })).generate(html, { preflights: false })

		// Inside a small group the button is 24 px tall (the group's 32 less
		// 4 px on each side), and nothing in it keeps a text size of its own
		// below the control text.
		expect(css).toMatch(/\.group\\\/input-group\)\[data-size=sm\] \*\)\{height:calc\(var\(--spacing\) \* 6\)/)
		expect(html).not.toMatch(/text-xs/)
		// A button sets text-sm through the button recipe, so it restores the
		// group's 16 px itself below sm.
		expect(slotClass(html, 'input-group-button')).toContain('max-sm:text-base')
		expect(css).toContain(mobileText)
	})

	it('lets a textarea or a stacked addon grow the group at every size', async () => {
		const html = ssr(jsx(InputGroup, { size: 'sm', children: jsx(InputGroupTextarea, { 'aria-label': 'Release notes' }) }))
		const css = await generate(html)

		// The size height and the growth both key on data-size; growth is one
		// selector stronger, so it wins whatever order the rules come in.
		expect(css).toContain('[data-size=sm]{height:var(--spacing-control-sm);}')
		expect(css).toContain(':has(>textarea,>[data-align^=block])[data-size]{height:auto;}')
	})
})

describe('composed fields', () => {
	it('ring and turn danger on behalf of their control, with no halo', async () => {
		const html = ssr(jsx(InputGroup, { children: jsx(InputGroupInput, { 'aria-label': 'Domain' }) }))
		const { css } = await (await createGenerator({ presets: [playa()] })).generate(html, { preflights: false })

		expect(css).toContain('.playa-field-within:has(>:is(input,textarea):focus-visible,[data-segment]:focus-visible){outline:var(--focus-width) solid var(--ring)}')
		expect(css).toContain('.playa-field-within:has([data-slot][aria-invalid=true]){--un-inset-ring-color:var(--danger)}')
		expect(css).not.toContain('--un-ring-shadow:')
	})
})

describe('file field', () => {
	it('shows the caller\'s words, not the browser\'s, over a labelled native file input', () => {
		const html = ssr(jsx(Field, {
			children: [
				jsx(FieldLabel, { for: 'picture', children: 'Profile picture' }),
				jsx(InputFile, { id: 'picture', accept: 'image/*', placeholder: 'No picture chosen', children: 'Choose picture' }),
			],
		}))

		expect(html).toMatch(/<input[^>]*id="picture"[^>]*type="file"/)
		expect(html).toContain('>Choose picture</span>')
		expect(html).toContain('>No picture chosen</span>')
	})

	it('sizes its button part with the field below sm', async () => {
		const html = ssr(jsx(InputFile, { 'aria-label': 'Profile picture', placeholder: 'No picture chosen', children: 'Choose picture' }))

		expect(slotClass(html, 'input-file-button')).toContain('max-sm:text-base')
		expect(await generate(html)).toContain(mobileText)
	})
})

describe('text field sources', () => {
	it('generate only valid selectors', async () => {
		const files = ['input.tsx', 'input-group.tsx', 'input-otp.tsx', 'internal/input-group.tsx', 'label.tsx', 'textarea.tsx']
		const source = files.map(file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')).join('\n')

		expect(await generate(source)).not.toContain('undefined')
	})
})
