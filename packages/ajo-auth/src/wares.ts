import type { Middleware } from 'ajo-kit'
import { ForbiddenError, api } from 'ajo-kit'
import { read, clear } from './cookie'
import { validate } from './session'
import { validate as validateToken } from './token'
import { verify as verifyCsrf } from './csrf'
import { db } from './store'
import type { Role } from './types'

// Default: carga user + roles de las tablas auth

async function resolve(userId: number) {

	const user = await db()
		.selectFrom('users')
		.select(['id', 'name', 'email', 'verified'])
		.where('id', '=', userId)
		.executeTakeFirst()

	if (!user) return null

	const roles = await db()
		.selectFrom('members')
		.innerJoin('roles', 'roles.id', 'members.role')
		.select('roles.name')
		.where('members.user', '=', user.id)
		.execute()

	return { ...user, roles: roles.map(r => r.name as Role) }
}

type Resolve = typeof resolve

export function session(lookup?: Resolve): Middleware {

	const find = lookup ?? resolve

	return async (req, res, next) => {

		// 1. Cookie session (SPA/Web)

		const cookie = read(req)

		if (cookie) {

			const valid = await validate(cookie)

			if (valid) {
				const user = await find(valid.user)
				if (user) { req.user = user; return next() }
			}

			clear(res)
			return next()
		}

		// 2. Bearer token (API/Mobile/CLI)

		if (!api(req)) return next()

		const auth = req.headers.authorization

		if (auth?.startsWith('Bearer ')) {

			const token = await validateToken(auth.slice(7))

			if (token) {
				const user = await find(token.user)
				if (user) {
					req.user = user
					req.token = { abilities: token.abilities }
				}
			}
		}

		next()
	}
}

export const csrf: Middleware = (req, _, next) => {

	if (api(req)) return next()
	if (req.token) return next()
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

	if (!verifyCsrf(req)) throw new ForbiddenError('Invalid CSRF token')

	next()
}
