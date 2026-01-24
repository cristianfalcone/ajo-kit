import type { Generated, Selectable, Insertable } from 'kysely'

export interface UsersTable {
	id: Generated<number>
	username: string
	firstName: string
	lastName: string
	email: string
	password: string | null
	verified: Generated<number>
	created: Generated<string>
}

export interface SessionsTable {
	id: string
	userId: number
	expiry: string
	created: Generated<string>
}

export interface RolesTable {
	id: number
	name: string
}

export interface MembersTable {
	userId: number
	roleId: number
}

export interface DB {
	users: UsersTable
	sessions: SessionsTable
	roles: RolesTable
	members: MembersTable
}

// Derived Types (Selectable = query results)

export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>

export type Session = Selectable<SessionsTable>
export type Role = 'admin' | 'user' | 'moderator'
