import type { Request } from '@kit'
import { object, string } from '@kit/validate'
import { verify } from '@kit/auth/password'
import { credential, stamp } from '@kit/auth/confirm'
import { check, hit, clear } from '@kit/auth/limit'
import { db } from '/src/data'
import { parse } from '@kit/validate'
import { AppError, UnauthorizedError, ip } from '@kit'

const Confirm = object({ password: string() })

export const actions = {

	default: async (req: Request) => {

		const input = parse(Confirm, req.body)
		const current = credential(req)

		if (!current) throw new UnauthorizedError()

		const limit = `confirm:${req.user!.id}:${current}:${ip(req)}`

		if (!check(limit)) {
			throw new AppError(429, 'Too many confirmation attempts. Try again later.')
		}

		hit(limit)

		const user = await db()
			.selectFrom('users')
			.select(['password'])
			.where('id', '=', req.user!.id)
			.executeTakeFirst()

		if (!user?.password || !await verify(input.password, user.password)) {
			throw new UnauthorizedError('Invalid password')
		}

		clear(limit)

		if (!stamp(req)) throw new UnauthorizedError()

		return { confirmed: true }
	}
}
