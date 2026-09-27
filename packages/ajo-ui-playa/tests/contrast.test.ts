import { createGenerator } from 'unocss'
import { expect, test } from 'vitest'
import { playa } from 'ajo-ui-playa'

type Color = [red: number, green: number, blue: number, alpha: number]
type Layer = { token: string, alpha?: number }
// `alpha` is the opacity the families paint the foreground at (text-x/85).
type Pair = { color: string, alpha?: number, on: Layer[], min: number }

const hex = /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i
const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+)(%?))?\s*\)$/

const parse = (value: string): Color => {
	const digits = hex.exec(value)?.[1]
	if (digits) {
		const full = digits.length === 3 ? [...digits].map(digit => digit + digit).join('') : digits
		const [red, green, blue, alpha = 255] = full.match(/../g)!.map(byte => parseInt(byte, 16))
		return [red, green, blue, alpha / 255]
	}
	const match = rgb.exec(value)
	if (!match) throw new Error(`unsupported colour syntax: ${value}`)
	const alpha = match[4] === undefined ? 1 : Number(match[4]) / (match[5] ? 100 : 1)
	return [Number(match[1]), Number(match[2]), Number(match[3]), alpha]
}

// Source-over in sRGB, as browsers composite; the bottom colour is opaque.
const over = (top: Color, bottom: Color): Color => {
	const [red, green, blue] = [0, 1, 2].map(channel => top[channel] * top[3] + bottom[channel] * (1 - top[3]))
	return [red, green, blue, 1]
}

const luminance = (color: Color) => {
	const [red, green, blue] = color.slice(0, 3).map(channel => {
		const value = channel / 255
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

const ratio = (a: Color, b: Color) => {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (light + 0.05) / (dark + 0.05)
}

// The tokens live on `:root`; each `light-dark()` holds both schemes.
const schemes = async () => {
	const { css } = await (await createGenerator({ presets: [playa()] })).generate('')
	const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?<=^|\})([^{}]+)\{([^{}]*)\}/g)]
	const root = Object.fromEntries(rules
		.filter(([, selectors]) => selectors.trim() === ':root')
		.flatMap(([, , body]) => [...body.matchAll(/(--[\w-]+):([^;]+)/g)].map(([, name, value]) => [name, value.trim()])))
	const argument = String.raw`([^,()]+(?:\([^()]*\))?)`
	const scheme = (index: 1 | 2): Record<string, string> => Object.fromEntries(Object.entries(root).map(([name, value]) =>
		[name, value.replace(new RegExp(`light-dark\\(${argument},${argument}\\)`, 'g'), (...groups) => groups[index])]))
	return { light: scheme(1), dark: scheme(2) }
}

const surfaces = ['background', 'card', 'popover']
const tinted = surfaces.map(surface => [{ token: surface }, { token: 'accent' }])
const statuses = ['danger', 'success', 'warning', 'info']
const on = (min: number, colors: string[], layers: Layer[][], alpha?: number) =>
	colors.flatMap(color => layers.map(layer => ({ color, alpha, on: layer, min })))

