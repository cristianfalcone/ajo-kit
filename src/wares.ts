import type { Middleware } from 'polka'
import { read, clear } from '/src/auth/cookie'
import { validate } from '/src/auth/session'
import { validate as validateToken } from '/src/auth/token'
import { verify as verifyCsrf } from '/src/auth/csrf'
import { when, redirect } from '/src/auth/guard'
import { db } from '/src/data'
import type { Role } from '/src/data'
import { ForbiddenError } from '/src/constants'

export default [

	function timing(req, res, next) {

		const t0 = Date.now()
		const writeHead = res.writeHead

		res.writeHead = function () {
			res.setHeader('x-response-time', `${Date.now() - t0}ms`)
			return writeHead.apply(this, arguments as any)
		}

		console.log(req.method, req.url)

		next()
	},

	async function session(req, res, next) {

		// 1. Cookie session (SPA/Web)

		const cookie = read(req)

		if (cookie) {

			const session = await validate(cookie)

			if (session) {

				const user = await db()
					.selectFrom('users')
					.select(['id', 'name', 'email'])
					.where('id', '=', session.user)
					.executeTakeFirst()

				if (user) {

					const roles = await db()
						.selectFrom('members')
						.innerJoin('roles', 'roles.id', 'members.role')
						.select('roles.name')
						.where('members.user', '=', user.id)
						.execute()

					req.user = { ...user, roles: roles.map(r => r.name as Role) }

					return next()
				}
			}

			clear(res)

			return next()
		}

		// 2. Bearer token (API/Mobile/CLI)

		const auth = req.headers.authorization

		if (auth?.startsWith('Bearer ')) {

			const token = await validateToken(auth.slice(7))

			if (token) {

				const user = await db()
					.selectFrom('users')
					.select(['id', 'name', 'email'])
					.where('id', '=', token.user)
					.executeTakeFirst()

				if (user) {

					const roles = await db()
						.selectFrom('members')
						.innerJoin('roles', 'roles.id', 'members.role')
						.select('roles.name')
						.where('members.user', '=', user.id)
						.execute()

					req.user = { ...user, roles: roles.map(r => r.name as Role) }
					req.token = { abilities: token.abilities }
				}
			}
		}

		next()
	},

	function csrf(req, _, next) {

		// Skip para Bearer tokens
		if (req.token) return next()

		// Skip para safe methods
		if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

		if (!verifyCsrf(req)) {
			throw new ForbiddenError('Invalid CSRF token')
		}

		next()
	},

	when(req => req.path === '/', redirect(req => req.user ? '/dashboard' : '/login')),

] satisfies Middleware[]
