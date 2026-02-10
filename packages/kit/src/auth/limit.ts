interface Attempt {
	count: number
	reset: number
}

const store = new Map<string, Attempt>()

export function check(key: string, max = 5): boolean {
	const entry = store.get(key)
	if (!entry || Date.now() > entry.reset) return true
	return entry.count < max
}

export function hit(key: string, window = 60_000): void {

	const entry = store.get(key)
	const now = Date.now()

	if (!entry || now > entry.reset) {
		store.set(key, { count: 1, reset: now + window })
	} else {
		entry.count++
	}
}

export function clear(key: string): void {
	store.delete(key)
}

export function remaining(key: string, max = 5): number {
	const entry = store.get(key)
	if (!entry || Date.now() > entry.reset) return max
	return Math.max(0, max - entry.count)
}
