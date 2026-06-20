import { createHash as sha } from 'node:crypto'
import { generate } from './session'
import { db } from './store'

const hash = (plain: string) => sha('sha256').update(plain).digest('hex')
const hours = 1

export async function create(user: number): Promise<string> {

	await db().deleteFrom('resets').where('user', '=', user).execute()

	const plain = generate()
	const id = hash(plain)
	const expiry = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

	await db().insertInto('resets').values({ id, user, expiry }).execute()

	return plain
}

export async function validate(plain: string): Promise<number | null> {

	const id = hash(plain)
	const reset = await db()
		.selectFrom('resets')
		.select(['user', 'expiry'])
		.where('id', '=', id)
		.executeTakeFirst()

	if (!reset || new Date(reset.expiry) < new Date()) return null

	return reset.user
}

export function prune() {
	return db().deleteFrom('resets').where('expiry', '<', new Date().toISOString()).execute()
}
