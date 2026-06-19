const disabled = new Set(['', '0', 'false', 'off'])

const active = () => {
	const value = typeof process === 'undefined' ? undefined : process.env.AJO_TIMING
	return !!value && !disabled.has(value.toLowerCase())
}

const round = (value: number) => Math.round(value * 10) / 10

export type RouteTiming = {
	start: number
	loader?: number
	render?: number
}

export type TimingResult = RouteTiming & {
	total: number
	status: number
	bytes: number
	cache?: string
}

export const startRouteTiming = (): RouteTiming | undefined =>
	active() ? { start: performance.now() } : undefined

export const elapsed = (start: number) => round(performance.now() - start)

export const finishRouteTiming = (
	timing: RouteTiming | undefined,
	result: Omit<TimingResult, keyof RouteTiming | 'total'>,
): TimingResult | undefined => timing && {
	...timing,
	...result,
	total: elapsed(timing.start),
}

export const serverTiming = (result: TimingResult) => [
	`total;dur=${result.total}`,
	result.loader !== undefined && `loader;dur=${result.loader}`,
	result.render !== undefined && `render;dur=${result.render}`,
].filter(Boolean).join(', ')

export const logRouteTiming = (label: string, result: TimingResult) => {
	const cache = result.cache ? ` ${result.cache}` : ''
	const loader = result.loader === undefined ? '-' : `${result.loader}ms`
	const render = result.render === undefined ? '-' : `${result.render}ms`
	console.log(`[ajo] ${label} ${result.status}${cache} total=${result.total}ms loader=${loader} render=${render} bytes=${result.bytes}`)
}

export async function measure<T>(label: string, run: () => T | Promise<T>): Promise<T> {
	if (!active()) return run()

	const start = performance.now()

	try {
		return await run()
	} finally {
		console.log(`[ajo:timing] ${label} ${elapsed(start)}ms`)
	}
}
