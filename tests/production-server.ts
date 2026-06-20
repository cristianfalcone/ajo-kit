import { mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { close, connect, db } from '../packages/ajo-kit/src/database'
import { migrator } from '../packages/ajo-kit/src/migrate'
import { listen, start } from '../packages/ajo-kit/src/node'

const database = resolve('.tmp/production.sqlite')

rmSync(database, { force: true })
rmSync(`${database}-shm`, { force: true })
rmSync(`${database}-wal`, { force: true })
mkdirSync(dirname(database), { recursive: true })

process.env.NODE_ENV = 'production'
process.env.APP_URL = 'http://127.0.0.1:5181'
process.env.APP_SECRET = 'test-production-secret-0000000000'
process.env.DATABASE_PATH = database

connect(database)
await migrator(db()).migrateToLatest()
await close()

await listen(await start(), 5181, { strict: true })

await new Promise(() => {})
