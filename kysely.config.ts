import { defineConfig } from 'kysely-ctl'
import { db } from './src/data/db'

export default defineConfig({
	kysely: db(),
	migrations: { migrationFolder: 'db/migrations' },
	seeds: { seedFolder: 'db/seeds' },
})
