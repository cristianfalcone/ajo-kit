import { context } from 'ajo/context'
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

// Auth types

export type Role = 'admin' | 'user' | 'moderator'

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
		data?: Data
		head?: Head
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
