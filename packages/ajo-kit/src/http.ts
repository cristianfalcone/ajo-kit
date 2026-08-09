/** Request header values normalized by the host adapter. */
export type Header = string | string[]
/** Response header values accepted by the reply accumulator. */
export type Value = string | number | readonly string[]

/** Lower-case request headers, with arrays reserved for repeated fields. */
export interface Headers {
	[key: string]: Header | undefined
	accept?: string
	authorization?: string
	'content-length'?: string
	'content-type'?: string
	cookie?: string
	host?: string
	origin?: string
	referer?: string
	'transfer-encoding'?: string
	'user-agent'?: string
}
/** Host-neutral request consumed by ajo-kit routes and middleware. */
export interface Request {
	method: string
	target: string
	originalUrl: string
	path: string
	query: Record<string, Header>
	params: Record<string, string>
	headers: Headers
	remoteAddress?: string
	read: (limit: number) => Promise<Uint8Array>
	/** Parsed JSON body; loosely typed as handlers relied on pre-kernel. */
	body?: any
}
/** Input accepted by the host-neutral request factory. */
export type Input = {
	method: string
	target: string
	headers?: Headers
	remoteAddress?: string
	read: Request['read']
}
/** Creates a normalized request from host-provided HTTP fields. */
export function request(input: Input): Request {
	let path = input.target
	const hash = path.indexOf('#', 1)
	if (hash !== -1) path = path.slice(0, hash)
	const mark = path.indexOf('?', 1)
	const search = mark === -1 ? '' : path.slice(mark + 1)
	if (mark !== -1) path = path.slice(0, mark)
	const query = Object.create(null) as Record<string, Header>
	const headers = Object.create(null) as Headers
	for (const [key, value] of new URLSearchParams(search)) {
		const current = query[key]
		query[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value]
	}
	for (const [key, value] of Object.entries(input.headers ?? {})) {
		if (value !== undefined) headers[key.toLowerCase()] = Array.isArray(value) ? [...value] : value
	}
	return {
		method: input.method.toUpperCase(),
		target: input.target,
		originalUrl: input.target,
		path,
		query,
		params: Object.create(null) as Record<string, string>,
		headers,
		remoteAddress: input.remoteAddress,
		read: input.read,
	}
}
/** Creates a bounded body reader over a host-provided byte stream. */
export const reader = (source: AsyncIterable<Uint8Array>): Request['read'] => async limit => {
	const chunks: Uint8Array[] = []
	let length = 0
	let exceeded = false
	for await (const chunk of source) {
		length += chunk.byteLength
		if (length <= limit) chunks.push(chunk)
		else exceeded = true
	}
	if (exceeded) throw Object.assign(new Error('Exceeded "Content-Length" limit'), { status: 413 })
	const body = new Uint8Array(length)
	let offset = 0
	for (const chunk of chunks) {
		body.set(chunk, offset)
		offset += chunk.byteLength
	}
	return body
}

/** Live response writer exposed to the server after headers are accumulated. */
export type SSE = {
	send: (text: string) => void
	close: () => void
	closed: Promise<void>
}
type Sink = SSE
type Stream = {
	attach: (sink: Sink) => void
}
const streams = new WeakMap<Reply, Stream>()

/** Host-neutral response accumulator returned by the ajo-kit handler. */
export class Reply {
	statusCode = 200
	writableEnded = false
	readonly headers = new Map<string, Value>()
	body?: string | Uint8Array
	stream?: SSE
	constructor(readonly method = 'GET') {}
	setHeader(key: string, value: Value) {
		this.headers.set(key.toLowerCase(), value)
		return this
	}
	getHeader(key: string) {
		return this.headers.get(key.toLowerCase())
	}
	hasHeader(key: string) {
		return this.headers.has(key.toLowerCase())
	}

	removeHeader(key: string) {
		this.headers.delete(key.toLowerCase())
	}
	writeHead(status: number, headers?: Record<string, Value>) {
		this.statusCode = status
		for (const [key, value] of Object.entries(headers ?? {})) this.setHeader(key, value)
		return this
	}
	end(body?: string | Uint8Array) {
		if (this.writableEnded) return this
		this.writableEnded = true
		if (this.statusCode === 204 || this.statusCode === 304) {
			this.removeHeader('Content-Type')
			this.removeHeader('Content-Length')
			return this
		}
		if (this.method !== 'HEAD') this.body = body
		return this
	}

	/** Opens an SSE descriptor; the host adapter attaches its writer later. */
	sse(): SSE {
		if (this.stream) return this.stream
		const queue: string[] = []
		let sink: Sink | undefined
		let ended = false
		let settle!: () => void
		const closed = new Promise<void>(resolve => settle = resolve)
		const finish = () => {
			if (ended) return
			ended = true
			this.writableEnded = true
			settle()
		}
		const descriptor: SSE = {
			send: text => {
				if (ended) return
				if (sink) sink.send(text)
				else queue.push(text)
			},
			close: () => {
				if (ended) return
				sink?.close()
				finish()
			},
			closed,
		}

		this.stream = descriptor
		streams.set(this, {
			attach: writer => {
				if (ended) return writer.close()
				sink = writer
				for (const text of queue.splice(0)) writer.send(text)
				void writer.closed.then(finish, finish)
			},
		})

		return descriptor
	}
}

