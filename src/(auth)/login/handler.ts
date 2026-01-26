import type { Request, Response } from 'polka'
import { object, string, optional, pipe, unknown, transform } from 'valibot'
import { verify } from '/src/auth/password'
import { create } from '/src/auth/session'
import { write } from '/src/auth/cookie'
import { check, hit, clear } from '/src/auth/limit'
import { db, parse, email } from '/src/data'
import { UnauthorizedError, AppError } from '/src/constants'

const checkbox = pipe(unknown(), transform(v => v === 'true' || v === true))

const Login = object({
	email,
	password: string(),
	remember: optional(checkbox, false),
})

export async function authenticate(req: Request, res: Response) {
	const input = parse(Login, req.body)

	const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.socket?.remoteAddress ?? 'unknown'
	const key = `login:${input.email}:${ip}`

	if (!check(key)) {
		throw new AppError(429, 'Too many login attempts. Try again later.')
	}

	hit(key)

	const user = await db()
		.selectFrom('users')
		.select(['id', 'password'])
		.where('email', '=', input.email)
		.executeTakeFirst()

	if (!user?.password || !await verify(input.password, user.password)) {
		throw new UnauthorizedError('Invalid credentials')
	}

	clear(key)

	const token = await create(user.id, input.remember)

	write(res, token, input.remember)

	return { redirect: '/dashboard' }
}
