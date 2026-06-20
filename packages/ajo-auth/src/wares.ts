import type { Middleware, Request } from 'ajo-kit'
import { Forbidden, api } from 'ajo-kit'
import { read, clear } from './cookie'
import { validate } from './session'
import { validate as bearer } from './token'
import { verify as valid } from './csrf'
import { db } from './store'
import type { Role } from './types'

// Default: carga user + roles de las tablas auth

async function resolve(id: number) {

	const user = await db()
		.selectFrom('users')
		.select(['id', 'name', 'email', 'verified'])
		.where('id', '=', id)
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

const reset = (req: Request) => {
	delete req.user
	delete req.session
	delete req.token
}

export function session(lookup?: Resolve): Middleware {

	const find = lookup ?? resolve

	return async (req, res, next) => {

		reset(req)

		// 1. Explicit bearer token for API/Mobile/CLI

		const auth = req.headers.authorization

		if (api(req) && auth?.startsWith('Bearer ')) {

			const authz = await bearer(auth.slice(7))

			if (authz) {
				const user = await find(authz.user)
				if (user) {
					req.user = user
					req.token = { id: authz.id, abilities: authz.abilities }
				}
			}

			return next()
		}

		// 2. Cookie session (SPA/Web)

		const cookie = read(req)

		if (cookie) {

			const valid = await validate(cookie)

			if (valid) {
				const user = await find(valid.user)
				if (user) {
					req.user = user
					req.session = { id: valid.id }
					return next()
				}
			}

			clear(res)
			return next()
		}

		next()
	}
}

export const csrf: Middleware = (req, _, next) => {

	if (req.token) return next()
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
	if (api(req) && !req.user) return next()

	if (!valid(req)) throw new Forbidden('Invalid CSRF token')

	next()
}
