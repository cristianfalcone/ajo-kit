import { connect, db as database, type Generated, type Selectable } from 'ajo-kit/database'
import { env } from 'ajo-kit/platform'
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

connect(env('DATABASE_PATH') ?? './database.sqlite')

export const db = () => database<Database>()
