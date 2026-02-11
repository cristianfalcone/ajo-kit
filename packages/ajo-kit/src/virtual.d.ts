declare module 'virtual:ajo/routes' {
	type Loader = () => Promise<Record<string, unknown>>
	export const routes: Record<string, Loader>
}

declare module 'virtual:ajo/handlers' {
	type Loader = () => Promise<Record<string, unknown>>
	export const handlers: Record<string, Loader>
	export const wares: Record<string, Loader>
}
