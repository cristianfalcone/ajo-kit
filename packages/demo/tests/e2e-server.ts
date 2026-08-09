import { rmSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { dev, listen } from 'ajo-kit/node'
import { migrate } from './migrate'

const database = resolve('.tmp/e2e.sqlite')

rmSync(database, { force: true })
rmSync(`${database}-shm`, { force: true })
rmSync(`${database}-wal`, { force: true })
mkdirSync(dirname(database), { recursive: true })

process.env.DATABASE_PATH = database
process.env.APP_SECRET = 'ajo-e2e-only-secret-000000000001'
process.env.AJO_E2E_CONTROL ??= process.env.APP_SECRET
process.env.AJO_E2E_BUILD = '1'
process.env.AJO_TIMING = '1'
migrate(database)

await listen(await dev({ hmr: { host: '127.0.0.1', protocol: 'ws' } }), 5180, { strict: true })

await new Promise(() => {})
