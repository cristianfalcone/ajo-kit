import { merge, type Ability } from './ability'
import { db } from './store'
import type { Role } from './types'

/** Parsed ability bundle assigned through one user role. */
export type Grant = {
	name: Role
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
		name: role.name as Role,
		abilities: parse(role.abilities),
	}))
}

/** Resolves the effective account abilities from all assigned roles. */
export async function abilities(user: number): Promise<Ability[]> {
	return merge(...(await grants(user)).map(role => role.abilities))
}
