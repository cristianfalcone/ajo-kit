const absolute = (path: string) =>
	path.startsWith('/') || path.startsWith('\\') || /^[a-z]:[\\/]/i.test(path)

/** Resolves an engine SQLite path within the configured application data root. */
export function resolveDatabasePath(path: string, data: string | undefined): string {
	if (path === ':memory:') return path
	if (absolute(path)) throw new TypeError('SQLite file path must be relative to the runtime app data root')

	const segments = path.split('/')
	if (segments.includes('..')) throw new TypeError('SQLite file path must not contain ".." segments')

	const relative = segments.filter(segment => segment && segment !== '.').join('/')
	if (!relative || relative.includes('\0')) {
		throw new TypeError('SQLite file path must name a file beneath the runtime app data root')
	}
	if (!data) throw new TypeError('File-backed SQLite requires a runtime app data root')

	return `${data.replace(/\/+$/, '')}/${relative}`
}
