import type { VNode } from 'ajo'
import { createGenerator, toEscapedSelector } from 'unocss'
import { beforeAll, describe, expect, it } from 'vitest'
import { playa } from 'ajo-ui-playa'
import { CommandInput } from 'ajo-ui-playa/command'
import { Input } from 'ajo-ui-playa/input'
import { InputDate, InputDateField } from 'ajo-ui-playa/input-date'
import { SelectChips, SelectInput, SelectTrigger } from 'ajo-ui-playa/select'

type Rule = { media: string, selectors: string[], body: string }

// The style rules of a generated sheet, each with the media query around it.
const rules = (css: string) => {
	const found: Rule[] = []
	const walk = (text: string, media: string) => {
		let index = 0
		while (index < text.length) {
			const open = text.indexOf('{', index)
			if (open < 0) break
			const prelude = text.slice(index, open).trim()
			let depth = 1
			let close = open + 1
			while (depth) {
				if (text[close] === '{') depth++
				else if (text[close] === '}') depth--
				close++
			}
			const body = text.slice(open + 1, close - 1)
			if (prelude.startsWith('@media')) walk(body, prelude)
			else if (!prelude.startsWith('@')) found.push({ media, selectors: prelude.split(',').map(part => part.trim()), body })
			index = close
		}
	}
	walk(css.replace(/\/\*[\s\S]*?\*\//g, ''), '')
	return found
}

const classes = (node: unknown) => (node as VNode & { class?: string }).class ?? ''
const uno = createGenerator({ presets: [playa()] })

// The font size a control's own box computes at `width` px, from the classes
// it carries (utilities or shortcuts) and, for a base-owned part themed from
// its root, the part's selector under that root.
const fontSize = async (names: string, width: number, part = '') => {
	const { css } = await (await uno).generate(names, { preflights: false })
	const own = new Set(names.split(/\s+/).filter(Boolean).map(name => `${toEscapedSelector(name)}${part}`))
	let size = ''
	for (const rule of rules(css)) {
		const min = /min-width:\s*([\d.]+)rem/.exec(rule.media)
		if (rule.media && (!min || Number(min[1]) * 16 > width)) continue
		if (!rule.selectors.some(selector => own.has(selector))) continue
		size = /font-size:([^;]+)/.exec(rule.body)?.[1] ?? size
	}
	return size
}

describe('picker controls', () => {
	let input: Record<number, string>
	const widths = [390, 640, 1280]

	beforeAll(async () => {
		input = Object.fromEntries(await Promise.all(widths.map(async width => [width, await fontSize(classes(Input({})), width)])))
	})

	// 16 px below sm, so a phone does not zoom into a focused field, 14 px from
	// sm: every control of a form row types at one size.
	it('type at the input size on a phone and from sm', async () => {
		expect(input).toEqual({ 390: 'var(--text-base-fontSize)', 640: 'var(--text-sm-fontSize)', 1280: 'var(--text-sm-fontSize)' })
		const controls: Record<string, [string, string?]> = {
			'select trigger': [classes(SelectTrigger({}))],
			'select input': [classes(SelectInput({})), ' > *[data-slot=select-input]'],
			'select chips': [classes(SelectChips({}))],
			'input date': [(InputDate({}) as VNode & { classNames: { control: string } }).classNames.control],
			'input date field': [classes(InputDateField({}))],
			'command input': [classes(CommandInput({}))],
		}
		const found: Record<string, Record<number, string>> = {}
		for (const [name, [names, part]] of Object.entries(controls)) {
			found[name] = Object.fromEntries(await Promise.all(widths.map(async width => [width, await fontSize(names, width, part)])))
		}
		expect(found).toEqual(Object.fromEntries(Object.keys(controls).map(name => [name, input])))
	})
})
