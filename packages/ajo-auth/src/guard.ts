import type { Middleware, Request, Response } from 'ajo-kit'
import { Denied, Forbidden, Failure, ajax } from 'ajo-kit'
import { can } from './token'
import { check as confirm, credential } from './confirm'
import { db } from './store'

export const redirect = (to: string | ((req: Request) => string)): Middleware => (req, res) => {

	const target = typeof to === 'function' ? to(req) : to
	const json = ajax(req)

	res.writeHead(
		json ? 200 : 302,
		json
			? { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
			: { Location: target }
	)
	res.end(json ? JSON.stringify({ redirect: target }) : undefined)
}

export const when = (
	condition: (req: Request, res: Response) => boolean,
	middleware: Middleware,
	otherwise?: Middleware
): Middleware => (req, res, next) => {
	if (condition(req, res)) return middleware(req, res, next)
	if (otherwise) return otherwise(req, res, next)
	next()
}

export const auth = (): Middleware => (req, _, next) => {
	if (!req.user) throw new Denied()
	next()
}

export const role = <R extends string>(...allowed: R[]): Middleware => (req, _, next) => {

	if (!req.user) throw new Denied()

	const roles = (req.user as { roles?: string[] }).roles ?? []

	if (!allowed.some(r => roles.includes(r))) throw new Forbidden()

	next()
}

export const protect = (to = '/login') => when(req => !req.user, redirect(to))
export const guest = (to = '/dashboard') => when(req => !!req.user, redirect(to))

export function authorize(req: Request, ...required: string[]) {

	if (!req.user) throw new Denied()
	if (!req.token) return

	const missing = required.find(ability => !can(req.token!.abilities, ability))
	if (missing) throw new Forbidden(`Missing ability: ${missing}`)
}

export const ability = (...required: string[]): Middleware => (req, _, next) => {
	authorize(req, ...required)
	next()
}

export const confirmed = (window?: number): Middleware => (req, res, next) => {

	if (!req.user || !credential(req)) throw new Denied()

	if (!confirm(req, window)) {
		const back = encodeURIComponent(req.originalUrl)
		return redirect(`/confirm?redirect=${back}`)(req, res, next)
	}

	next()
}

export const verified = (): Middleware => async (req, res, next) => {

	if (!req.user) throw new Denied()

	const user = await db()
		.selectFrom('users')
		.select(['verified'])
		.where('id', '=', req.user.id)
		.executeTakeFirst()

	if (!user?.verified) {

		if (ajax(req)) {
			throw new Failure(403, 'Email verification required')
		}

		return redirect('/verify')(req, res, next)
	}

	next()
}
