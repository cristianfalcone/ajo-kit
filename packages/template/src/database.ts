import { db as database, type Generated, type Selectable } from 'ajo-kit/database'
import type { Auth } from 'ajo-kit-auth'

interface Notes {
	id: Generated<number>
	user: number
	text: string
	created: Generated<string>
}

export interface Database extends Auth {
	notes: Notes
}

export type Note = Pick<Selectable<Notes>, 'id' | 'text' | 'created'>

export const db = () => database<Database>()
