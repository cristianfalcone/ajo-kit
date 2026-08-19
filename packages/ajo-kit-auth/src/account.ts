import { merge, type Ability } from './ability.client'
import { db } from './store'

/** Parsed ability bundle assigned through one user role. */
export type Grant = {
	name: string
	abilities: Ability[]
}

function parse(value: string): Ability[] {
	try {
		const abilities = JSON.parse(value)

		return Array.isArray(abilities) && abilities.every(ability => typeof ability === 'string')
			? abilities
			: []
	} catch {
		return []
	}
}

/** Loads role ability bundles for an auth user. */
export async function grants(user: number): Promise<Grant[]> {
	const roles = await db()
		.selectFrom('members')
		.innerJoin('roles', 'roles.id', 'members.role')
		.select(['roles.name', 'roles.abilities'])
		.where('members.user', '=', user)
		.orderBy('roles.id')
		.execute()

	return roles.map(role => ({
		name: role.name,
		abilities: parse(role.abilities),
	}))
}

/** Resolves the effective account abilities from all assigned roles. */
export async function abilities(user: number): Promise<Ability[]> {
	return merge(...(await grants(user)).map(role => role.abilities))
}

/**
 * Resolves the abilities a user gains over one subject through team
 * membership: the merged bundles of every role the user holds in teams that
 * claim the subject. Global grants are deliberately not included — the
 * caller composes them, and the guard's admit() does exactly that.
 */
export async function scoped(user: number, subject: string): Promise<Ability[]> {
	const roles = await db()
		.selectFrom('teammates')
		.innerJoin('claims', 'claims.team', 'teammates.team')
		.innerJoin('roles', 'roles.id', 'teammates.role')
		.select(['roles.abilities'])
		.where('teammates.user', '=', user)
		.where('claims.subject', '=', subject)
		.execute()

	return merge(...roles.map(role => parse(role.abilities)))
}
