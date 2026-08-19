import type { Auth } from '@kit/auth'
import type { Generated } from '@kit/database'

export type Signup = 'open' | 'invite'

export interface RegistrationTable {
	id: number
	signup: Generated<Signup>
	updated: string | null
	updater: number | null
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
	seen: string | null
}

export interface MessagesTable {
	id: Generated<number>
	chat: number
	user: number
	text: string
	created: Generated<string>
}

export type DB = Auth & {
	registration: RegistrationTable
	chats: ChatsTable
	participants: ParticipantsTable
	messages: MessagesTable
}
