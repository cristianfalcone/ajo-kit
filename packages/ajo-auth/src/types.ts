import type { Generated, Selectable, Insertable } from 'ajo-kit/database'

/** users table shape. */
export interface Users {
	id: Generated<number>
	name: Generated<string>
	email: string
	password: string | null
	verified: string | null
	created: Generated<string>
	updated: string | null
}

/** sessions table shape. */
export interface Sessions {
	id: string
	user: number
	expiry: string
	ip: string | null
	agent: string | null
	last: string | null
	created: Generated<string>
}

/** roles table shape. */
export interface Roles {
	id: number
	name: string
	abilities: string
}

/** members table shape linking users to roles. */
export interface Members {
	user: number
	role: number
}

/** tokens table shape for bearer API tokens. */
export interface Tokens {
	id: string
	user: number
	name: string
	abilities: string
	last: string | null
	expiry: string | null
	created: Generated<string>
}

/** resets table shape for password reset tokens. */
export interface Resets {
	id: string
	user: number
	expiry: string
	created: Generated<string>
}

// Schema parcial — solo las tablas de auth

/** Database schema fragment owned by ajo-auth. */
export interface Auth {
	users: Users
	sessions: Sessions
	roles: Roles
	members: Members
	tokens: Tokens
	resets: Resets
}

/** Selected auth user row. */
export type User = Selectable<Users>
/** Insertable auth user row. */
export type New = Insertable<Users>
/** Selected auth session row. */
export type Session = Selectable<Sessions>
/** Selected auth token row. */
export type Token = Selectable<Tokens>
/** Built-in role names used by the demo auth schema. */
export type Role = 'admin' | 'user'
