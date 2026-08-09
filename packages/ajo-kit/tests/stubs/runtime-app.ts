const app = {
	argv: [],
	data: undefined,
	env: (name: string) => process.env[name],
	onShutdown: (_callback: () => void) => {},
	root: '/app',
}

export default app
