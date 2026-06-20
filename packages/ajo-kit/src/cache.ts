import type { State } from './constants'

export const max = 50
export const ttl = 5 * 60 * 1000

type Meta = {
	cached: number
	used: number
}

const cache = new Map<string, State>()

const meta = new Map<string, Meta>()

const now = () => Date.now()

const remove = (url: string) => {
	cache.delete(url)
	meta.delete(url)
}

export const clear = () => {
	cache.clear()
	meta.clear()
}

export const get = (url: string, time = now()) => {
	const state = cache.get(url)
	const info = meta.get(url)

	if (!state || !info) return

	if (time - info.cached > ttl) {
		remove(url)
		return
	}

	info.used = time

	return state
}

const prune = (active?: string, time = now()) => {
	for (const [url, info] of meta) {
		if (url !== active && time - info.cached > ttl) remove(url)
	}

	while (cache.size > max) {
		let candidate: string | undefined
		let oldest = Infinity

		for (const [url, info] of meta) {
			if (url === active) continue
			if (info.used < oldest) {
				oldest = info.used
				candidate = url
			}
		}

		if (!candidate) break

		remove(candidate)
	}
}

export const set = (url: string, state: State, options?: { active?: string; now?: number }) => {
	const time = options?.now ?? now()

	cache.set(url, state)
	meta.set(url, { cached: time, used: time })
	prune(options?.active ?? url, time)
}

export const invalidate = (topics?: string[]) => {
	if (!topics?.length) {
		clear()
		return
	}

	const changed = new Set(topics)

	for (const [url, state] of cache) {
		if (!state.topics?.length || state.topics.some(topic => changed.has(topic))) remove(url)
	}
}
