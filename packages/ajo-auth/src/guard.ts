import type { Middleware, Request, Response } from 'ajo-kit'
import { Denied, Forbidden, Failure, ajax } from 'ajo-kit'
import { can } from './token'
import { check as confirm, credential } from './confirm'
import { db } from './store'

/** Redirects HTML requests or returns a JSON redirect envelope for AJAX. */
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

/** Runs middleware only when a request condition matches. */
export const when = (
	condition: (req: Request, res: Response) => boolean,
	middleware: Middleware,
	otherwise?: Middleware
): Middleware => (req, res, next) => {
	if (condition(req, res)) return middleware(req, res, next)
	if (otherwise) return otherwise(req, res, next)
	next()
}

/** Requires an authenticated request user. */
export const auth = (): Middleware => (req, _, next) => {
	if (!req.user) throw new Denied()
	next()
}

/** Requires the authenticated user to have one of the allowed roles. */
export const role = <R extends string>(...allowed: R[]): Middleware => (req, _, next) => {

	if (!req.user) throw new Denied()

	const roles = (req.user as { roles?: string[] }).roles ?? []

	if (!allowed.some(r => roles.includes(r))) throw new Forbidden()

	next()
}

/** Redirects guests away from protected browser routes. */
export const protect = (to = '/login') => when(req => !req.user, redirect(to))
/** Redirects authenticated users away from guest-only routes. */
export const guest = (to = '/dashboard') => when(req => !!req.user, redirect(to))

/** Throws when the current bearer token lacks required abilities. */
export function authorize(req: Request, ...required: string[]) {

	if (!req.user) throw new Denied()
	if (!req.token) return

	const missing = required.find(ability => !can(req.token!.abilities, ability))
	if (missing) throw new Forbidden(`Missing ability: ${missing}`)
}

/** Middleware variant of authorize() for route stacks. */
export const ability = (...required: string[]): Middleware => (req, _, next) => {
	authorize(req, ...required)
	next()
}

/** Requires recent password confirmation for the current credential. */
export const confirmed = (window?: number): Middleware => (req, res, next) => {

	if (!req.user || !credential(req)) throw new Denied()

	if (!confirm(req, window)) {
		const back = encodeURIComponent(req.originalUrl)
		return redirect(`/confirm?redirect=${back}`)(req, res, next)
	}

	next()
}

/** Requires the authenticated user to have a verified timestamp. */
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
