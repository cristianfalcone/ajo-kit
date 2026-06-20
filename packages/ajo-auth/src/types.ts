import type { Generated, Selectable, Insertable } from 'ajo-kit/database'

export interface Users {
	id: Generated<number>
	name: Generated<string>
	email: string
	password: string | null
	verified: string | null
	created: Generated<string>
	updated: string | null
}

export interface Sessions {
	id: string
	user: number
	expiry: string
	ip: string | null
	agent: string | null
	last: string | null
	created: Generated<string>
}

export interface Roles {
	id: number
	name: string
}

export interface Members {
	user: number
	role: number
}

export interface Tokens {
	id: string
	user: number
	name: string
	abilities: string
	last: string | null
	expiry: string | null
	created: Generated<string>
}

export interface Resets {
	id: string
	user: number
	expiry: string
	created: Generated<string>
}

// Schema parcial — solo las tablas de auth

export interface Auth {
	users: Users
	sessions: Sessions
	roles: Roles
	members: Members
	tokens: Tokens
	resets: Resets
}

export type User = Selectable<Users>
export type New = Insertable<Users>
export type Session = Selectable<Sessions>
export type Token = Selectable<Tokens>
export type Role = 'admin' | 'user'
