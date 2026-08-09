import type { Kysely } from 'kysely'
import { FileMigrationProvider } from 'kysely/migration'
import { existsSync, promises as fs } from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { discover } from './discover'
import { migrator, type CompiledMigration, type MigrationRegistry } from './migrations'

type Source = { folder: string; id: string }

/** A build-time migration module and its compiled registry value. */
export interface MigrationModule extends CompiledMigration {
	file: string
}

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

async function load(source: Source): Promise<MigrationModule[]> {
	const files = (await fs.readdir(source.folder)).filter(file)
	const names = local(source.id, files)
	const paths = new Map(files.map(file => [file.slice(0, file.lastIndexOf('.')), path.join(source.folder, file)]))

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

	return names.map(name => ({
		name: `${source.id}/${name}`,
		file: paths.get(name)!,
		migration: migrations[name],
	}))
}

async function compile(sources: Source[]): Promise<MigrationModule[]> {
	const compiled: MigrationModule[] = []
	const ids = new Set<string>()

	for (const source of sources) {
		if (ids.has(source.id)) throw new Error(`Duplicate migration source "${source.id}"`)
		ids.add(source.id)

		compiled.push(...await load(source))
	}

	return compiled.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
}

/** Discovers and validates migration source modules for an application build. */
export async function migrationModules(root = process.cwd()): Promise<readonly MigrationModule[]> {
	const sources: Source[] = discover(root)
		.filter(plugin => plugin.migrations)
		.sort((left, right) => left.name.localeCompare(right.name))
		.map(plugin => ({ folder: plugin.migrations!, id: `plugin/${plugin.name}` }))
	const project = path.join(root, 'db/migrations')
	if (existsSync(project)) sources.push({ folder: project, id: 'project' })
	return compile(sources)
}

/** Builds and validates the compiled migration registry for a Node application. */
export async function registry(root = process.cwd()): Promise<MigrationRegistry> {
	return (await migrationModules(root)).map(({ name, migration }) => ({ name, migration }))
}

export { migrator } from './migrations'

/** Lists migration state after rejecting history absent from the compiled registry. */
export async function migrationStatus(instance: Kysely<any>, compiled: MigrationRegistry) {
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
