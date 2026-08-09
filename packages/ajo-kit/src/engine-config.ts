/** Environment values consumed by the ajo engine launcher. */
export interface EngineEnvironment {
	database: string
	host: string
	port: number
}

type Read = (name: string) => string | undefined

const required = (read: Read, name: string) => {
	const value = read(name)
	if (!value?.trim()) throw new Error(`${name} is required by the ajo engine`)
	return value
}

/** Validates launcher environment without performing startup side effects. */
export function environment(read: Read, auth: boolean): EngineEnvironment {
	if (read('NODE_ENV') !== 'production') {
		throw new Error('NODE_ENV must be "production" for the ajo engine')
	}

	const origin = required(read, 'APP_URL')
	let url: URL
	if (origin !== origin.trim()) throw new Error('APP_URL must be a valid absolute HTTP(S) URL')
	try { url = new URL(origin) }
	catch { throw new Error('APP_URL must be a valid absolute HTTP(S) URL') }
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('APP_URL must be a valid absolute HTTP(S) URL')
	}

	if (auth) required(read, 'APP_SECRET')

	const configuredHost = read('HOST')
	const host = configuredHost ?? '0.0.0.0'
	if (!host || host !== host.trim() || !/^(?:[A-Za-z0-9.-]+|[0-9A-Fa-f:]+)$/.test(host)) {
		throw new Error('HOST must be a hostname or numeric IP address')
	}

	const configuredPort = read('PORT')
	let port = 8080
	if (configuredPort !== undefined) {
		if (!/^\d+$/.test(configuredPort)) throw new Error('PORT must be an integer from 1 to 65535')
		port = Number(configuredPort)
		if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
			throw new Error('PORT must be an integer from 1 to 65535')
		}
	}

	return {
		database: read('DATABASE_PATH') ?? './database.sqlite',
		host,
		port,
	}
}
