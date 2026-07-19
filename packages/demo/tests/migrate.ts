import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

export function migrate(database: string) {
	const pnpm = process.env.npm_execpath
	if (!pnpm) throw new Error('pnpm executable is unavailable')

	execFileSync(process.execPath, [pnpm, 'kit', 'migrate', 'up', '--database', database], {
		cwd: root,
		env: process.env,
		stdio: 'pipe',
	})
}
