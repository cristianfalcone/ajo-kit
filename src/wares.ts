import type { Middleware } from 'polka'
import { read, clear, validate } from '/src/auth'
import { users, roles } from '/src/data'

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

		const token = read(req)

		if (!token) return next()

		const data = await validate(token)

		if (!data) {
			clear(res)
			return next()
		}

		const user = await users.find(data.userId)

		if (!user) {
			clear(res)
			return next()
		}

		const userRoles = await roles.forUser(user.id)

		req.user = { id: user.id, username: user.username, email: user.email, roles: userRoles }

		next()
	},

] satisfies Middleware[]
