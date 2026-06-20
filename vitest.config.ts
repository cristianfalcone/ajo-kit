import { defineConfig as config } from 'vitest/config'

export default config({
	test: {
		environment: 'node',
		include: ['tests/unit/**/*.test.ts'],
		restoreMocks: true,
	}
})
