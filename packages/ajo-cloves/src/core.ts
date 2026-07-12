import type { Host as AjoHost } from 'ajo'

/** Ajo host protocol that cloves bind lifecycle and invalidation to. */
export type Host<TElement extends object = HTMLElement, TArgs = Record<string, unknown>> = AjoHost<TElement, TArgs>

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

/** Adds a listener to a DOM host for at most the caller and host lifetimes. */
export const listen = <EventType extends keyof GlobalEventHandlersEventMap>(
	host: Host,
	type: EventType,
	handler: (event: GlobalEventHandlersEventMap[EventType]) => void,
	opts?: AddEventListenerOptions,
) => {
	if (!dom(host)) return
	host.addEventListener(type, handler, { ...opts, signal: hostSignal(host, opts?.signal) })
}

/** Adds a listener bound to the host lifecycle. */
export function on<K extends keyof GlobalEventHandlersEventMap>(
	target: EventTarget,
	type: K,
	fn: (event: GlobalEventHandlersEventMap[K]) => void,
	host: Host,
	opts?: AddEventListenerOptions,
): void
export function on(
	target: EventTarget,
	type: string,
	fn: EventListener,
	host: Host,
	opts?: AddEventListenerOptions,
): void
export function on(
	target: EventTarget,
	type: string,
	fn: EventListener,
	host: Host,
	opts?: AddEventListenerOptions,
) {
	target.addEventListener(type, fn, { ...opts, signal: hostSignal(host, opts?.signal) })
}

type SharedStop = () => void

const sources = new Map<string, {
	stop: SharedStop
	subscribers: Set<() => void>
}>()

/** Subscribes to a lazily-started shared source; the real source stops with the last unsubscribe. */
export const shared = (
	key: string,
	start: (notify: () => void) => SharedStop,
	fn: () => void,
	signal: AbortSignal,
): void => {

	if (signal.aborted) return

	let source = sources.get(key)
	const created = !source

	if (!source) {
		source = {
			stop: () => { },
			subscribers: new Set(),
		}
		sources.set(key, source)
	}

	source.subscribers.add(fn)

	const unsubscribe = () => {

		const current = sources.get(key)

		if (!current) return

		current.subscribers.delete(fn)

		if (current.subscribers.size) return

		current.stop()
		sources.delete(key)
	}

	signal.addEventListener('abort', unsubscribe, { once: true })

	if (!created) return

	try {
		source.stop = start(() => {

			const current = sources.get(key)

			if (!current) return

			for (const subscriber of [...current.subscribers]) subscriber()
		})
	} catch (error) {
		unsubscribe()
		throw error
	}
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
		const current = target
		if (current) opts.onChange(current)
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

			scope?.abort()
			scope = undefined
			schedule.cancel()
			target = next

			if (!next) return

			const controller = new AbortController()
			const notify = () => {
				if (!controller.signal.aborted && target === next) schedule()
			}
			scope = controller
			try {
				opts.bind(next, notify, controller.signal)
			} catch (error) {
				if (scope === controller) {
					controller.abort()
					scope = undefined
					target = undefined
					schedule.cancel()
				}
				throw error
			}
			notify()
		},
	}
}

const counters: Record<string, number> = Object.create(null)

/** Monotonic per-prefix unique id. */
export const id = (prefix: string) => `${prefix}-${counters[prefix] = (counters[prefix] ?? 0) + 1}`

/** Stores a value while keeping at most `limit` insertion-ordered cache keys. */
export const remember = <Key, Value>(
	cache: Map<Key, Value>,
	key: Key,
	value: Value,
	limit = 32,
): Value => {
	if (!Number.isInteger(limit) || limit < 1) throw new RangeError('remember limit must be a positive integer')
	cache.set(key, value)
	while (cache.size > limit) {
		const oldest = cache.keys().next()
		if (oldest.done) break
		cache.delete(oldest.value)
	}
	return value
}

/** Clamps a number into the inclusive [min, max] range. */
export const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max)
