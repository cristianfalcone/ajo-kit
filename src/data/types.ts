import type { Generated } from '@kit/database'
import type { AuthDatabase } from '@kit/auth/types'

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

export type DB = AuthDatabase & {
	chats: ChatsTable
	participants: ParticipantsTable
	messages: MessagesTable
}
