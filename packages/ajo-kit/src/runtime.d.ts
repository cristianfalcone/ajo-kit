declare module 'runtime:crypto' {
	export function sha256(data: string | Uint8Array): Uint8Array
}

declare module 'runtime:app' {
	const app: Readonly<{
		env(name: string): string | undefined
	}>

	export default app
}
