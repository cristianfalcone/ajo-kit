import type { Kysely } from 'kysely'
import { Migrator, type Migration } from 'kysely/migration'

/** Ordered migrations under their persisted qualified names. */
export type Migrations = readonly { name: string; migration: Migration }[]

/** Creates a Kysely runner for compiled migrations. */
export function migrator(instance: Kysely<any>, migrations: Migrations): Migrator {
	return new Migrator({
		db: instance,
		// Sources keep strict local sequences while Kysely permits a plugin to add
		// its next migration after a project migration has already executed.
		allowUnorderedMigrations: true,
		provider: {
			getMigrations: async () => Object.fromEntries(migrations.map(({ name, migration }) => [name, migration])),
		},
	})
}
