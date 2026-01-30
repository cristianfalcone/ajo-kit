import { context } from 'ajo/context'
import { stringify, parse } from 'devalue'
import type { Children, Component } from 'ajo'
import type { Params } from 'navaid'
import type { Request, Response } from 'polka'
import type { Head } from '/src/head'

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

// Cache entry type

export type Cached = { value: Head | Entry; sum: string }

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
	handle: (event: SubmitEvent) => void
	reset: () => void
}

// Events (SSE)

export type EventState<T = Entry> = { data: T | null; error: Entry | null }

export type EventCallback<T = Entry> = (state: EventState<T>) => void

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

// Theme context

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Theme {
	mode: ThemeMode
	set: (next: ThemeMode) => void
	cycle: () => void
}

export const ThemeContext = context<Theme>({
	mode: 'system',
	set: () => {},
	cycle: () => {},
})

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

// Hash for cache comparison (djb2, from SvelteKit)

export function sum(value: unknown): string {
	const str = JSON.stringify(value)
	let hash = 5381
	let i = str.length
	while (i) hash = (hash * 33) ^ str.charCodeAt(--i)
	return (hash >>> 0).toString(36)
}

// Auth types

export type Role = 'admin' | 'user'

export interface User {
	id: number
	name: string
	email: string
	roles: Role[]
}

// Request extensions for polka

declare module 'polka' {
	interface Request {
		user?: User
		token?: { abilities: string[] }
		action?: Action
		data?: (Head | Entry | null)[]
		sums?: (string | null)[]
		versions?: Record<string, number>
	}
}

// Deferred promises for parallel loader execution

export type Deferred<T> = {
	promise: Promise<T>
	resolve: (value: T) => void
	reject: (error: Error) => void
}

export function deferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void
	let reject!: (error: Error) => void
	const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
	return { promise, resolve, reject }
}

export type Link = {
	parent: Parent
	deferred: Deferred<Entry>
}

export function links(count: number): Link[] {

	const chain: Link[] = []

	for (let depth = 0; depth < count; depth++) {

		const current = deferred<Entry>()

		// parent() waits for ALL ancestors and accumulates their data

		const parent = depth === 0
			? async () => ({})
			: async () => {
				const ancestors = await Promise.all(chain.slice(0, depth).map(link => link.deferred.promise))
				return ancestors.reduce((result, entry) => ({ ...result, ...entry }), {})
			}

		chain.push({ parent, deferred: current })
	}

	return chain
}

// Serialization

type WithJSON = { toJSON: () => unknown }

const hasJSON = (value: unknown): value is WithJSON =>
	value !== null && typeof value === 'object' && 'toJSON' in value

const reducers = {
	json: (value: unknown) => hasJSON(value) ? value.toJSON() : undefined
}

const revivers = {
	json: (value: unknown) => value
}

export const pack = (value: unknown) => stringify(value, reducers)
export const unpack = (value: string) => parse(value, revivers)
