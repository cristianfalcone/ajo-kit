import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^\/src\/(.+)$/, replacement: `${resolve(root, 'src')}/$1` },
		],
	},
	test: {
		environment: 'node',
		include: ['tests/{unit,integration}/**/*.test.ts'],
		restoreMocks: true,
	},
})
