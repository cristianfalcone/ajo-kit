import type { Request, Response, NextHandler } from 'polka'
import { read, clear, validate } from '/src/auth'
import { users, roles } from '/src/data'

export default [

	function timing(req: Request, res: Response, next: NextHandler) {

		const t0 = Date.now()

		const writeHead = res.writeHead

		res.writeHead = function () {

			res.setHeader('x-response-time', `${Date.now() - t0}ms`)

			return writeHead.apply(this, arguments as any)
		}

		console.log(req.method, req.url)

		return next()
	},

	async function session(req: Request, res: Response, next: NextHandler) {

		const token = read(req)

		if (!token) {
			req.auth = null
			return next()
		}

		const data = await validate(token)

		if (!data) {
			clear(res)
			req.auth = null
			return next()
		}

		const user = await users.find(data.userId)

		if (!user) {
			clear(res)
			req.auth = null
			return next()
		}

		const userRoles = await roles.forUser(user.id)

		req.auth = { id: user.id, username: user.username, email: user.email, roles: userRoles }

		return next()
	},
]
