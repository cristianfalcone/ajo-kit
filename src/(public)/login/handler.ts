import type { Request, Response } from 'polka'
import send from '@polka/send'
import { object, string, optional, pipe, unknown, transform } from 'valibot'
import { hash, verify } from '@kit/auth/password'
import { create } from '@kit/auth/session'
import { create as createToken } from '@kit/auth/token'
import { write } from '@kit/auth/cookie'
import { check, hit, clear } from '@kit/auth/limit'
import { db, email } from '/src/data'
import { parse } from '@kit/validate'
import { UnauthorizedError, AppError, ip } from '@kit'

const checkbox = pipe(unknown(), transform(v => v === 'true' || v === true))

// Dummy hash para prevenir timing attacks (ejecutar verify aunque usuario no exista)
const DUMMY_HASH = await hash('dummy-password-for-timing-attack-prevention')

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

		if (!check(key)) {
			throw new AppError(429, 'Too many login attempts. Try again later.')
		}

		hit(key)

		const user = await db()
			.selectFrom('users')
			.select(['id', 'password'])
			.where('email', '=', input.email)
			.executeTakeFirst()

		const valid = await verify(input.password, user?.password ?? DUMMY_HASH)

		if (!user?.password || !valid) throw new UnauthorizedError('Invalid credentials')

		clear(key)

		const agent = req.headers['user-agent']
		const token = await create(user.id, input.remember, addr, agent)

		write(res, token, input.remember)

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

		if (!check(key)) {
			throw new AppError(429, 'Too many attempts')
		}

		hit(key)

		const user = await db()
			.selectFrom('users')
			.select(['id', 'name', 'email', 'password'])
			.where('email', '=', input.email)
			.executeTakeFirst()

		const valid = await verify(input.password, user?.password ?? DUMMY_HASH)

		if (!user?.password || !valid) throw new UnauthorizedError('Invalid credentials')

		clear(key)

		const token = await createToken(
			user.id,
			input.device_name || 'API Client',
			['*']
		)

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
