import type { Middleware } from 'polka'
import { UnauthorizedError, ForbiddenError, type Role } from '../constants'

export const auth = (): Middleware => (req, _, next) => {
	if (!req.auth) throw new UnauthorizedError()
	next()
}

export const role = (...allowed: Role[]): Middleware => (req, _, next) => {
	if (!req.auth) throw new UnauthorizedError()
	if (!allowed.some(r => req.auth!.roles.includes(r))) throw new ForbiddenError()
	next()
}
