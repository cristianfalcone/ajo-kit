import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const template = fileURLToPath(new URL('../', import.meta.url))
const read = (file: string) => readFileSync(`${template}${file}`, 'utf8')
const execute = promisify(execFile)

test('the application template depends only on the public UI package', () => {
	const metadata = JSON.parse(read('package.json')) as {
		dependencies: Record<string, string>
	}

	expect(metadata.dependencies['ajo-kit']).toBe('workspace:*')
	expect(metadata.dependencies['ajo-ui-playa']).toBe('workspace:*')
	expect(metadata.dependencies).not.toHaveProperty('ajo-ui')
})

test('the application template builds through its public package setup', async () => {
	const cli = process.env.npm_execpath
	expect(cli).toBeTruthy()
	await execute(process.execPath, [cli!, '--dir', template, 'build'], {
		cwd: template,
		env: { ...process.env, CI: '1', NO_COLOR: '1' },
		maxBuffer: 4 * 1024 * 1024,
	})
}, 30_000)
