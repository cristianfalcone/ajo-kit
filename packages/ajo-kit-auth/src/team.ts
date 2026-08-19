// Teams and tenancy. A team is a named group of users; each teammate holds a
// role from the same roles catalog global members use. A claim records that a
// team holds a subject — an opaque string the consuming app defines (an app
// name, a project id). Authority composes one way: global grants always apply
// everywhere; on top, for one subject, a user gains the abilities of every
// role they hold in every team claiming it. The guard's admit() performs that
// composition.

import { db } from './store'

/** Creates a team and returns its id. A duplicate name surfaces as the unique violation. */
export async function create(name: string): Promise<number> {
	const row = await db()
		.insertInto('teams')
		.values({ name })
		.returning('id')
		.executeTakeFirstOrThrow()

	return Number(row.id)
}

/** Renames a team and stamps updated. */
export async function rename(team: number, name: string): Promise<void> {
	await db()
		.updateTable('teams')
		.set({ name, updated: new Date().toISOString() })
		.where('id', '=', team)
		.execute()
}

/** Deletes a team; its memberships and claims cascade away. */
export async function remove(team: number): Promise<void> {
	await db().deleteFrom('teams').where('id', '=', team).execute()
}

/** One team row, or undefined. */
export async function get(team: number) {
	return db()
		.selectFrom('teams')
		.select(['id', 'name', 'created', 'updated'])
		.where('id', '=', team)
		.executeTakeFirst()
}

/** Every team with its member and claim counts, ordered by name. */
export async function list(): Promise<{ id: number; name: string; created: string; teammates: number; claims: number }[]> {
	const rows = await db()
		.selectFrom('teams')
		.select(eb => [
			'teams.id',
			'teams.name',
			'teams.created',
			eb.selectFrom('teammates')
				.whereRef('teammates.team', '=', 'teams.id')
				.select(inner => inner.fn.countAll().as('count'))
				.as('teammates'),
			eb.selectFrom('claims')
				.whereRef('claims.team', '=', 'teams.id')
				.select(inner => inner.fn.countAll().as('count'))
				.as('claims'),
		])
		.orderBy('teams.name')
		.execute()

	return rows.map(row => ({
		id: Number(row.id),
		name: String(row.name),
		created: String(row.created),
		teammates: Number(row.teammates ?? 0),
		claims: Number(row.claims ?? 0),
	}))
}

/**
 * Adds a user to a team with a role, or changes the role when the membership
 * already exists — one membership per team and user, by primary key.
 */
export async function join(team: number, user: number, role: number): Promise<void> {
	await db()
		.insertInto('teammates')
		.values({ team, user, role })
		.onConflict(conflict => conflict.columns(['team', 'user']).doUpdateSet({ role }))
		.execute()
}

/** Removes a user from a team. */
export async function leave(team: number, user: number): Promise<void> {
	await db()
		.deleteFrom('teammates')
		.where('team', '=', team)
		.where('user', '=', user)
		.execute()
}

/** The team's members with their role names, ordered by user name. */
export async function members(team: number): Promise<{ user: number; name: string; email: string; role: string }[]> {
	const rows = await db()
		.selectFrom('teammates')
		.innerJoin('users', 'users.id', 'teammates.user')
		.innerJoin('roles', 'roles.id', 'teammates.role')
		.select(['users.id', 'users.name', 'users.email', 'roles.name as role'])
		.where('teammates.team', '=', team)
		.orderBy('users.name')
		.execute()

	return rows.map(row => ({
		user: Number(row.id),
		name: String(row.name),
		email: String(row.email),
		role: String(row.role),
	}))
}

/** Records that the team holds a subject; claiming again is a no-op. */
export async function claim(team: number, subject: string): Promise<void> {
	await db()
		.insertInto('claims')
		.values({ team, subject })
		.onConflict(conflict => conflict.columns(['team', 'subject']).doNothing())
		.execute()
}

/** Releases the team's claim on a subject. */
export async function release(team: number, subject: string): Promise<void> {
	await db()
		.deleteFrom('claims')
		.where('team', '=', team)
		.where('subject', '=', subject)
		.execute()
}

/** The subjects a team holds, ordered. */
export async function claims(team: number): Promise<string[]> {
	const rows = await db()
		.selectFrom('claims')
		.select(['subject'])
		.where('team', '=', team)
		.orderBy('subject')
		.execute()

	return rows.map(row => String(row.subject))
}

/** The teams a user belongs to, with the role name held in each. */
export async function of(user: number): Promise<{ team: number; name: string; role: string }[]> {
	const rows = await db()
		.selectFrom('teammates')
		.innerJoin('teams', 'teams.id', 'teammates.team')
		.innerJoin('roles', 'roles.id', 'teammates.role')
		.select(['teams.id', 'teams.name', 'roles.name as role'])
		.where('teammates.user', '=', user)
		.orderBy('teams.name')
		.execute()

	return rows.map(row => ({
		team: Number(row.id),
		name: String(row.name),
		role: String(row.role),
	}))
}

/** The teams claiming a subject. */
export async function holders(subject: string): Promise<{ team: number; name: string }[]> {
	const rows = await db()
		.selectFrom('claims')
		.innerJoin('teams', 'teams.id', 'claims.team')
		.select(['teams.id', 'teams.name'])
		.where('claims.subject', '=', subject)
		.orderBy('teams.name')
		.execute()

	return rows.map(row => ({ team: Number(row.id), name: String(row.name) }))
}

/** Every subject the user reaches through any team membership, distinct and ordered. */
export async function subjects(user: number): Promise<string[]> {
	const rows = await db()
		.selectFrom('teammates')
		.innerJoin('claims', 'claims.team', 'teammates.team')
		.select(['claims.subject'])
		.distinct()
		.where('teammates.user', '=', user)
		.orderBy('claims.subject')
		.execute()

	return rows.map(row => String(row.subject))
}
