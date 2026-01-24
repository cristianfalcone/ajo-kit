import 'dotenv/config'
import sade from 'sade'
import { sql } from 'kysely'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { db, close, database } from './db'
import { sync } from './sync'
import { drive } from './drive'
import type { NewUser } from './types'

const { DRIVE_CREDENTIALS = './drive.json', DRIVE_FOLDER = '' } = process.env

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to fetch ${url}`)
	return res.json()
}

export async function migrate(): Promise<void> {

	const k = db()

	await k.schema
		.createTable('users')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('username', 'text', c => c.notNull().unique())
		.addColumn('firstName', 'text', c => c.notNull())
		.addColumn('lastName', 'text', c => c.notNull())
		.addColumn('email', 'text', c => c.notNull().unique())
		.addColumn('password', 'text')
		.addColumn('verified', 'integer', c => c.defaultTo(0))
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await k.schema
		.createTable('sessions')
		.ifNotExists()
		.addColumn('id', 'text', c => c.primaryKey())
		.addColumn('userId', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('expiry', 'text', c => c.notNull())
		.addColumn('created', 'text', c => c.defaultTo(sql`CURRENT_TIMESTAMP`))
		.execute()

	await k.schema
		.createTable('roles')
		.ifNotExists()
		.addColumn('id', 'integer', c => c.primaryKey())
		.addColumn('name', 'text', c => c.notNull().unique())
		.execute()

	await k.schema
		.createTable('members')
		.ifNotExists()
		.addColumn('userId', 'integer', c => c.notNull().references('users.id').onDelete('cascade'))
		.addColumn('roleId', 'integer', c => c.notNull().references('roles.id').onDelete('cascade'))
		.execute()
}

export async function rollback(): Promise<void> {
	const k = db()
	await k.schema.dropTable('members').ifExists().execute()
	await k.schema.dropTable('sessions').ifExists().execute()
	await k.schema.dropTable('roles').ifExists().execute()
	await k.schema.dropTable('users').ifExists().execute()
}

export async function seed(): Promise<void> {

	console.log('Seeding database...')

	// Fresh start
	await rollback()
	await migrate()

	const k = db()

	// Fetch users from DummyJSON
	const usersData = await fetchJson<{ users: any[] }>('https://dummyjson.com/users?limit=20')

	// Insert users
	const users: NewUser[] = usersData.users.map(u => ({
		id: u.id,
		username: u.username,
		firstName: u.firstName,
		lastName: u.lastName,
		email: u.email,
	}))

	await k.insertInto('users').values(users).execute()

	console.log(`  ${users.length} users`)

	// Insert default roles
	const roles = [
		{ id: 1, name: 'admin' },
		{ id: 2, name: 'user' },
		{ id: 3, name: 'moderator' },
	]

	await k.insertInto('roles').values(roles).execute()

	console.log(`  ${roles.length} roles`)
	console.log('Done!')
}

const run = (fn: () => Promise<void>) => fn().then(close).catch(error => {
	console.error(error)
	process.exit(1)
})

sade('db')
	.command('seed')
	.describe('Seed database with sample data from DummyJSON')
	.action(() => run(seed))
	.command('migrate')
	.describe('Run database migrations')
	.action(() => run(async () => {
		await migrate()
		console.log('Migrations complete')
	}))
	.command('rollback')
	.describe('Drop all tables')
	.action(() => run(async () => {
		await rollback()
		console.log('Rollback complete')
	}))
	.command('auth')
	.describe('Authorize Google Drive access (OAuth)')
	.option('-c, --credentials', 'Path to credentials JSON', DRIVE_CREDENTIALS)
	.option('-p, --port', 'Local callback port', 3000)
	.action(async (opts: { credentials: string; port: number }) => {

		if (!existsSync(opts.credentials)) {
			console.error(`Create ${opts.credentials} with client_id and client_secret first`)
			console.error('Get these from: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs')
			process.exit(1)
		}

		const creds = JSON.parse(readFileSync(opts.credentials, 'utf8'))

		if (!creds.client_id || !creds.client_secret) {
			console.error(`${opts.credentials} must have client_id and client_secret`)
			process.exit(1)
		}

		const redirect = `http://localhost:${opts.port}`
		const scope = 'https://www.googleapis.com/auth/drive'
		const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${creds.client_id}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`

		console.log(`
Prerequisites (if not done):
  1. Google Cloud Console → APIs & Services → Library → Enable "Google Drive API"
  2. APIs & Services → OAuth consent screen → Add yourself as test user
  3. APIs & Services → Credentials → Create OAuth client ID (Desktop app)
  4. Save client_id and client_secret to ${opts.credentials}

