import type { State } from './utils'

const max = 50

const ttl = 5 * 60 * 1000

type Entry = {
	state: State
	scope: string
	cached: number
	used: number
}

const cache = new Map<string, Entry>()

const key = (scope: string, url: string) => JSON.stringify([scope, url])

type Options = {
	scope?: string
}

/** Reads an unexpired route only from the caller's declared identity scope. */
export const get = (url: string, options?: Options) => {
	if (!options?.scope) return

	const id = key(options.scope, url)
	const entry = cache.get(id)

	if (!entry) return

	const time = Date.now()

	if (time - entry.cached > ttl) {
		cache.delete(id)
		return
	}

	entry.used = time

	return entry.state
}

const prune = (active: string, time: number) => {
	for (const [id, entry] of cache) {
		if (id !== active && time - entry.cached > ttl) cache.delete(id)
	}

	while (cache.size > max) {
		let candidate: string | undefined
		let oldest = Infinity

		for (const [id, entry] of cache) {
			if (id === active) continue
			if (entry.used < oldest) {
				oldest = entry.used
				candidate = id
			}
		}

		if (!candidate) break

		cache.delete(candidate)
	}
}

/** Stores a scoped route and prunes expired or least-recently-used inactive entries. */
export const set = (url: string, state: State, options?: Options & { active?: string }) => {
	if (!options?.scope) return

	const time = Date.now()

	cache.set(key(options.scope, url), { state, scope: options.scope, cached: time, used: time })
	prune(key(options.scope, options.active ?? url), time)
}

/** Removes one cached route from one scope. */
export const evict = (url: string, options?: Options) => {
	if (!options?.scope) return
	cache.delete(key(options.scope, url))
}

/** Removes every cached route for one scope. */
export const drop = (scope: string) => {
	for (const [id, entry] of cache) {
		if (entry.scope === scope) cache.delete(id)
	}
}

/** Invalidates routes tracking changed topics, or every scope when no topics are supplied. */
export const invalidate = (topics?: string[]) => {
	if (!topics?.length) {
		cache.clear()
		return
	}

	const changed = new Set(topics)

	for (const [id, { state }] of cache) {
		if (!state.topics?.length || state.topics.some(topic => changed.has(topic))) cache.delete(id)
	}
}
