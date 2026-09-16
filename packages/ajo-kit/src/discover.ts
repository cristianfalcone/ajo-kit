import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Build metadata declared by an installed `ajo-*` package's `kit` field. */
export interface Plugin {
	name: string
	path: string
	alias?: string
	serverOnly?: boolean
	migrations?: string
	commands?: string
	/** Engine descriptor contribution, validated by the build. */
	engine?: unknown
}

/** Discovers explicitly declared Ajo plugins and resolves their build-time resource paths. */
export function discover(root = process.cwd()): Plugin[] {

	const modules = join(root, 'node_modules')
	const plugins: Plugin[] = []

	let declared: string[]
	try {
		const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
		declared = [...new Set([
			...Object.keys(pkg.dependencies ?? {}),
			...Object.keys(pkg.devDependencies ?? {}),
		])]
	} catch { return plugins }

	for (const entry of declared) {

		if (!entry.startsWith('ajo-') || entry === 'ajo-kit') continue

		const dir = join(modules, entry)
		let pkg: any

		try { pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) } catch { continue }

		if (pkg.name !== entry) throw new Error(`Plugin package identity mismatch: expected "${entry}"`)
		if (!pkg.kit) continue

		plugins.push({
			...pkg.kit,
			name: entry,
			path: dir,
			...(pkg.kit.migrations && { migrations: join(dir, pkg.kit.migrations) }),
			...(pkg.kit.commands && { commands: join(dir, pkg.kit.commands) }),
		})
	}

	return plugins
}
