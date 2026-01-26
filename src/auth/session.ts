import { randomBytes } from 'node:crypto'
import { db } from '/src/data'

export const generate = () => randomBytes(32).toString('base64url')

export const create = async (
	user: number,
	remember = false,
	ip?: string,
	agent?: string
) => {

	const id = generate()
	const days = remember ? 365 : 30
	const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
	const last = new Date().toISOString()

	await db().insertInto('sessions').values({
		id,
		user,
		expiry,
		ip: ip ?? null,
		agent: agent ?? null,
		last
	}).execute()

	return id
}

export const validate = async (id: string) => {

	const session = await db()
		.selectFrom('sessions')
		.select(['id', 'user', 'expiry'])
		.where('id', '=', id)
		.executeTakeFirst()

	if (!session || new Date(session.expiry) < new Date()) return null

	return session
}

export const remove = (id: string) =>
	db().deleteFrom('sessions').where('id', '=', id).execute()

export const touch = (id: string) =>
	db().updateTable('sessions')
		.set({ last: new Date().toISOString() })
		.where('id', '=', id)
		.execute()
