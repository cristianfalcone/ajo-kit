import { createHash } from 'node:crypto'
import { db } from '/src/data'
import { generate } from './session'

export type Ability = string

const hash = (plain: string) => createHash('sha256').update(plain).digest('hex')

export async function create(
	user: number,
	name: string,
	abilities: Ability[] = ['*'],
	expiresMs?: number
) {

	const plain = generate()
	const id = hash(plain)
	const expiry = expiresMs ? new Date(Date.now() + expiresMs).toISOString() : null

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

export function can(abilities: Ability[], required: Ability): boolean {

	if (abilities.includes('*')) return true
	if (abilities.includes(required)) return true

	const [resource] = required.split(':')

	return abilities.includes(`${resource}:*`)
}

export const revoke = (plain: string) =>
	db().deleteFrom('tokens').where('id', '=', hash(plain)).execute()

export const revokeAll = (user: number) =>
	db().deleteFrom('tokens').where('user', '=', user).execute()

export const list = (user: number) =>
	db().selectFrom('tokens')
		.select(['id', 'name', 'abilities', 'last', 'expiry', 'created'])
		.where('user', '=', user)
		.execute()

export const prune = () =>
	db().deleteFrom('tokens')
		.where('expiry', '<', new Date().toISOString())
		.execute()
