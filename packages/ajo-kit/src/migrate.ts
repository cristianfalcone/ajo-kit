import type { Kysely } from 'kysely'
import { Migrator } from 'kysely/migration'
import { TSFileMigrationProvider as Provider } from 'kysely-ctl'
import { existsSync as exists } from 'node:fs'
import { join } from 'node:path'
import { discover } from './discover'

export function migrator(instance: Kysely<any>, root = process.cwd()): Migrator {

	const folders = [
		...discover(root).filter(p => p.migrations).map(p => p.migrations!),
		join(root, 'db/migrations'),
	].filter(exists)

	return new Migrator({
		db: instance,
		provider: {
			async getMigrations() {
				const all = await Promise.all(
					folders.map(f => new Provider({ migrationFolder: f }).getMigrations())
				)
				return Object.assign({}, ...all)
			}
		}
	})
}
