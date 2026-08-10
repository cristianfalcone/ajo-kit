import type { State } from './constants'

/** @internal Cache policy knobs exported for tests only — not public API. */
export const max = 50
/** @internal */
export const ttl = 5 * 60 * 1000

type Meta = {
	scope: string
	cached: number
	used: number
}

const cache = new Map<string, State>()

const meta = new Map<string, Meta>()

const now = () => Date.now()

const key = (scope: string, url: string) => JSON.stringify([scope, url])

const remove = (key: string) => {
	cache.delete(key)
	meta.delete(key)
}

/** @internal Test-only reset of the process cache — not public API. */
export const clear = () => {
	cache.clear()
	meta.clear()
}

type Options = {
	scope?: string
	now?: number
}

/** Reads an unexpired route only from the caller's declared identity scope. */
export const get = (url: string, options?: Options) => {
	if (!options?.scope) return

	const entry = key(options.scope, url)
	const state = cache.get(entry)
	const info = meta.get(entry)

	if (!state || !info) return

	const time = options.now ?? now()

	if (time - info.cached > ttl) {
		remove(entry)
		return
	}

	info.used = time

	return state
}

const prune = (active?: string, time = now()) => {
	for (const [key, info] of meta) {
		if (key !== active && time - info.cached > ttl) remove(key)
	}

	while (cache.size > max) {
		let candidate: string | undefined
		let oldest = Infinity

		for (const [key, info] of meta) {
			if (key === active) continue
			if (info.used < oldest) {
				oldest = info.used
				candidate = key
			}
		}

		if (!candidate) break

		remove(candidate)
	}
}

/** Stores a scoped route and prunes expired or least-recently-used inactive entries. */
export const set = (url: string, state: State, options?: Options & { active?: string }) => {
	if (!options?.scope) return

	const time = options?.now ?? now()
	const entry = key(options.scope, url)

	cache.set(entry, state)
	meta.set(entry, { scope: options.scope, cached: time, used: time })
	prune(key(options.scope, options.active ?? url), time)
}

/** Removes one cached route from one scope. */
export const evict = (url: string, options?: Options) => {
	if (!options?.scope) return
	remove(key(options.scope, url))
}

/** Removes every cached route for one scope. */
export const drop = (scope: string) => {
	for (const [key, info] of meta) {
		if (info.scope === scope) remove(key)
	}
}

/** Invalidates routes tracking changed topics, or every scope when no topics are supplied. */
export const invalidate = (topics?: string[]) => {
	if (!topics?.length) {
		clear()
		return
	}

	const changed = new Set(topics)

	for (const [key, state] of cache) {
		if (!state.topics?.length || state.topics.some(topic => changed.has(topic))) remove(key)
	}
}
