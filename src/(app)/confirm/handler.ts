import * as auth from '@kit/auth'
import type { Request } from '@kit'
import { object, string } from '@kit/validate'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { Failure, Denied, ip } from '@kit'

const Confirm = object({ password: string() })

export const actions = {

	default: async (req: Request) => {

		const input = parse(Confirm, req.body)
		const current = auth.confirm.credential(req)

		if (!current) throw new Denied()

		const limit = `confirm:${req.user!.id}:${current}:${ip(req)}`

		if (!auth.limit.check(limit)) {
			throw new Failure(429, 'Too many confirmation attempts. Try again later.')
		}

		auth.limit.hit(limit)

		const user = await db()
			.selectFrom('users')
			.select(['password'])
			.where('id', '=', req.user!.id)
			.executeTakeFirst()

		if (!user?.password || !await auth.password.verify(input.password, user.password)) {
			throw new Denied('Invalid password')
		}

		auth.limit.clear(limit)

		if (!auth.confirm.stamp(req)) throw new Denied()

		return { confirmed: true }
	}
}
