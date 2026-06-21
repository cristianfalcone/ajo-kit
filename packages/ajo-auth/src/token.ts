import { createHash } from 'node:crypto'
import { db } from './store'
import { generate } from './session'
import type { Ability } from './ability'

const hash = (plain: string) => createHash('sha256').update(plain).digest('hex')

/** Creates an API token and returns its plaintext credential once. */
export async function create(
	user: number,
	name: string,
	abilities: Ability[] = ['*'],
	ttl: number | null = 90 * 24 * 60 * 60 * 1000 // 90 días default
) {

	const plain = generate()
	const id = hash(plain)
	const expiry = ttl ? new Date(Date.now() + ttl).toISOString() : null

	await db().insertInto('tokens').values({
		id,
		user,
		name,
		abilities: JSON.stringify(abilities),
		last: null,
		expiry
	}).execute()

	return plain
}

/** Resolves a plaintext API token to its stored bearer identity. */
export async function validate(plain: string) {

	const id = hash(plain)

	const token = await db()
		.selectFrom('tokens')
		.select(['id', 'user', 'abilities', 'expiry'])
		.where('id', '=', id)
		.executeTakeFirst()

	if (!token) return null

	if (token.expiry && new Date(token.expiry) < new Date()) {
		await db().deleteFrom('tokens').where('id', '=', id).execute()
		return null
	}

	await db().updateTable('tokens')
		.set({ last: new Date().toISOString() })
		.where('id', '=', id)
		.execute()

	return { ...token, abilities: JSON.parse(token.abilities) as Ability[] }
}

/** Deletes the API token matching a plaintext credential. */
export const revoke = (plain: string) =>
	db().deleteFrom('tokens').where('id', '=', hash(plain)).execute()

/** Deletes every API token owned by a user. */
export const purge = (user: number) =>
	db().deleteFrom('tokens').where('user', '=', user).execute()

/** Lists stored API tokens for a user without plaintext secrets. */
export const list = (user: number) =>
	db().selectFrom('tokens')
		.select(['id', 'name', 'abilities', 'last', 'expiry', 'created'])
		.where('user', '=', user)
		.execute()

/** Deletes expired API tokens. */
export const prune = () =>
	db().deleteFrom('tokens')
		.where('expiry', '<', new Date().toISOString())
		.execute()
