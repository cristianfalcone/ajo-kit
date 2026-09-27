import type { Kysely } from 'kysely'
import { Migrator, type Migration } from 'kysely/migration'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { discover } from './discover'

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

const stem = (name: string) => name.slice(0, name.lastIndexOf('.'))

function local(id: string, files: string[]) {
	const names = files.filter(file).map(stem).sort()

	if (new Set(names).size !== names.length) {
		throw new Error(`${id} has duplicate migration filenames`)
	}

	validate(id, names)
	return names
}

/** Chooses the next contiguous project migration name after validating existing files. */
export function migrationFile(files: string[], name: string) {
	const safe = name.trim().toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
	if (!safe) throw new Error('Migration name must contain a letter or number')

	const number = local('project', files).length + 1
	if (number > 9_999) throw new Error('Migration sequence exhausted')

	return `${String(number).padStart(4, '0')}_${safe}.ts`
}

async function load({ folder, id }: Source) {
	// Validated names are unique and contiguous, so file order is sequence order.
	const files = (await readdir(folder)).filter(file).sort()
	local(id, files)

	const modules = await Promise.all(files.map(async entry => {
		const path = join(folder, entry)
		const migration: Migration = await import(pathToFileURL(path).href)
		return { name: `${id}/${stem(entry)}`, file: path, migration }
	}))
	const incomplete = modules.filter(({ migration }) => typeof migration.up !== 'function' || typeof migration.down !== 'function')
	if (incomplete.length) {
		throw new Error(`${id} migrations must export up() and down(): ${incomplete.map(({ name }) => name.slice(id.length + 1)).join(', ')}`)
	}

	return modules
}

/** Discovers, validates and imports the plugin and project migrations of an application. */
export async function migrationModules(root = process.cwd()) {
	const sources: Source[] = discover(root)
		.filter(plugin => plugin.migrations)
		.map(plugin => ({ folder: plugin.migrations!, id: `plugin/${plugin.name}` }))
	const project = join(root, 'db/migrations')
	if (existsSync(project)) sources.push({ folder: project, id: 'project' })

	const modules = []
	for (const source of sources) modules.push(...await load(source))
	return modules.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
}

/** Lists migration state after rejecting history absent from the compiled registry. */
export async function migrationStatus(instance: Kysely<any>, compiled: Migrations) {
	const migrations = await migrator(instance, compiled).getMigrations()
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
