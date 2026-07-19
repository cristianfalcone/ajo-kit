import { defineConfig as config } from 'vitest/config'

export default config({
	test: {
		environment: 'node',
		include: ['packages/ajo-*/tests/**/*.test.ts', 'packages/template/tests/**/*.test.ts'],
		restoreMocks: true,
	}
})
