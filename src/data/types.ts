import type { Generated, Selectable, Insertable } from 'kysely'

export interface UsersTable {
	id: Generated<number>
	name: Generated<string>
	email: string
	password: string | null
	verified: string | null
	created: Generated<string>
	updated: string | null
}

export interface SessionsTable {
	id: string
	user: number
	expiry: string
	ip: string | null
	agent: string | null
	last: string | null
	created: Generated<string>
}

export interface RolesTable {
	id: number
	name: string
}

export interface MembersTable {
	user: number
	role: number
}

export interface TokensTable {
	id: string
	user: number
	name: string
	abilities: string
	last: string | null
	expiry: string | null
	created: Generated<string>
}

export interface ResetsTable {
	id: string
	user: number
	expiry: string
	created: Generated<string>
}

export interface ChatsTable {
	id: Generated<number>
	name: string | null
	created: Generated<string>
}

export interface ParticipantsTable {
	chat: number
	user: number
	joined: Generated<string>
}

export interface MessagesTable {
	id: Generated<number>
	chat: number
	user: number
	text: string
	created: Generated<string>
}

export interface DB {
	users: UsersTable
	sessions: SessionsTable
	roles: RolesTable
	members: MembersTable
	tokens: TokensTable
	resets: ResetsTable
	chats: ChatsTable
	participants: ParticipantsTable
	messages: MessagesTable
}

// Derived Types (Selectable = query results)

export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>

export type Session = Selectable<SessionsTable>
export type Token = Selectable<TokensTable>
export type Role = 'admin' | 'user'
