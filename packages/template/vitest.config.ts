import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		alias: [{ find: /^@kit(\/|$)/, replacement: 'ajo-kit$1' }],
	},
	ssr: { noExternal: [/^ajo-/] },
})
