import { readFile } from 'node:fs/promises'
import { build } from 'ajo-kit/node'
import { expect, test } from 'vitest'

// Stages only: `pnpm build` also seals wherever the engine pair is installed.
test('the production build requires only the environment a host supplies', async () => {
	await build()
	const { env } = JSON.parse(await readFile('.ajo/compiler.json', 'utf8'))
	expect(['NODE_ENV', 'APP_URL', 'APP_SECRET']).toEqual(expect.arrayContaining(env.required))
}, 120_000)
