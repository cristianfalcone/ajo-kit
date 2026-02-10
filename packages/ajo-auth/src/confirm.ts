const stamps = new Map<number, number>()

export function stamp(user: number): void {
	stamps.set(user, Date.now())
}

export function check(user: number, window = 180_000): boolean {
	const at = stamps.get(user)
	if (!at) return false
	return Date.now() - at < window
}

export function clear(user: number): void {
	stamps.delete(user)
}
