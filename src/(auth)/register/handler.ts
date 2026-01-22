import type { Request, Response } from 'polka'
import { AppError } from '../../constants'
import { hash } from '../../auth/password'
import { create } from '../../auth/session'
import { write } from '../../auth/cookie'
import { object, optional } from 'valibot'
import { users, roles, parse, email, password, username, trimmed } from '../../data'

const Signup = object({
	email,
	password,
	username,
	firstName: optional(trimmed, ''),
	lastName: optional(trimmed, ''),
})

export async function signup(req: Request, res: Response) {

	const input = parse(Signup, req.body)

	const exists = await users.byEmail(input.email)

	if (exists) {
		throw new AppError(400, 'Email already registered')
	}

	const hashed = await hash(input.password)

	const { id } = await users.create({
		...input,
		password: hashed,
	})

	const role = await roles.find('user')

	if (role) {
		await roles.assign(id, role.id)
	}

	const token = await create(id)

	write(res, token)

	return { redirect: '/' }
}
