import type { Middleware } from 'polka'
import { UnauthorizedError, ForbiddenError, type Role } from '/src/constants'

export const auth = (): Middleware => (req, _, next) => {
	if (!req.user) throw new UnauthorizedError()
	next()
}

export const role = (...allowed: Role[]): Middleware => (req, _, next) => {
	if (!req.user) throw new UnauthorizedError()
	if (!allowed.some(role => req.user!.roles.includes(role))) throw new ForbiddenError()
	next()
}
