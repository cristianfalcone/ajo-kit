import { randomBytes } from 'node:crypto'
import { db } from '/src/data'

const days = 30

export const generate = () => randomBytes(32).toString('base64url')

export const create = async (user: number) => {
	const id = generate()
	const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
	await db().insertInto('sessions').values({ id, user, expiry }).execute()
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
