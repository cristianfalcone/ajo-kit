import type { Request, Response } from 'polka'
import { object, optional, string, forward, partialCheck, pipe } from 'valibot'
import { AppError, ip } from '/src/constants'
import { hash } from '/src/auth/password'
import { create } from '/src/auth/session'
import { write } from '/src/auth/cookie'
import { check, hit } from '/src/auth/limit'
import { url } from '/src/auth/verify'
import { send } from '/src/mail'
import { db, parse, email, password, trimmed } from '/src/data'
import { emit } from '/src/server'

const Signup = pipe(
	object({
		email,
		password,
		confirm: string(),
		name: optional(trimmed, ''),
	}),
	forward(
		partialCheck(
			[['password'], ['confirm']],
			input => input.password === input.confirm,
			'Passwords do not match'
		),
		['confirm']
	)
)

export const actions = {

	default: async (req: Request, res: Response) => {

		const addr = ip(req)
		const key = `register:${addr}`

		if (!check(key)) {
			throw new AppError(429, 'Too many registration attempts. Try again later.')
		}

		hit(key)

		const input = parse(Signup, req.body)

		const exists = await db()
			.selectFrom('users')
			.select('id')
			.where('email', '=', input.email)
			.executeTakeFirst()

		if (exists) throw new AppError(400, 'Email already registered')

		const hashed = await hash(input.password)
		const { confirm, ...user } = input

		const { id } = await db()
			.insertInto('users')
			.values({ ...user, password: hashed })
			.returning('id')
			.executeTakeFirstOrThrow()

		const role = await db()
			.selectFrom('roles')
			.select('id')
			.where('name', '=', 'user')
			.executeTakeFirst()

		if (role) {
			await db()
				.insertInto('members')
				.values({ user: id, role: role.id })
				.execute()
		}

		const base = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`
		const link = url(id, base)

		await send({
			to: input.email,
			subject: 'Verify your email',
			text: `Welcome! Click here to verify your email: ${link}\n\nThis link expires in 24 hours.`,
		})

		const agent = req.headers['user-agent']
		const token = await create(id, false, ip(req), agent)

		write(res, token)
		emit('activity')

		return { redirect: '/dashboard' }
	}
}
