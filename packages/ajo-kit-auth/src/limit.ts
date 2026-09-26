import { sha256Hex } from 'ajo-kit/platform'

interface Attempt {
	count: number
	reset: number
}

// Keys come from requests (addresses, emails), so the store is bounded. A full
// store of live counters refuses new keys instead of evicting one: eviction
// would let a flood of fresh keys reset the counters it exists to keep. While
// full, expired counters are swept at most once per second, so a flood of new
// keys cannot turn each refusal into a walk of the whole store. Keys are stored
// as their SHA-256 digest, so a long key costs the same memory as a short one.
const capacity = 10_000
const interval = 1000

const store = new Map<string, Attempt>()
let swept = 0

/**
 * Records one attempt for a key and returns true while the key has made at most
 * `max` attempts in its current window. Refused attempts count too. A new key
 * is refused while the store is full of live counters, and until the next
 * sweep (at most once per second) reclaims an expired one.
 */
export function hit(key: string, max = 5, window = 60_000): boolean {

	key = sha256Hex(key)
	const now = Date.now()
	const entry = store.get(key)

	if (entry && now <= entry.reset) return ++entry.count <= max

	if (!entry && store.size >= capacity) {
		if (now - swept < interval) return false
		swept = now
		for (const [name, { reset }] of store) if (now > reset) store.delete(name)
		if (store.size >= capacity) return false
	}

	store.set(key, { count: 1, reset: now + window })
	return true
}

/** Clears all attempts for a key. */
export function clear(key: string): void {
	store.delete(sha256Hex(key))
}
