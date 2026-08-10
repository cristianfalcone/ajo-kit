import { env } from 'ajo-kit/platform'

const disabled = new Set(['', '0', 'false', 'off'])

const active = () => {
	const value = env('AJO_TIMING')
	return !!value && !disabled.has(value.toLowerCase())
}

const round = (value: number) => Math.round(value * 10) / 10

/** Optional request phase timings measured in milliseconds from a monotonic clock. */
export type Timing = {
	start: number
	loader?: number
	render?: number
}

/** Completed request timing data used for headers and diagnostic logs. */
export type Result = Timing & {
	total: number
	status: number
	bytes: number
	cache?: string
}

/** Starts request timing only when `AJO_TIMING` enables diagnostics. */
export const start = (): Timing | undefined =>
	active() ? { start: performance.now() } : undefined

/** Measures monotonic elapsed milliseconds rounded to one decimal place. */
export const elapsed = (start: number) => round(performance.now() - start)

/** Completes enabled timing state without allocating a result when diagnostics are off. */
export const finish = (
	timing: Timing | undefined,
	result: Omit<Result, keyof Timing | 'total'>,
): Result | undefined => timing && {
	...timing,
	...result,
	total: elapsed(timing.start),
}

/** Formats server phase durations for the standard `Server-Timing` header. */
export const header = (result: Result) => [
	`total;dur=${result.total}`,
	result.loader !== undefined && `loader;dur=${result.loader}`,
	result.render !== undefined && `render;dur=${result.render}`,
].filter(Boolean).join(', ')

/** Writes one compact request timing record to the process log. */
export const log = (label: string, result: Result) => {
	const cache = result.cache ? ` ${result.cache}` : ''
	const loader = result.loader === undefined ? '-' : `${result.loader}ms`
	const render = result.render === undefined ? '-' : `${result.render}ms`
	console.log(`[ajo] ${label} ${result.status}${cache} total=${result.total}ms loader=${loader} render=${render} bytes=${result.bytes}`)
}

/** @internal Unused by production code — kept for ad-hoc profiling; not public API. */
export async function measure<T>(label: string, run: () => T | Promise<T>): Promise<T> {
	if (!active()) return run()

	const start = performance.now()

	try {
		return await run()
	} finally {
		console.log(`[ajo:timing] ${label} ${elapsed(start)}ms`)
	}
}
