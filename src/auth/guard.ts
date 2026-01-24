import type { Middleware, Request, Response } from 'polka'
import send from '@polka/send'
import { UnauthorizedError, ForbiddenError, type Role } from '/src/constants'

export const redirect = (to: string | ((req: Request) => string)): Middleware => (req, res) => {

	const target = typeof to === 'function' ? to(req) : to

	if (req.headers.accept?.includes('application/json')) {
		send(res, 200, { redirect: target })
	} else {
		send(res, 302, null, { 'Location': target })
	}
}

export const when = (condition: (req: Request, res: Response) => boolean, middleware: Middleware): Middleware => (req, res, next) => {
	condition(req, res) ? middleware(req, res, next) : next()
}

export const auth = (): Middleware => (req, _, next) => {
	if (!req.user) throw new UnauthorizedError()
	next()
}

export const role = (...allowed: Role[]): Middleware => (req, _, next) => {
	if (!req.user) throw new UnauthorizedError()
	if (!allowed.some(role => req.user!.roles.includes(role))) throw new ForbiddenError()
	next()
}

export const protect = (to = '/login') => when(req => !req.user, redirect(to))
export const guest = (to = '/dashboard') => when(req => !!req.user, redirect(to))
