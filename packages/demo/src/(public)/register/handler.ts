import * as auth from 'ajo-kit-auth'
import type { ActionContext, Request, Response } from 'ajo-kit'
import { Failure, Forbidden, ip, origin } from 'ajo-kit'
import { optional, parse } from 'ajo-kit/validate'
import { deliver } from 'ajo-kit-mail'
import { confirmed, db, email, trimmed } from '/src/data'
import * as registration from '/src/data/registration'

const Signup = confirmed({ email, name: optional(trimmed, '') })

export async function page(req: Request) {
	req.track?.('registration:policy')

	return { signup: await registration.policy() }
}

export const actions = {

	default: async (req: Request, res: Response, action: ActionContext) => {

		if (await registration.policy() === 'invite') {
			throw new Forbidden('Registration is by invitation only')
		}

		const addr = ip(req)
		const key = `register:${addr}`
		const base = origin(req)

		if (!auth.limit.hit(key)) {
			throw new Failure(429, 'Too many registration attempts. Try again later.')
		}

		const input = parse(Signup, req.body)

		const exists = await db()
			.selectFrom('users')
			.select('id')
			.where('email', '=', input.email)
			.executeTakeFirst()

		if (exists) throw new Failure(400, 'Email already registered')

		const hashed = await auth.password.hash(input.password)
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

		const link = auth.verify.url(id, input.email, base)

		const outcome = await deliver({
			to: input.email,
			subject: 'Verify your email',
			text: `Welcome! Click here to verify your email: ${link}\n\nThis link expires in 24 hours.`,
		})
		if (!outcome.ok) throw outcome.error

		const agent = req.headers['user-agent']
		const token = await auth.session.create(id, false, ip(req), agent)
		action.emit([
			`user:${id}`,
			'admin:sessions',
			'admin:users',
			'admin:stats',
		])

		auth.cookie.write(res, token)

		return { redirect: '/dashboard' }
	}
}
