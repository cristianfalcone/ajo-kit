import * as auth from '@kit/auth'
import type { Request, Response } from '@kit'
import { send, emit } from '@kit/server'
import { object, string, optional, pipe, unknown, transform } from '@kit/validate'
import { db, email } from '/src/data'
import { parse } from '@kit/validate'
import { Denied, Failure, ip } from '@kit'

const checkbox = pipe(unknown(), transform(v => v === 'true' || v === true))

// Dummy hash para prevenir timing attacks (ejecutar verify aunque usuario no exista)
const DUMMY_HASH = await auth.password.hash('dummy-password-for-timing-attack-prevention')

const Login = object({
	email,
	password: string(),
	remember: optional(checkbox, false),
})

export const actions = {

	default: async (req: Request, res: Response) => {

		const input = parse(Login, req.body)
		const addr = ip(req)
		const key = `login:${input.email}:${addr}`

		if (!auth.limit.check(key)) {
			throw new Failure(429, 'Too many login attempts. Try again later.')
		}

		auth.limit.hit(key)

		const user = await db()
			.selectFrom('users')
			.select(['id', 'password'])
			.where('email', '=', input.email)
			.executeTakeFirst()

		const valid = await auth.password.verify(input.password, user?.password ?? DUMMY_HASH)

		if (!user?.password || !valid) throw new Denied('Invalid credentials')

		auth.limit.clear(key)

		const agent = req.headers['user-agent']
		const token = await auth.session.create(user.id, input.remember, addr, agent)
		emit([`sessions:${user.id}`, `dashboard:${user.id}`, `user:${user.id}`, 'admin:sessions', 'admin:stats'])

		auth.cookie.write(res, token, input.remember)

		return { redirect: '/dashboard' }
	}
}

const ApiLogin = object({
	email,
	password: string(),
	device_name: optional(string()),
})

export default {

	async post(req: Request, res: Response) {

		const input = parse(ApiLogin, req.body)
		const addr = ip(req)
		const key = `login:${input.email}:${addr}`

		if (!auth.limit.check(key)) {
			throw new Failure(429, 'Too many attempts')
		}

		auth.limit.hit(key)

		const user = await db()
			.selectFrom('users')
			.select(['id', 'name', 'email', 'password'])
			.where('email', '=', input.email)
			.executeTakeFirst()

		const valid = await auth.password.verify(input.password, user?.password ?? DUMMY_HASH)

		if (!user?.password || !valid) throw new Denied('Invalid credentials')

		auth.limit.clear(key)

		const token = await auth.token.create(
			user.id,
			input.device_name || 'API Client',
			['*']
		)
		emit([`tokens:${user.id}`, `dashboard:${user.id}`, `user:${user.id}`, 'admin:tokens', 'admin:stats'])

		send(res, 200, {
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
			}
		})
	}
}
