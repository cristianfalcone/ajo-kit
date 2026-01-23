import type { Request, Response } from 'polka'
import { object, optional } from 'valibot'
import { AppError } from '/src/constants'
import { hash, create, write } from '/src/auth'
import { users, roles, parse, email, password, username, trimmed } from '/src/data'

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

	if (exists) throw new AppError(400, 'Email already registered')

	const password = await hash(input.password)

	const { id } = await users.create({ ...input, password })

	const role = await roles.find('user')

	if (role) await roles.assign(id, role.id)

	const token = await create(id)

	write(res, token)

	return { redirect: '/' }
}
