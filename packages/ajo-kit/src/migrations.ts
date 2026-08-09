import type { Kysely } from 'kysely'
import { Migrator, type Migration, type MigrationProvider } from 'kysely/migration'

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

/** Creates a Kysely runner for an already compiled migration registry. */
export function migrator(instance: Kysely<any>, compiled: MigrationRegistry): Migrator {
	return new Migrator({
		db: instance,
		// Sources keep strict local sequences while Kysely permits a plugin to add
		// its next migration after a project migration has already executed.
		allowUnorderedMigrations: true,
		provider: provider(compiled),
	})
}
