import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig as config } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))
const kit = resolve(root, 'packages/ajo-kit/src')

export default config({
	resolve: {
		alias: [
			{ find: /^\/src\/(.+)$/, replacement: `${resolve(root, 'src')}/$1` },
			{ find: '@kit/auth', replacement: resolve(root, 'packages/ajo-auth/src/index.ts') },
			{ find: /^@kit\/(.+)$/, replacement: `${kit}/$1` },
			{ find: '@kit', replacement: resolve(kit, 'index.ts') },
		],
	},
	test: {
		environment: 'node',
		include: ['tests/unit/**/*.test.ts'],
		restoreMocks: true,
	}
})
