// The public packages: every workspace manifest that is not private.
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

export const packages = readdirSync(join(root, 'packages')).flatMap(entry => {
	const directory = join(root, 'packages', entry)
	const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as {
		name: string
		private?: boolean
		version: string
	}
	return manifest.private ? [] : [{ directory, name: manifest.name, version: manifest.version }]
})
