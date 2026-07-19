const fallback = 'change-in-production'
const minimum = 32
const samples = new Set([fallback, 'your-secret-key'])

const production = () => process.env.NODE_ENV === 'production'

/** Returns the app signing secret and fails closed in production. */
export const value = () => {
	const secret = process.env.APP_SECRET?.trim() ? process.env.APP_SECRET : undefined

	if (production() && (!secret || secret.length < minimum || samples.has(secret))) {
		const message = 'APP_SECRET must be set to a strong production secret'
		console.error(`[security] ${message}`)
		throw new Error(message)
	}

	return secret ?? fallback
}
