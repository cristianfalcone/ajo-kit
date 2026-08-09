import type { Migration, MigrationProvider } from 'kysely/migration'

/** A compiled migration and its persisted qualified identity. */
export interface CompiledMigration {
	name: string
	migration: Migration
}

/** The ordered migrations available to one application artifact. */
export type MigrationRegistry = readonly CompiledMigration[]

/** Adapts a compiled migration registry to Kysely's migration provider. */
export function provider(compiled: MigrationRegistry): MigrationProvider {
	return {
		async getMigrations() {
			return Object.fromEntries(
				compiled.map(({ name, migration }) => [name, migration])
			)
		}
	}
}