/** Attaches a host SSE writer to a reply descriptor. */
export const attach = (reply: Reply, sink: Sink) => streams.get(reply)?.attach(sink)

/** Continuation used by ordered HTTP middleware. */
export type Next = (error?: unknown) => void

/** Host-neutral route or middleware function. */
export type Middleware = (request: Request, reply: Reply, next: Next) => unknown | Promise<unknown>

/** Host-neutral dynamic request handler returned by create(). */
export type Handler = (request: Request) => Promise<Reply>

type Match = (path: string) => Record<string, string> | undefined

type Route = {
	method: string
	match: Match
	handlers: Middleware[]
}

type Options = {
	error?: (error: unknown, request: Request, reply: Reply) => unknown | Promise<unknown>
	missing?: (request: Request, reply: Reply) => unknown | Promise<unknown>
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const compile = (pattern: string): Match => {
	const keys: string[] = []
	const parts = `/${pattern}`.replace(/^\/\/+/, '/').split('/').slice(1)
	let source = ''

	for (const part of parts) {
		if (part === '*') {
			keys.push('*')
			source += '/(.*)'
		} else if (part.startsWith(':')) {
			keys.push(part.slice(1))
			source += '/([^/]+?)'
		} else if (part) source += `/${escape(part)}`
	}

	const expression = new RegExp(`^${source || '/'}\/?$`, 'i')

	return path => {
		const values = expression.exec(path)
		if (!values) return
		const params = Object.create(null) as Record<string, string>
		keys.forEach((key, index) => {
			try { params[key] = decodeURIComponent(values[index + 1]) }
			catch { params[key] = values[index + 1] }
		})
		return params
	}
}

/** Small ordered router for literal, parameter, and wildcard paths. */
export class Router {
	readonly handler: Handler
	private wares: Middleware[] = []
	private routes: Route[] = []

	constructor(private config: Options = {}) {
		this.handler = async request => {
			const reply = new Reply(request.method)
			const handlers = [...this.wares]
			let found = false

			for (const route of this.routes) {
				if (route.method !== request.method && !(request.method === 'HEAD' && route.method === 'GET')) continue
				const params = route.match(request.path)
				if (!params) continue
				found = true
				Object.assign(request.params, params)
					handlers.push(...route.handlers)
			}
			if (!found) handlers.push(async (request, reply) => {
				if (this.config.missing) await this.config.missing(request, reply)
				else reply.writeHead(404).end('Not found')
			})
			let handled = false
			const fail = async (error: unknown) => {
				if (handled) throw error
				handled = true
				if (this.config.error) await this.config.error(error, request, reply)
				else {
					const value = error && typeof error === 'object' ? (error as { status?: unknown }).status : undefined
					const status = typeof value === 'number' && value >= 400 && value <= 599 ? value : 500
					reply.writeHead(status).end(status === 413 ? 'Content Too Large' : 'Internal Server Error')
				}
			}
			let index = 0
			const dispatch = async (): Promise<void> => {
				if (reply.writableEnded || index >= handlers.length) return
				const middleware = handlers[index++]
				let next: Promise<void> | undefined
				await middleware(request, reply, error => next ??= error ? fail(error) : dispatch().catch(fail))
				if (next) await next
			}
			try { await dispatch() }
			catch (error) { await fail(error) }
			return reply
		}
	}

	use(...handlers: Middleware[]) {
		this.wares.push(...handlers)
		return this
	}

	route(method: string, pattern: string, ...handlers: Middleware[]) {
		this.routes.push({ method: method.toUpperCase(), match: compile(pattern), handlers })
		return this
	}

	get(pattern: string, ...handlers: Middleware[]) { return this.route('GET', pattern, ...handlers) }
	post(pattern: string, ...handlers: Middleware[]) { return this.route('POST', pattern, ...handlers) }
	put(pattern: string, ...handlers: Middleware[]) { return this.route('PUT', pattern, ...handlers) }
	patch(pattern: string, ...handlers: Middleware[]) { return this.route('PATCH', pattern, ...handlers) }
	delete(pattern: string, ...handlers: Middleware[]) { return this.route('DELETE', pattern, ...handlers) }
	options(pattern: string, ...handlers: Middleware[]) { return this.route('OPTIONS', pattern, ...handlers) }
	head(pattern: string, ...handlers: Middleware[]) { return this.route('HEAD', pattern, ...handlers) }
}

const status = new Map([[200, 'OK'], [400, 'Bad Request'], [404, 'Not Found'], [500, 'Internal Server Error']])

/** Serializes a value into a completed reply with content headers. */
export function send(reply: Reply, code = 200, data: unknown = '', headers: Record<string, Value> = {}) {
	for (const [key, value] of Object.entries(headers)) reply.setHeader(key, value)

	let body: string | Uint8Array
	let type = reply.getHeader('Content-Type')

	if (data instanceof Uint8Array) {
		body = data
		type ||= 'application/octet-stream'
	} else if (data !== null && typeof data === 'object') {
		body = JSON.stringify(data) ?? ''
		type ||= 'application/json; charset=utf-8'
	} else {
		body = data ? String(data) : status.get(code) ?? String(code)
		type ||= 'text/plain'
	}

	reply.setHeader('Content-Type', type)
	reply.setHeader('Content-Length', body instanceof Uint8Array ? body.byteLength : new TextEncoder().encode(body).byteLength)
	reply.writeHead(code).end(body)
}
