import { connect, db as database } from '@kit/database'
import type { Generated, Selectable } from '@kit/database'
import { env } from '@kit/platform'

export interface NotesTable {
	id: Generated<number>
	text: string
	created: Generated<string>
}

export interface Database {
	notes: NotesTable
}

export type Note = Selectable<NotesTable>

// One connection factory keeps route code host-neutral: Node supplies the dev
// face, while the sealed graph resolves the same import to runtime:sqlite.
connect(env('DATABASE_PATH') ?? './database.sqlite')

export const db = () => database<Database>()
