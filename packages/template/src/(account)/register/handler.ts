import { Failure, Invalid, ip, type Request } from 'ajo-kit'
import { limit, password as secret } from 'ajo-kit-auth'
import { forward, maxLength, minLength, object, parse, partialCheck, pipe, string, trim } from 'ajo-kit/validate'
import { db } from '../../database'
import { address, password } from '../../validation'

const Signup = pipe(
	object({
		name: pipe(string(), trim(), minLength(1, 'Enter your name'), maxLength(80)),
		email: address,
		password,
		confirm: string(),
	}),
	forward(partialCheck(
		[['password'], ['confirm']],
		input => input.password === input.confirm,
		'Passwords do not match',
	), ['confirm']),
)

export const actions = {
	default: async (req: Request) => {
		const key = `register:${ip(req)}`
		if (!limit.check(key)) throw new Failure(429, 'Too many attempts. Try again in a minute.')
		limit.hit(key)
		const input = parse(Signup, req.body)
		const hashed = await secret.hash(input.password)
		const user = await db().insertInto('users')
			.values({ name: input.name, email: input.email, password: hashed, verified: null, updated: null })
			.onConflict(conflict => conflict.column('email').doNothing())
			.returning('id').executeTakeFirst()
		if (!user) throw new Invalid({ email: ['This email is already registered'] })
		return { redirect: '/login' }
	},
}
