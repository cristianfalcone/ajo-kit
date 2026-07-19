import type { Kysely } from 'kysely'
import { FileMigrationProvider, Migrator, type Migration } from 'kysely/migration'
import { existsSync, promises as fs } from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { discover } from './discover'

type Migrations = Record<string, Migration>
type Source = { folder: string; id: string }

const extensions = ['.js', '.ts', '.mjs', '.mts', '.cjs', '.cts']
const pattern = /^(\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*$/

const file = (name: string) =>
	!name.includes('.d.') && extensions.some(extension => name.endsWith(extension))

function validate(id: string, names: string[]) {
	for (const [index, name] of names.entries()) {
		const sequence = pattern.exec(name)?.[1]
		const expected = String(index + 1).padStart(4, '0')

		if (sequence !== expected) {
			throw new Error(
				`${id} migrations must be a contiguous sequence starting at 0001; ` +
					`expected ${expected}_*, found ${name}`
			)
		}
	}
}

function local(id: string, files: string[]) {
	const names = files
		.filter(file)
		.map(name => name.slice(0, name.lastIndexOf('.')))
		.sort()

	if (new Set(names).size !== names.length) {
		throw new Error(`${id} has duplicate migration filenames`)
	}

	validate(id, names)
	return names
}

export function migrationFile(files: string[], name: string) {
	const safe = name.trim().toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
	if (!safe) throw new Error('Migration name must contain a letter or number')

	const number = local('project', files).length + 1
	if (number > 9_999) throw new Error('Migration sequence exhausted')

	return `${String(number).padStart(4, '0')}_${safe}.ts`
}

async function load(source: Source): Promise<Migrations> {
	const names = local(source.id, await fs.readdir(source.folder))

	const migrations = await new FileMigrationProvider({
		fs,
		path,
		migrationFolder: source.folder,
		import: file => import(pathToFileURL(file).href),
	}).getMigrations()
	const incomplete = names.filter(name =>
		typeof migrations[name]?.up !== 'function' || typeof migrations[name]?.down !== 'function'
	)
	if (incomplete.length) {
		throw new Error(`${source.id} migrations must export up() and down(): ${incomplete.join(', ')}`)
	}

	return migrations
}

async function merge(sources: Source[]): Promise<Migrations> {
	const merged: Migrations = {}
	const ids = new Set<string>()

	for (const source of sources) {
		if (ids.has(source.id)) throw new Error(`Duplicate migration source "${source.id}"`)
		ids.add(source.id)

		for (const [name, migration] of Object.entries(await load(source))) {
			const qualified = `${source.id}/${name}`
			merged[qualified] = migration
		}
	}

	return merged
}

export function migrator(instance: Kysely<any>, root = process.cwd()): Migrator {
	const sources: Source[] = discover(root)
		.filter(plugin => plugin.migrations)
		.sort((left, right) => left.name.localeCompare(right.name))
		.map(plugin => ({ folder: plugin.migrations!, id: `plugin/${plugin.name}` }))
	const project = path.join(root, 'db/migrations')
	if (existsSync(project)) sources.push({ folder: project, id: 'project' })

	return new Migrator({
		db: instance,
		// Plugins can gain migrations after a project migration has run. Folder-level
		// validation keeps each source strict while Kysely ignores only global interleaving.
		allowUnorderedMigrations: true,
		provider: {
			async getMigrations() {
				return merge(sources)
			}
		}
	})
}

export async function migrationStatus(instance: Kysely<any>, root = process.cwd()) {
	const migrations = await migrator(instance, root).getMigrations()
	const history = await instance
		.selectFrom('sqlite_master')
		.select('name')
		.where('type', '=', 'table')
		.where('name', '=', 'kysely_migration')
		.executeTakeFirst()
	if (!history) return migrations

	const available = new Set(migrations.map(migration => migration.name))
	const executed = await instance.selectFrom('kysely_migration').select('name').execute()
	const missing = executed.map(migration => migration.name).filter(name => !available.has(name)).sort()
	if (missing.length) {
		throw new Error(`Migration history references missing migrations: ${missing.join(', ')}`)
	}

	return migrations
}
