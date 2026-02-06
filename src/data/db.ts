import { Kysely, SqliteDialect, sql } from 'kysely'
import type { KyselyPlugin, PluginTransformQueryArgs, PluginTransformResultArgs, RootOperationNode, QueryResult, UnknownRow } from 'kysely'
import Database from 'better-sqlite3'
import type { DB } from './types'

export const database = new Database('./database.sqlite')

database.pragma('journal_mode = WAL')

// Table version counters (increment on each write)

const versions = new Map<string, number>()

let hook: ((table: string) => void) | null = null

export const version = (table: string) => versions.get(table) ?? 0
export const snapshot = (tables: string[]) => Object.fromEntries(tables.map(t => [t, version(t)]))
export const tap = (fn: (table: string) => void) => { hook = fn }

export const bump = (table: string) => {
	versions.set(table, version(table) + 1)
	hook?.(table)
}



// Kysely plugin to auto-bump versions on writes

class TrackerPlugin implements KyselyPlugin {

	transformQuery(args: PluginTransformQueryArgs): RootOperationNode {

		const { node } = args

		if (node.kind === 'InsertQueryNode' ||
			node.kind === 'UpdateQueryNode' ||
			node.kind === 'DeleteQueryNode') {
			const table = this.extract(node)
			if (table) bump(table)
		}

		return node
	}

	private extract(node: RootOperationNode): string | null {
		const { from, into, table } = node as Record<string, any>
		return into?.table?.identifier?.name ?? table?.table?.identifier?.name ?? from?.froms?.[0]?.table?.identifier?.name ?? null
	}

	transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
		return Promise.resolve(args.result)
	}
}

let instance: Kysely<DB> | null = null

export function db(): Kysely<DB> {
	return instance ??= new Kysely<DB>({
		dialect: new SqliteDialect({ database }),
		plugins: [new TrackerPlugin()]
	})
}

export const unread = (userId: number) => db()
	.selectFrom('messages')
	.innerJoin('participants', 'participants.chat', 'messages.chat')
	.where('participants.user', '=', userId)
	.where('messages.user', '!=', userId)
	.where((eb) => eb.or([
		eb('participants.seen', 'is', null),
		eb(sql`datetime(messages.created)`, '>', sql`datetime(participants.seen)`)
	]))
	.select(db().fn.countAll().as('count'))
	.executeTakeFirst()
	.then(row => Number(row?.count ?? 0))

export async function close(): Promise<void> {
	if (instance) {
		await instance.destroy()
		instance = null
	}
}
