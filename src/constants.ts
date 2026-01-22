import { context } from 'ajo/context'
import type { Children } from 'ajo'
import type { Params } from 'navaid'

export type { Params }

// Route errors with HTTP status codes

export class RouteError extends Error {
	override message: string
	constructor(public status: number, message: string) {
		super(message)
		this.message = message
	}
	toJSON() {
		return { error: this.message }
	}
}

export class NotFoundError extends RouteError {
	constructor(message = 'Page not found') {
		super(404, message)
	}
}

export class ForbiddenError extends RouteError {
	constructor(message = 'Access denied') {
		super(403, message)
	}
}

export class UnauthorizedError extends RouteError {
	constructor(message = 'Authentication required') {
		super(401, message)
	}
}

// Server data types

export type Server = { page: Record<string, unknown>; layout: Array<Record<string, unknown>> }

export type HandlerArgs = {
	params: Params
	url: string
	parent: () => Promise<Record<string, unknown>>
}

// Form action state

export type ActionState<T> = {
	loading: boolean
	data: T | undefined
	error: string | undefined
	fields: Record<string, string[]> | undefined
	handle: (event: SubmitEvent) => void
	reset: () => void
}

// Page and layout args

export type PageArgs<T = Record<string, unknown>> = {
	params: Params
	data: T | undefined
	loading: boolean
	error: RouteError | undefined
}

export type LayoutArgs<T = Record<string, unknown>> = PageArgs<T> & {
	children: Children
}

// Cart context

export interface CartItem {
	id: number | string
	name: string
	price: number
	qty: number
	image?: string
}

export interface Cart {
	items: CartItem[]
	add: (item: Omit<CartItem, 'qty'>) => void
	update: (id: CartItem['id'], quantity: number) => void
	remove: (id: CartItem['id']) => void
	count: number
	total: number
}

export const CartContext = context<Cart>({
	items: [],
	add: () => {},
	update: () => {},
	remove: () => {},
	count: 0,
	total: 0,
})

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

export interface Auth {
	id: number
	username: string
	email: string
	roles: Role[]
}

export interface AuthState {
	user: Auth | null
	signout: ActionState<void>
}

export const AuthContext = context<AuthState>({
	user: null,
	signout: {
		loading: false,
		data: undefined,
		error: undefined,
		fields: undefined,
		handle: () => {},
		reset: () => {}
	}
})

// Request may have auth populated by session middleware

declare module 'polka' {
	interface Request {
		auth?: Auth | null
	}
}
