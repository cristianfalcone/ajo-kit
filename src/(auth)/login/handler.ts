import type { Request, Response } from 'polka'
import { object, string } from 'valibot'
import { verify } from '/src/auth/password'
import { create } from '/src/auth/session'
import { write } from '/src/auth/cookie'
import { db, parse, email } from '/src/data'
import { UnauthorizedError } from '/src/constants'

const Login = object({
	email,
	password: string(),
})

export async function authenticate(req: Request, res: Response) {

	const input = parse(Login, req.body)

	const user = await db()
		.selectFrom('users')
		.select(['id', 'password'])
		.where('email', '=', input.email)
		.executeTakeFirst()

	if (!user?.password || !await verify(input.password, user.password)) {
		throw new UnauthorizedError('Invalid credentials')
	}

	const token = await create(user.id)

	write(res, token)

	return { redirect: '/dashboard' }
}
