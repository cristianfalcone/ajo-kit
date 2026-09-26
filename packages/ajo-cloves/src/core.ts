import type { Host } from 'ajo'

/** True when a value is structurally a DOM element in a document-bearing runtime. */
export const dom = (value: unknown): value is Element =>
	typeof document != 'undefined' &&
	(value as { nodeType?: unknown } | null)?.nodeType === 1

/** True when both Window and Document globals are available. */
export const browser = () =>
	typeof window != 'undefined' && typeof document != 'undefined'

const statefulArg = (key: string) =>
	key === 'key' || key === 'memo' || key === 'ref' || key === 'skip' || key.startsWith('set:')

/** Maps rest attrs onto an Ajo stateful host, prefixing DOM attributes with `attr:`. */
export const statefulRootAttrs = (attrs: Record<string, unknown>) => {
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(attrs)) result[statefulArg(key) ? key : `attr:${key}`] = value
	return result
}

/** Calls an externally supplied DOM event handler when it is a function. */
export const callHandler = <EventType extends Event>(handler: unknown, event: EventType) => {
	if (typeof handler === 'function') (handler as (event: EventType) => void)(event)
}

/** Calls an externally supplied Ajo ref callback when it is a function. */
export const callRef = <ElementType>(ref: unknown, element: ElementType | null) => {
	if (typeof ref === 'function') (ref as (element: ElementType | null) => void)(element)
}

const hostSignal = (host: Host, signal?: AbortSignal) =>
	signal && signal !== host.signal ? AbortSignal.any([signal, host.signal]) : host.signal

/** Adds a listener bound to the host lifecycle and, when given, the caller signal. */
export const on = <K extends keyof GlobalEventHandlersEventMap>(
	target: EventTarget,
	type: K,
	fn: (event: GlobalEventHandlersEventMap[K]) => void,
	host: Host,
	opts?: AddEventListenerOptions,
) => {
	target.addEventListener(type, fn as EventListener, { ...opts, signal: hostSignal(host, opts?.signal) })
}

/** Adds a listener to a DOM host for at most the caller and host lifetimes. */
export const listen = <K extends keyof GlobalEventHandlersEventMap>(
	host: Host,
	type: K,
	handler: (event: GlobalEventHandlersEventMap[K]) => void,
	opts?: AddEventListenerOptions,
) => {
	if (dom(host)) on(host, type, handler, host, opts)
}

/** Wraps fn so multiple calls within one frame collapse into one run on the next frame. */
export const frame = (fn: () => void): (() => void) & { cancel(): void } => {

	let handle: number | undefined

	const run = () => {
		handle = undefined
		fn()
	}

	const schedule = (() => {

		if (typeof requestAnimationFrame == 'undefined') {
			fn()
			return
		}

		if (handle != null) return

		handle = requestAnimationFrame(run)

	}) as (() => void) & { cancel(): void }

	schedule.cancel = () => {

		if (handle == null) return
		if (typeof cancelAnimationFrame != 'undefined') cancelAnimationFrame(handle)

		handle = undefined
	}

	return schedule
}

/** Owns frame-coalesced binding to one live element target at a time. */
export const live = <T extends Element>(host: Host, opts: {
	target: () => T | null | undefined
	onChange: (element: T) => void
	bind: (element: T, notify: () => void, signal: AbortSignal) => void
}) => {
	const signal = host.signal
	let target: T | undefined
	let scope: AbortController | undefined

	const schedule = frame(() => {
		if (target) opts.onChange(target)
	})

	const stop = () => {
		scope?.abort()
		scope = undefined
		target = undefined
		schedule.cancel()
	}

	signal.addEventListener('abort', stop, { once: true })

	return {
		sync() {
			if (signal.aborted) return

			const next = opts.target() ?? undefined
			if (next === target) return

			stop()
			if (!next) return

			const controller = new AbortController()
			const notify = () => {
				if (!controller.signal.aborted) schedule()
			}
			target = next
			scope = controller
			opts.bind(next, notify, controller.signal)
			notify()
		},
		/** Schedules `onChange` for the current target on the next frame. */
		refresh() {
			if (target) schedule()
		},
	}
}

const counters: Record<string, number> = Object.create(null)

/** Monotonic per-prefix unique id. */
export const id = (prefix: string) => `${prefix}-${counters[prefix] = (counters[prefix] ?? 0) + 1}`

/** Stores a value while keeping at most 32 insertion-ordered cache keys. */
export const remember = <Key, Value>(cache: Map<Key, Value>, key: Key, value: Value): Value => {
	cache.set(key, value)
	if (cache.size > 32) cache.delete(cache.keys().next().value!)
	return value
}

/** Clamps a number into the inclusive [min, max] range. */
export const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max)
