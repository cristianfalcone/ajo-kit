import type { Children, Component } from 'ajo'
import type { Params } from 'navaid'
import type { Request, Response, Middleware } from 'polka'
export type { Request, Response, Middleware }
import type { Head } from './head'

// Route errors with HTTP status codes

export class AppError extends Error {

	override message: string

	constructor(public status: number, message: string) {
		super(message)
		this.message = message
	}

	toJSON() {
		return {
			message: this.message,
			status: this.status,
			...(import.meta.env.DEV && { stack: this.stack })
		}
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Page not found') {
		super(404, message)
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'Access denied') {
		super(403, message)
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Authentication required') {
		super(401, message)
	}
}

export type ValidationFields = Record<string, string[] | undefined>

export type ActionError = {
	status: number
	message: string
	fields?: ValidationFields
}

export class InvalidError extends AppError {
	constructor(public fields: ValidationFields, message = 'Validation failed') {
		super(400, message)
	}
	toJSON() {
		return {
			message: this.message,
			status: this.status,
			fields: this.fields,
			...(import.meta.env.DEV && { stack: this.stack })
		}
	}
}

export function normalize(error: unknown): AppError {
	if (error instanceof AppError) return error
	if (error instanceof Error) return new AppError(500, error.message)
	return new AppError(500, 'Unknown error')
}

// Route path utilities

export const ancestors = (segments: string[]) => segments.map((_, i) => segments.slice(0, i + 1).join('/'))

// Loader data types

export type Entry = Record<string, unknown>

export type Data = Entry[]

export type Parent = () => Promise<Entry>

export type Context = {
	url: string
	params: Params
}

// Route module types

export type Module = {
	default: Component
	handler?: (context: Context, parent: Parent) => Promise<Entry>
	head?: (context: Context, parent: Parent) => Promise<Head>
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
	error?: AppError
	head?: Head
	rawServerData?: [Head | undefined, ...Data]
}

// Form actions

type Action = {
	name: string
	invoke: (req: Request, res: Response) => Promise<unknown>
}

export type ActionState<T> = {
	loading: boolean
	data?: T
	error?: ActionError
	submit: (event: SubmitEvent) => void
	invoke: (body?: unknown) => Promise<T | undefined>
	reset: () => void
}

// Page and layout args

export type PageArgs<T = Entry> = {
	params: Params
	data?: T
	loading: boolean
	error?: AppError
}

export type LayoutArgs<T = Entry> = PageArgs<T> & {
	children: Children
}

// Navigation helper

export const navigate = (to: string) => {
	globalThis.history?.pushState({}, '', to)
}

// Request helpers

export const ajax = (req: Request) => !!req.headers.accept?.includes('application/json')
export const api = (req: Request) => req.path.startsWith('/api/')

export const ip = (req: Request) => {
	const raw = req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.socket?.remoteAddress ?? 'unknown'
	return raw === '::1' || raw === '127.0.0.1' ? 'localhost' : raw.replace(/^::ffff:/, '')
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
		token?: { abilities: string[] }
		action?: Action
		topics?: Set<string>
		track?: (topic: string | string[]) => void
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

		const promise = new Promise<Entry>((res, rej) => { resolve = res; reject = rej })

		const parent = depth === 0
			? async () => ({})
			: async () => {
				const ancestors = await Promise.all(chain.slice(0, depth).map(link => link.deferred.promise))
				return ancestors.reduce((result, entry) => ({ ...result, ...entry }), {})
			}

		chain.push({ parent, deferred: { promise, resolve, reject } })
	}

	return chain
}

// Formatting

export const formatDate = (iso: string, options?: Intl.DateTimeFormatOptions) =>
	new Date(iso).toLocaleDateString(undefined, options ?? { month: 'short', day: 'numeric', year: 'numeric' })
