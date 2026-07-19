interface Attempt {
	count: number
	reset: number
}

const store = new Map<string, Attempt>()

/** Returns true when a key is still under the hit limit. */
export function check(key: string, max = 5): boolean {
	const entry = store.get(key)
	if (!entry || Date.now() > entry.reset) return true
	return entry.count < max
}

/** Records one hit for a key within the current window. */
export function hit(key: string, window = 60_000): void {

	const entry = store.get(key)
	const now = Date.now()

	if (!entry || now > entry.reset) {
		store.set(key, { count: 1, reset: now + window })
	} else {
		entry.count++
	}
}

/** Clears all hits for a key. */
export function clear(key: string): void {
	store.delete(key)
}

/** Returns remaining hits before a key reaches the limit. */
export function remaining(key: string, max = 5): number {
	const entry = store.get(key)
	if (!entry || Date.now() > entry.reset) return max
	return Math.max(0, max - entry.count)
}
