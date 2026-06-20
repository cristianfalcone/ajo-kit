import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface Plugin {
	name: string
	path: string
	alias?: string
	serverOnly?: boolean
	migrations?: string
	commands?: string
}

export function discover(root = process.cwd()): Plugin[] {

	const modules = join(root, 'node_modules')
	const plugins: Plugin[] = []

	let entries: string[]
	try { entries = readdirSync(modules) } catch { return plugins }

	for (const entry of entries) {

		if (!entry.startsWith('ajo-') || entry === 'ajo-kit') continue

		const dir = join(modules, entry)
		let pkg: any

		try { pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) } catch { continue }

		if (!pkg.kit) continue

		plugins.push({
			name: pkg.name,
			path: dir,
			...pkg.kit,
			...(pkg.kit.migrations && { migrations: join(dir, pkg.kit.migrations) }),
			...(pkg.kit.commands && { commands: join(dir, pkg.kit.commands) }),
		})
	}

	return plugins
}
