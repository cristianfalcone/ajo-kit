import type { Children, Component } from 'ajo'
import type { Params } from 'navaid'
import type { Request, Response, Middleware } from 'polka'
export type { Request, Response, Middleware }
export type { Head } from './head'
import type { Head } from './head'
import type { Timing } from './timing'

// Route errors with HTTP status codes

export class Failure extends Error {

	constructor(public status: number, message: string) {
		super(message)
	}

	toJSON() {
		return {
			message: mask(this.status, this.message),
			status: this.status,
			...(!production() && import.meta.env.DEV && { stack: this.stack })
		}
	}
}

export class Missing extends Failure {
	constructor(message = 'Page not found') {
		super(404, message)
	}
}

export class Forbidden extends Failure {
	constructor(message = 'Access denied') {
		super(403, message)
	}
}

export class Denied extends Failure {
	constructor(message = 'Authentication required') {
		super(401, message)
	}
}

export type Fields = Record<string, string[] | undefined>

export type Issue = {
	status: number
	message: string
	fields?: Fields
}

export class Invalid extends Failure {
	constructor(public fields: Fields, message = 'Validation failed') {
		super(400, message)
	}
	toJSON() {
		return {
			message: mask(this.status, this.message),
			status: this.status,
			fields: this.fields,
			...(!production() && import.meta.env.DEV && { stack: this.stack })
		}
	}
}

const production = () => process.env.NODE_ENV === 'production'
const mask = (status: number, message: string) =>
	production() && status >= 500 ? 'Internal Server Error' : message
const config = (message: string) => {
	if (production()) console.error(`[security] ${message}`)
	return new Failure(500, message)
}

export function normalize(error: unknown): Failure {
	if (error instanceof Failure) return error
	return new Failure(500, error instanceof Error ? error.message : 'Unknown error')
}

// Route path utilities

export const ancestors = (segments: string[]) => segments.map((_, i) => segments.slice(0, i + 1).join('/'))

// Loader data types

export type Entry = Record<string, unknown>

export type Data = Entry[]

export type Payload = [Head, ...Data]

export type Parent = () => Promise<Entry>

// Route module types

export type Module = {
	default: Component
	defer?: boolean
}

export type Loader = () => Promise<Module>

export type Page = {
	loader: Loader
	segments: string[]
	pattern?: string
	params?: Params
}

export interface State {
	url: string
	params: Params
	data: Data
	loading: boolean
	error?: Failure
	head?: Head
	hash?: string
	topics?: string[]
	versions?: Record<string, number>
}

export type Action<T> = {
	loading: boolean
	data?: T
	error?: Issue
	submit: (event: SubmitEvent) => void
	invoke: (body?: unknown) => Promise<T | undefined>
	reset: () => void
}

// Page and layout args

export type Props<T = Entry> = {
	params: Params
	data?: T
	loading: boolean
	error?: Failure
}

export type Frame<T = Entry> = Props<T> & {
	children: Children
}

// Navigation helper

export const navigate = (to: string) => {
	globalThis.history?.pushState({}, '', to)
	globalThis.dispatchEvent?.(new CustomEvent('ajo:navigate'))
}

// Request helpers

export const ajax = (req: Request) => !!req.headers.accept?.includes('application/json')
export const api = (req: Request) => req.path.startsWith('/api/')

const enabled = (value: string | undefined) => value === '1' || value?.toLowerCase() === 'true'
const proxy = () => enabled(process.env.TRUST_PROXY)

const first = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value

const address = (value: string) => {
	const raw = value.trim().replace(/^\[/, '').replace(/\]$/, '').replace(/^::ffff:/, '')
	return raw === '::1' || raw === '127.0.0.1' ? 'localhost' : raw
}

const ipv4 = (value: string) => {
	const parts = value.split('.')
	return parts.length === 4 && parts.every(part => {
		if (!/^\d{1,3}$/.test(part)) return false
		const number = Number(part)
		return number >= 0 && number <= 255
	})
}

const ipv6 = (value: string) =>
	value.includes(':') && /^[0-9a-f:.]+$/i.test(value)

const local = (host: string) => {
	try {
		return address(new URL(`http://${host}`).hostname) === 'localhost'
	} catch {
		return false
	}
}

const forwarded = (header: string | string[] | undefined) => {
	const value = first(header)
	if (!value) return

	const addr = address(value.split(',')[0])
	if (addr === 'localhost' || ipv4(addr) || ipv6(addr)) return addr
}

export const ip = (req: Request) => {
	const raw = proxy()
		? forwarded(req.headers['x-forwarded-for']) ?? req.socket?.remoteAddress
		: req.socket?.remoteAddress

	return raw ? address(raw) : 'unknown'
}

export const origin = (req: Request) => {
	const configured = process.env.APP_URL

	if (configured) {
		try {
			const url = new URL(configured)
			if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
			return url.origin
		} catch {
			throw config('Invalid APP_URL')
		}
	}

	const host = req.headers.host
	if (!host) throw new Failure(400, 'Missing Host header')

	if (production() && !local(host)) {
		throw config('APP_URL is required in production')
	}

	const forwarded = first(req.headers['x-forwarded-proto'])?.split(',')[0]?.trim()
	const protocol = proxy() && (forwarded === 'http' || forwarded === 'https') ? forwarded : 'http'

	try {
		return new URL(`${protocol}://${host}`).origin
	} catch {
		throw new Failure(400, 'Invalid Host header')
	}
}

// Auth types

export interface User {
	id: number
	roles?: string[]
	[key: string]: unknown
}

// Request extensions for polka

declare module 'polka' {
	interface Request {
		user?: User
		session?: { id: string }
		token?: { id: string; abilities: string[] }
		topics?: Set<string>
		track?: (topic: string | string[]) => void
		verifyLive?: () => Promise<boolean>
		timing?: Timing
		revalidate?: () => Promise<Payload>
		head?: Head
		entries?: Data
	}
}

// Deferred promises for parallel loader execution

export type Link = {
	parent: Parent
	deferred: { promise: Promise<Entry>; resolve: (value: Entry) => void; reject: (error: Error) => void }
}

export function links(count: number): Link[] {

	const chain: Link[] = []

	for (let depth = 0; depth < count; depth++) {

		let resolve!: (value: Entry) => void
		let reject!: (error: Error) => void

		const promise = new Promise<Entry>((res, rej) => {
			resolve = res
			reject = rej
		})

		const parent = async () =>
			Object.assign({}, ...await Promise.all(chain.slice(0, depth).map(link => link.deferred.promise)))

		chain.push({ parent, deferred: { promise, resolve, reject } })
	}

	return chain
}

// Formatting

export const date = (iso: string, options?: Intl.DateTimeFormatOptions) =>
	new Date(iso).toLocaleDateString(undefined, options ?? { month: 'short', day: 'numeric', year: 'numeric' })
