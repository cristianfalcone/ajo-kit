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
			// Vitest resolves host-conditioned subpaths to their dev-time Node
			// shims; the raw file alias below would otherwise land on the
			// contract module. Production resolves the ajo faces instead.
			{ find: '@kit/database', replacement: resolve(kit, 'database.node.ts') },
			{ find: '@kit/platform', replacement: resolve(kit, 'platform.node.ts') },
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
