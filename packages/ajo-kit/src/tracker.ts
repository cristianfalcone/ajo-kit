import type { KyselyPlugin, PluginTransformQueryArgs, PluginTransformResultArgs, RootOperationNode, QueryResult, UnknownRow } from 'kysely'

// Table version counters (increment on each write)

const versions = new Map<string, number>()

let hook: ((table: string) => void) | null = null

export const version = (table: string) => versions.get(table) ?? 0
export const snapshot = (tables: string[]) => Object.fromEntries(tables.map(t => [t, version(t)]))
export const tap = (fn: (table: string) => void) => { hook = fn }

let muted = 0

export function hush<T>(fn: () => T): T {
	muted++
	try { return fn() }
	finally { muted-- }
}

export const bump = (table: string) => {
	versions.set(table, version(table) + 1)
	if (muted) return
	hook?.(table)
}

// Kysely plugin to auto-bump versions on writes

export class TrackerPlugin implements KyselyPlugin {

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
