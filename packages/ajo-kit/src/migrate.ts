import type { Kysely } from 'kysely'
import { Migrator, type Migration } from 'kysely/migration'
import { TSFileMigrationProvider } from 'kysely-ctl'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { discover } from './discover'

type Migrations = Record<string, Migration>

async function merge(folders: string[]): Promise<Migrations> {
	const sources = await Promise.all(folders.map(async folder => ({
		folder,
		migrations: await new TSFileMigrationProvider({ migrationFolder: folder }).getMigrations()
	})))
	const merged: Migrations = {}
	const owners = new Map<string, string>()

	for (const source of sources) {
		for (const [name, migration] of Object.entries(source.migrations)) {
			const owner = owners.get(name)

			if (owner) {
				throw new Error(`Duplicate migration "${name}" in ${owner} and ${source.folder}`)
			}

			owners.set(name, source.folder)
			merged[name] = migration
		}
	}

	return merged
}

export function migrator(instance: Kysely<any>, root = process.cwd()): Migrator {

	const folders = [
		...discover(root).filter(p => p.migrations).map(p => p.migrations!),
		join(root, 'db/migrations'),
	].filter(existsSync)

	return new Migrator({
		db: instance,
		provider: {
			async getMigrations() {
				return merge(folders)
			}
		}
	})
}
