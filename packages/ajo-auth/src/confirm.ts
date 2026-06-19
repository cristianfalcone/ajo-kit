import type { Request } from 'ajo-kit'

const stamps = new Map<string, number>()

const key = (user: number, kind: 'session' | 'token', id: string) => `${kind}:${user}:${id}`
const userSegment = (user: number) => `:${user}:`

export function credential(req: Request): string | null {
	if (!req.user) return null
	if (req.token) return key(req.user.id, 'token', req.token.id)
	if (req.session) return key(req.user.id, 'session', req.session.id)
	return null
}

export function stamp(req: Request): boolean {
	const id = credential(req)
	if (!id) return false
	stamps.set(id, Date.now())
	return true
}

export function check(req: Request, window = 180_000): boolean {
	const id = credential(req)
	if (!id) return false
	const at = stamps.get(id)
	if (!at) return false
	return Date.now() - at < window
}

export function clear(req: Request): void {
	const id = credential(req)
	if (id) stamps.delete(id)
}

export function clearSession(user: number, id: string): void {
	stamps.delete(key(user, 'session', id))
}

export function clearToken(user: number, id: string): void {
	stamps.delete(key(user, 'token', id))
}

export function clearUser(user: number): void {
	for (const id of stamps.keys()) {
		if (id.includes(userSegment(user))) stamps.delete(id)
	}
}
