declare module 'runtime:crypto' {
	export function sha256(data: string | Uint8Array): Uint8Array
}

declare module 'runtime:app' {
	const app: Readonly<{
		data: string | undefined
		env(name: string): string | undefined
	}>

	export default app
}

declare module 'runtime:sqlite' {
	type Value = null | number | bigint | string | Uint8Array
	type Parameters = ReadonlyArray<unknown> | Readonly<Record<string, unknown>>

	interface Result {
		changes: number
		lastInsertRowid: number | bigint
	}

	interface Statement {
		readonly reader: boolean
		all(parameters?: Parameters): Array<Record<string, Value>>
		get(parameters?: Parameters): Record<string, Value> | undefined
		iterate(parameters?: Parameters): IterableIterator<Record<string, Value>>
		run(parameters?: Parameters): Result
		finalize(): void
	}

	interface Database {
		close(): void
		exec(sql: string): void
		prepare(sql: string): Statement
	}

	interface Options {
		create?: boolean
		readonly?: boolean
	}

	export default function open(path: string, options?: Options): Database
}
