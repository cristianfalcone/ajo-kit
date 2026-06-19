import type { Middleware, Request, Response } from 'ajo-kit'
import { UnauthorizedError, ForbiddenError, AppError, ajax } from 'ajo-kit'
import { can } from './token'
import { check as checkConfirm, credential as confirmCredential } from './confirm'
import { db } from './store'

export const redirect = (to: string | ((req: Request) => string)): Middleware => (req, res) => {

	const target = typeof to === 'function' ? to(req) : to
	const json = ajax(req)

	res.writeHead(json ? 200 : 302, json ? { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } : { Location: target })
	res.end(json ? JSON.stringify({ redirect: target }) : undefined)
}

export const when = (
	condition: (req: Request, res: Response) => boolean,
	middleware: Middleware,
	otherwise?: Middleware
): Middleware => (req, res, next) => {
	condition(req, res) ? middleware(req, res, next) : (otherwise ? otherwise(req, res, next) : next())
}

export const auth = (): Middleware => (req, _, next) => {
	if (!req.user) throw new UnauthorizedError()
	next()
}

export const role = <R extends string>(...allowed: R[]): Middleware => (req, _, next) => {

	if (!req.user) throw new UnauthorizedError()

	const roles = (req.user as { roles?: string[] }).roles ?? []

	if (!allowed.some(r => roles.includes(r))) throw new ForbiddenError()

	next()
}

export const protect = (to = '/login') => when(req => !req.user, redirect(to))
export const guest = (to = '/dashboard') => when(req => !!req.user, redirect(to))

export function requireAbility(req: Request, ...required: string[]) {

	if (!req.user) throw new UnauthorizedError()
	if (!req.token) return

	const missing = required.find(ability => !can(req.token!.abilities, ability))
	if (missing) throw new ForbiddenError(`Missing ability: ${missing}`)
}

export const ability = (...required: string[]): Middleware => (req, _, next) => {
	requireAbility(req, ...required)
	next()
}

export const confirmed = (window?: number): Middleware => (req, res, next) => {

	if (!req.user || !confirmCredential(req)) throw new UnauthorizedError()

	if (!checkConfirm(req, window)) {
		const returnTo = encodeURIComponent(req.originalUrl)
		return redirect(`/confirm?redirect=${returnTo}`)(req, res, next)
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

		if (ajax(req)) {
			throw new AppError(403, 'Email verification required')
		}

		return redirect('/verify')(req, res, next)
	}

	next()
}
