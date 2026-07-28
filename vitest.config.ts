import { fileURLToPath } from 'node:url'
import { defineConfig as config } from 'vitest/config'

export default config({
	// The virtual modules are provided by the kit's vite plugin inside real
	// apps. Tests that import src/app or src/server directly need the ids to
	// resolve; these stubs are the empty default, and a test that wants real
	// routes or handlers overrides them with a hoisted vi.mock factory.
	resolve: {
		alias: {
			'virtual:ajo/routes': fileURLToPath(new URL('./packages/ajo-kit/tests/stubs/virtual-routes.ts', import.meta.url)),
			'virtual:ajo/handlers': fileURLToPath(new URL('./packages/ajo-kit/tests/stubs/virtual-handlers.ts', import.meta.url)),
		},
	},
	test: {
		environment: 'node',
		include: ['packages/ajo-*/tests/**/*.test.ts', 'packages/template/tests/**/*.test.ts'],
		restoreMocks: true,
	}
})
