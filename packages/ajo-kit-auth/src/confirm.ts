import type { Request } from 'ajo-kit'

// A confirmation lasts three minutes and belongs to one session or token id;
// revocation clears it at once and stamp() sweeps expired stamps.
const window = 180_000

const stamps = new Map<string, number>()

const key = (user: number, kind: 'session' | 'token', id: string) => `${kind}:${user}:${id}`
const segment = (user: number) => `:${user}:`

/** Returns the current session/token confirmation key for a request. */
export function credential(req: Request): string | null {
	if (!req.user) return null
	if (req.token) return key(req.user.id, 'token', req.token.id)
	if (req.session) return key(req.user.id, 'session', req.session.id)
	return null
}

/** Stamps the current credential as password-confirmed for three minutes. */
export function stamp(req: Request): boolean {
	const id = credential(req)
	if (!id) return false
	const now = Date.now()
	for (const [key, at] of stamps) if (now - at >= window) stamps.delete(key)
	stamps.set(id, now)
	return true
}

/** Returns true when the current credential was confirmed in the last three minutes. */
export function check(req: Request): boolean {
	const id = credential(req)
	if (!id) return false
	const at = stamps.get(id)
	if (at === undefined) return false
	if (Date.now() - at < window) return true
	stamps.delete(id)
	return false
}

/** Clears the confirmation stamp for the current credential. */
export function clear(req: Request): void {
	const id = credential(req)
	if (id) stamps.delete(id)
}

/** Clears the confirmation stamp for a specific session. */
export function clearSession(user: number, id: string): void {
	stamps.delete(key(user, 'session', id))
}

/** Clears the confirmation stamp for a specific bearer token. */
export function clearToken(user: number, id: string): void {
	stamps.delete(key(user, 'token', id))
}

/** Clears every confirmation stamp for a user. */
export function clearUser(user: number): void {
	for (const id of stamps.keys()) {
		if (id.includes(segment(user))) stamps.delete(id)
	}
}
