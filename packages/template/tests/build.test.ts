import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, test } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))

test('the production build requires only the environment a host supplies', async () => {
	await promisify(execFile)(join(root, 'node_modules/.bin/kit'), ['build'], { cwd: root, timeout: 120_000 })
	const { env } = JSON.parse(await readFile(join(root, '.ajo/compiler.json'), 'utf8'))
	expect(['NODE_ENV', 'APP_URL', 'APP_SECRET']).toEqual(expect.arrayContaining(env.required))
}, 120_000)
