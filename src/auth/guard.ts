import type { Middleware, Request, Response } from 'polka'
import send from '@polka/send'
import { UnauthorizedError, ForbiddenError, AppError, type Role } from '/src/constants'
import { pack } from '/src/serial'
import { can } from './token'
import { check as checkConfirm } from './confirm'
import { db } from '/src/data'

export const redirect = (to: string | ((req: Request) => string)): Middleware => (req, res) => {

	const target = typeof to === 'function' ? to(req) : to

	if (req.headers.accept?.includes('application/json')) {
		send(res, 200, pack({ redirect: target }))
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

export const ability = (...required: string[]): Middleware => (req, _, next) => {

	if (!req.user) throw new UnauthorizedError()
	if (!req.token) return next()

	for (const a of required) {
		if (!can(req.token.abilities, a)) {
			throw new ForbiddenError(`Missing ability: ${a}`)
		}
	}

	next()
}

export const confirmed = (window?: number): Middleware => (req, _, next) => {

	if (!req.user) throw new UnauthorizedError()

	if (!checkConfirm(req.user.id, window)) {
		throw new AppError(423, 'Password confirmation required')
	}

	next()
}

export const verified = (): Middleware => async (req, res, next) => {

	if (!req.user) throw new UnauthorizedError()

	const user = await db()
		.selectFrom('users')
		.select(['verified'])
		.where('id', '=', req.user.id)
		.executeTakeFirst()

	if (!user?.verified) {

		if (req.headers.accept?.includes('application/json')) {
			throw new AppError(403, 'Email verification required')
		}

		return redirect('/verify')(req, res, next)
	}

	next()
}