// Text at 4.5:1 on every surface it is used on, hover and selection tints
// included; boundaries, focus and gold marks at 3:1 (WCAG 1.4.3, 1.4.11).
const pairs: Pair[] = [
	...on(4.5, ['foreground'], [[{ token: 'background' }], [{ token: 'muted' }]]),
	...on(4.5, ['card-foreground'], [[{ token: 'card' }]]),
	...on(4.5, ['popover-foreground'], [[{ token: 'popover' }]]),
	...on(4.5, ['accent-foreground'], tinted),
	...on(4.5, ['muted-foreground', 'faint-foreground', 'link', 'gold-text'],
		[...surfaces.map(token => [{ token }]), [{ token: 'muted' }], ...tinted]),
	...on(4.5, statuses, surfaces.map(token => [{ token }])),
	// Status text on its own 10% tint, as Alert paints it: the title at full
	// strength, the description at 85%.
	...statuses.flatMap(status => [1, 0.85].flatMap(alpha => on(4.5, [status],
		['background', 'card'].map(token => [{ token }, { token: status, alpha: 0.1 }]), alpha === 1 ? undefined : alpha))),
	...['primary', 'secondary', ...statuses].flatMap(fill => on(4.5, [`${fill}-foreground`], [[{ token: fill }]])),
	...on(3, ['input', 'ring', 'gold-4', 'primary'], surfaces.map(token => [{ token }])),
	// The focus halo as the families paint it today (ring-ring/50).
	...on(3, ['ring'], surfaces.map(token => [{ token }]), 0.5),
	// Hairlines are decorative, so no WCAG floor applies; they stay visible,
	// over the accent tint too, where hovered and selected rows sit.
	...on(1.25, ['border'], [...surfaces.map(token => [{ token }]), ...tinted]),
]

// Pairs that fail today, each with the slice that fixes it. The list can only
// shrink: a listed pair that passes fails this test until it is removed.
const failing: Record<string, string> = {
	// The champagne body is a plate on ivory, not a mark: checked controls
	// take their state colour per D28, which drops or meets this row.
	'light primary on background': 'p5-kit-12',
	'light primary on card': 'p5-kit-12',
	'light primary on popover': 'p5-kit-12',
	// Painted alphas: p5-kit-02 does not reach these. The focus-ring shortcut
	// replaces the ring-ring/50 halo; Alert moves its body text to foreground.
	'light ring 50% on background': 'p5-kit-07',
	'light ring 50% on card': 'p5-kit-07',
	'light ring 50% on popover': 'p5-kit-07',
	'light danger 85% on danger 10% over background': 'p5-kit-16',
	'light danger 85% on danger 10% over card': 'p5-kit-16',
	'light success 85% on success 10% over background': 'p5-kit-16',
	'light success 85% on success 10% over card': 'p5-kit-16',
	'light warning 85% on warning 10% over background': 'p5-kit-16',
	'light warning 85% on warning 10% over card': 'p5-kit-16',
}

const layer = ({ token, alpha }: Layer) => alpha === undefined ? token : `${token} ${alpha * 100}%`
const name = (scheme: string, pair: Pair) =>
	`${scheme} ${layer({ token: pair.color, alpha: pair.alpha })} on ${pair.on.map(layer).reverse().join(' over ')}`

test('Playa colour tokens meet their WCAG contrast', async () => {
	const results: { name: string, value: number, min: number }[] = []
	for (const [scheme, tokens] of Object.entries(await schemes())) {
		// Resolves `var()` aliases such as --card-foreground: var(--foreground).
		const value = (token: string): string => {
			const declared = tokens[`--${token}`]
			if (declared === undefined) throw new Error(`--${token} is not defined in the ${scheme} scheme`)
			const reference = /^var\(--([\w-]+)\)$/.exec(declared)
			return reference ? value(reference[1]) : declared
		}
		const color = ({ token, alpha = 1 }: Layer): Color => {
			const [red, green, blue, opacity] = parse(value(token))
			return [red, green, blue, opacity * alpha]
		}
		for (const pair of pairs) {
			const [base, ...tints] = pair.on.map(color)
			const surface = tints.reduce((below, tint) => over(tint, below), base)
			results.push({ name: name(scheme, pair), value: ratio(over(color({ token: pair.color, alpha: pair.alpha }), surface), surface), min: pair.min })
		}
	}
	const report = ({ name, value, min }: typeof results[number]) => `${name}: ${value.toFixed(2)} (needs ${min})`

	expect(results.filter(result => result.value < result.min && !(result.name in failing)).map(report)).toEqual([])
	expect(results.filter(result => result.value >= result.min && result.name in failing).map(report), 'passes now: remove from failing').toEqual([])
	expect(Object.keys(failing).filter(key => !results.some(result => result.name === key))).toEqual([])
})