Authorization:
  1. Open this URL in your browser:

${url}

  2. Log in and authorize access
  3. You'll be redirected to localhost:${opts.port} (keep this terminal running)
`)

		const server = createServer(async (req, res) => {
			const params = new URL(req.url!, `http://localhost:${opts.port}`).searchParams
			const code = params.get('code')

			if (!code) {
				res.writeHead(400)
				res.end('Missing code parameter')
				return
			}

			try {
				const response = await fetch('https://oauth2.googleapis.com/token', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						client_id: creds.client_id,
						client_secret: creds.client_secret,
						code,
						grant_type: 'authorization_code',
						redirect_uri: redirect,
					}),
				})

				if (!response.ok) {
					const error = await response.text()
					throw new Error(error)
				}

				const tokens = await response.json() as { refresh_token: string }

				creds.refresh_token = tokens.refresh_token
				writeFileSync(opts.credentials, JSON.stringify(creds, null, '\t'))

				res.writeHead(200, { 'Content-Type': 'text/html' })
				res.end('<h1>Success!</h1><p>You can close this window.</p>')

				console.log(`
Saved refresh_token to ${opts.credentials}

Next steps:
  1. Create a folder in Google Drive for backups
  2. Get FOLDER_ID from the URL: drive.google.com/drive/folders/FOLDER_ID
  3. Run: pnpm db sync -f FOLDER_ID --watch
`)
				server.close()
				process.exit(0)

			} catch (error) {
				res.writeHead(500)
				res.end(`Error: ${error}`)
				console.error(error)
			}
		})

		server.listen(opts.port, () => {
			console.log(`Waiting for callback on port ${opts.port}...`)
		})
	})
	.command('sync')
	.describe('Sync database to Google Drive (WAL-based)')
	.option('-c, --credentials', 'Path to OAuth credentials JSON', DRIVE_CREDENTIALS)
	.option('-f, --folder', 'Google Drive folder ID', DRIVE_FOLDER)
	.option('-s, --snapshot', 'Snapshot file name', 'snapshot.db')
	.option('-n, --name', 'WAL file name', 'changes.wal')
	.option('-w, --watch', 'Watch for changes continuously')
	.option('-r, --rotate', 'Rotation interval in hours', 6)
	.option('-d, --debounce', 'Debounce delay in ms', 1000)
	.action((opts: { credentials: string; folder: string; snapshot: string; name: string; watch: boolean; rotate: number; debounce: number }) => {

		if (!opts.folder) {
			console.error('Missing --folder option')
			process.exit(1)
		}

		const client = drive({ credentials: opts.credentials, folder: opts.folder })

		const syncer = sync({
			database,
			snapshot: (path: string) => client.upload(path, opts.snapshot),
			changes: (path: string) => client.upload(path, opts.name),
			clear: () => client.remove(opts.name),
			rotate: opts.rotate * 60 * 60 * 1000,
			debounce: opts.debounce,
		})

		if (opts.watch) {
			console.log(`Syncing to Drive: ${opts.snapshot} + ${opts.name}`)
			const { stop } = syncer.start()

			const shutdown = async () => {
				console.log('\n[sync] shutting down...')
				await stop()
				await close()
				process.exit(0)
			}

			process.on('SIGINT', shutdown)
			process.on('SIGTERM', shutdown)
		} else {
			run(syncer.once)
		}
	})
	.command('pull')
	.describe('Download database from Google Drive')
	.option('-c, --credentials', 'Path to OAuth credentials JSON', DRIVE_CREDENTIALS)
	.option('-f, --folder', 'Google Drive folder ID', DRIVE_FOLDER)
	.option('-s, --snapshot', 'Snapshot file name', 'snapshot.db')
	.option('-n, --name', 'WAL file name', 'changes.wal')
	.option('-o, --output', 'Output database path', './database.sqlite')
	.action(async (opts: { credentials: string; folder: string; snapshot: string; name: string; output: string }) => {

		if (!opts.folder) {
			console.error('Missing --folder option')
			process.exit(1)
		}

		const client = drive({ credentials: opts.credentials, folder: opts.folder })

		console.log('Downloading snapshot...')
		const hasSnapshot = await client.download(opts.snapshot, opts.output)

		if (!hasSnapshot) {
			console.error('Snapshot not found in Drive')
			process.exit(1)
		}

		console.log('Downloading WAL...')
		const walPath = `${opts.output}-wal`
		const hasWal = await client.download(opts.name, walPath)

		if (hasWal) {
			console.log(`Downloaded: ${opts.output} + ${walPath}`)
		} else {
			console.log(`Downloaded: ${opts.output} (no WAL)`)
		}
	})
	.parse(process.argv)
