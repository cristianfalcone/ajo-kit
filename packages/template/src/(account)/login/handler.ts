import { Denied, Failure, ip, type Request, type Response } from 'ajo-kit'
import { cookie, limit, password, session } from 'ajo-kit-auth'
import { maxLength, object, parse, pipe, string } from 'ajo-kit/validate'
import { db } from '../../database'
import { address } from '../../validation'

const dummy = await password.hash('not-a-user-password-for-timing')
const Login = object({ email: address, password: pipe(string(), maxLength(128)) })

export const actions = {
	default: async (req: Request, res: Response) => {
		const input = parse(Login, req.body)
		const address = `login:ip:${ip(req)}`
		const key = `login:${ip(req)}:${input.email}`
		if (!limit.check(address, 20) || !limit.check(key)) {
			throw new Failure(429, 'Too many attempts. Try again in a minute.')
		}
		limit.hit(address)
		limit.hit(key)
		const user = await db().selectFrom('users').select(['id', 'password'])
			.where('email', '=', input.email).executeTakeFirst()
		const valid = await password.verify(input.password, user?.password ?? dummy)
		if (!user?.password || !valid) throw new Denied('Email or password is incorrect')
		limit.clear(key)
		const token = await session.create(user.id, false, ip(req), req.headers['user-agent'])
		cookie.write(res, token)
		return { redirect: '/notes' }
	},
}
