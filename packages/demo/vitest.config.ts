import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))
const kit = resolve(root, 'node_modules/ajo-kit/src')
const auth = resolve(root, 'node_modules/ajo-kit-auth/src')

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^\/src\/(.+)$/, replacement: `${resolve(root, 'src')}/$1` },
			{ find: '@kit/auth/ability', replacement: resolve(auth, 'ability.client.ts') },
			{ find: '@kit/auth', replacement: resolve(auth, 'index.ts') },
			{ find: /^@kit\/(.+)$/, replacement: `${kit}/$1` },
			{ find: '@kit', replacement: resolve(kit, 'index.ts') },
		],
	},
	test: {
		environment: 'node',
		include: ['tests/{unit,integration}/**/*.test.ts'],
		restoreMocks: true,
	},
})
