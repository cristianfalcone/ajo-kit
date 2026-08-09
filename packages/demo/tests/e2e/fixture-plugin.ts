import type { Plugin } from 'vite'

const registry = '\0virtual:ajo/e2e-handlers'

/** Replaces the generated handler registry with an E2E-fixture-aware registry. */
export function fixture(): Plugin {
	return {
		name: 'ajo-e2e-fixture',
		enforce: 'pre',
		resolveId(source) {
			if (source === 'virtual:ajo/handlers') return registry
		},
		load(id) {
			if (id !== registry) return
			return [
				"const normal = import.meta.glob('/src/**/handler.{j,t}s{,x}')",
				"const fixture = import.meta.glob('/tests/e2e/fixture-server.ts')",
				"export const handlers = { ...normal, '/src/__e2e/handler.ts': fixture['/tests/e2e/fixture-server.ts'] }",
				"export const wares = import.meta.glob('/src/**/wares.{j,t}s{,x}')",
			].join('\n')
		},
	}
}
