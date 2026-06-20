import type { Request, Response } from '@kit'
import { Failure, ip, origin } from '@kit'
import { object, optional, string, forward, partialCheck, pipe } from '@kit/validate'
import { hash } from '@kit/auth/password'
import { create } from '@kit/auth/session'
import { write } from '@kit/auth/cookie'
import { check, hit } from '@kit/auth/limit'
import { url } from '@kit/auth/verify'
import { send } from '@kit/mail'
import { emit } from '@kit/server'
import { db, email, password, trimmed } from '/src/data'
import { parse } from '@kit/validate'

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
		const base = origin(req)

		if (!check(key)) {
			throw new Failure(429, 'Too many registration attempts. Try again later.')
		}

		hit(key)

		const input = parse(Signup, req.body)

		const exists = await db()
			.selectFrom('users')
			.select('id')
			.where('email', '=', input.email)
			.executeTakeFirst()

		if (exists) throw new Failure(400, 'Email already registered')

		const hashed = await hash(input.password)
		const { confirm, ...user } = input

		const id = await db().transaction().execute(async trx => {
			const created = await trx
				.insertInto('users')
				.values({ ...user, password: hashed })
				.returning('id')
				.executeTakeFirstOrThrow()

			const role = await trx
				.selectFrom('roles')
				.select('id')
				.where('name', '=', 'user')
				.executeTakeFirst()

			if (role) {
				await trx
					.insertInto('members')
					.values({ user: created.id, role: role.id })
					.execute()
			}

			return created.id
		})

		const link = url(id, base)

		await send({
			to: input.email,
			subject: 'Verify your email',
			text: `Welcome! Click here to verify your email: ${link}\n\nThis link expires in 24 hours.`,
		})

		const agent = req.headers['user-agent']
		const token = await create(id, false, ip(req), agent)
		emit([
			`sessions:${id}`,
			`dashboard:${id}`,
			`user:${id}`,
			'admin:sessions',
			'admin:users',
			'admin:stats',
		])

		write(res, token)

		return { redirect: '/dashboard' }
	}
}
