import { db } from './db'
import type { Session, Role, User, NewUser } from './types'

// Users

export const users = {

	all: () =>
		db().selectFrom('users').selectAll().execute(),

	find: (id: number) =>
		db().selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst(),

	byEmail: (email: string) =>
		db().selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst(),

	byIds: async (ids: number[]): Promise<Map<number, User>> => {
		if (!ids.length) return new Map()
		const rows = await db().selectFrom('users').selectAll().where('id', 'in', ids).execute()
		return new Map(rows.map(u => [u.id, u]))
	},

	create: (data: NewUser) =>
		db().insertInto('users').values(data).returning('id').executeTakeFirstOrThrow(),
}

// Sessions

export const sessions = {

	create: (data: { id: string; userId: number; expiry: string }) =>
		db().insertInto('sessions').values(data).execute(),

	find: (id: string): Promise<Session | undefined> =>
		db().selectFrom('sessions').selectAll().where('id', '=', id).executeTakeFirst(),

	remove: (id: string) =>
		db().deleteFrom('sessions').where('id', '=', id).execute(),

	forUser: (userId: number) =>
		db().selectFrom('sessions').selectAll().where('userId', '=', userId).execute(),
}

export const roles = {

	forUser: async (userId: number): Promise<Role[]> => {
		const rows = await db()
			.selectFrom('members')
			.innerJoin('roles', 'roles.id', 'members.roleId')
			.select('roles.name')
			.where('members.userId', '=', userId)
			.execute()
		return rows.map(r => r.name as Role)
	},

	assign: (userId: number, roleId: number) =>
		db().insertInto('members').values({ userId, roleId }).execute(),

	find: (name: string) =>
		db().selectFrom('roles').selectAll().where('name', '=', name).executeTakeFirst(),
}
