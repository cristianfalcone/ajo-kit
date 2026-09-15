import type { Plugin } from 'vite'

const registry = '\0virtual:ajo/e2e-handlers'
const pages = '\0virtual:ajo/e2e-routes'

/** Adds test-only routes and handlers to the generated registries. */
export function fixture(): Plugin {
	return {
		name: 'ajo-e2e-fixture',
		enforce: 'pre',
		resolveId(source) {
			if (source === 'virtual:ajo/handlers') return registry
			if (source === 'virtual:ajo/routes') return pages
		},
		load(id) {
			if (id === pages) return [
				"const normal = import.meta.glob('/src/**/{layout,page}.{j,t}s{,x}')",
				"const fixture = import.meta.glob('/tests/e2e/fixture-navigation.tsx')",
				"export const routes = { ...normal, '/src/__e2e/navigation/[page]/page.tsx': fixture['/tests/e2e/fixture-navigation.tsx'] }",
			].join('\n')
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
