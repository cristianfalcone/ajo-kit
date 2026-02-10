import { Migrator, type Kysely, type MigrationProvider, type Migration } from 'kysely'
import { TSFileMigrationProvider } from 'kysely-ctl'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { discover } from './discover'

class AggregateProvider implements MigrationProvider {

	private sources: { prefix: string, provider: TSFileMigrationProvider }[] = []

	constructor(root: string) {

		// Package migrations (0000_pkgname_*)
		for (const plugin of discover(root)) {
			if (!plugin.migrations || !existsSync(plugin.migrations)) continue
			const prefix = plugin.alias ?? plugin.name.replace('ajo-', '')
			this.sources.push({
				prefix,
				provider: new TSFileMigrationProvider({ migrationFolder: plugin.migrations })
			})
		}

		// App migrations (db/migrations/)
		const appFolder = join(root, 'db/migrations')
		if (existsSync(appFolder)) {
			this.sources.push({
				prefix: '',
				provider: new TSFileMigrationProvider({ migrationFolder: appFolder })
			})
		}
	}

	async getMigrations(): Promise<Record<string, Migration>> {
		const all: Record<string, Migration> = {}

		for (const { provider } of this.sources) {
			const migrations = await provider.getMigrations()
			Object.assign(all, migrations)
		}

		return all
	}
}

export function migrator(instance: Kysely<any>, root = process.cwd()): Migrator {
	return new Migrator({ db: instance, provider: new AggregateProvider(root) })
}
