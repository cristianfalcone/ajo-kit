import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { loadEnvFile } from 'node:process'
import { writeFileSync } from 'node:fs'

// Prepares a new project for local development, once, from its directory:
// a private .env with a random APP_SECRET, then the auth and project migrations.

try {
	writeFileSync('.env', [
		'APP_URL=http://localhost:5173',
		`APP_SECRET=${randomBytes(32).toString('hex')}`,
		'DATABASE_PATH=./database.sqlite',
		'MAIL_FROM=notes@example.test',
		'',
	].join('\n'), { flag: 'wx', mode: 0o600 })
	console.log('Created private .env for local development.')
} catch (error) {
	if (error.code !== 'EEXIST') throw error
	console.log('Keeping existing .env.')
}

loadEnvFile('.env')
const migration = spawnSync('pnpm', ['exec', 'kit', 'migrate', 'up', '--database', process.env.DATABASE_PATH ?? './database.sqlite'], { stdio: 'inherit' })
if (migration.error) throw migration.error
process.exitCode = migration.status ?? 1
