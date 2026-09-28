import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['tests/*.test.ts'],
		fileParallelism: false,
		// Inlined so vi.resetModules also resets the mail configuration between tests.
		server: { deps: { inline: ['ajo-kit-mail'] } },
	},
})
