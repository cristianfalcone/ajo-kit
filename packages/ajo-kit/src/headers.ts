import { env } from 'ajo-kit/platform'
import type { Value } from './http'

type Target = {
	setHeader(key: string, value: Value): unknown
	hasHeader(key: string): boolean
}

const https = () => {
	if (env('NODE_ENV') !== 'production') return false

	const origin = env('APP_URL')
	if (!origin) return false

	try {
		return new URL(origin).protocol === 'https:'
	} catch {
		return false
	}
}

/** Security headers shared by dynamic SSR responses and static assets. */
export const security = () => ({
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
	'Content-Security-Policy': "frame-ancestors 'none'",
	...(https() && { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
})

/** Writes headers, optionally preserving values already set downstream. */
export const set = (res: Target, values: Record<string, Value>, missing = false) => {
	for (const [key, value] of Object.entries(values)) {
		if (!missing || !res.hasHeader(key)) res.setHeader(key, value)
	}
}
