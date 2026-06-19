import type { State } from './constants'

export const CACHE_MAX = 50
export const CACHE_TTL = 5 * 60 * 1000

type Meta = {
	cachedAt: number
	lastUsed: number
}

const cache = new Map<string, State>()

const meta = new Map<string, Meta>()

const now = () => Date.now()

const remove = (url: string) => {
	cache.delete(url)
	meta.delete(url)
}

export const clearCache = () => {
	cache.clear()
	meta.clear()
}

export const getCache = (url: string, time = now()) => {
	const state = cache.get(url)
	const info = meta.get(url)

	if (!state || !info) return

	if (time - info.cachedAt > CACHE_TTL) {
		remove(url)
		return
	}

	info.lastUsed = time

	return state
}

const pruneCache = (activeUrl?: string, time = now()) => {
	for (const [url, info] of meta) {
		if (url !== activeUrl && time - info.cachedAt > CACHE_TTL) remove(url)
	}

	while (cache.size > CACHE_MAX) {
		let oldestUrl: string | undefined
		let oldest = Infinity

		for (const [url, info] of meta) {
			if (url === activeUrl) continue
			if (info.lastUsed < oldest) {
				oldest = info.lastUsed
				oldestUrl = url
			}
		}

		if (!oldestUrl) break

		remove(oldestUrl)
	}
}

export const setCache = (url: string, state: State, options?: { activeUrl?: string; now?: number }) => {
	const time = options?.now ?? now()

	cache.set(url, state)
	meta.set(url, { cachedAt: time, lastUsed: time })
	pruneCache(options?.activeUrl ?? url, time)
}

export const invalidateCache = (topics?: string[]) => {
	if (!topics?.length) {
		clearCache()
		return
	}

	const changed = new Set(topics)

	for (const [url, state] of cache) {
		if (!state.topics?.length || state.topics.some(topic => changed.has(topic))) remove(url)
	}
}
