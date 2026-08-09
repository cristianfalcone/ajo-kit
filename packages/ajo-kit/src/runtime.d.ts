declare module 'runtime:crypto' {
	type PublicKeyBytes = string | Uint8Array
	type PublicKey =
		| { kty: 'EC'; crv: 'P-256'; x: PublicKeyBytes; y: PublicKeyBytes }
		| { kty: 'OKP'; crv: 'Ed25519'; x: PublicKeyBytes }
		| { kty: 'RSA'; n: PublicKeyBytes; e: PublicKeyBytes }

	export function argon2Hash(plain: string | Uint8Array): Promise<string>
	export function argon2Verify(phc: string, plain: string | Uint8Array): Promise<boolean>
	export function hmacSha256(key: string | Uint8Array, data: string | Uint8Array): Uint8Array
	export function randomBytes(length: number): Uint8Array
	export function sha256(data: string | Uint8Array): Uint8Array
	export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean
	export function validatePublicKey(key: PublicKey): true
	export function verify(key: PublicKey, data: Uint8Array, signature: Uint8Array): boolean
}

declare module 'runtime:app' {
	const app: Readonly<{
		argv: readonly string[]
		data: string | undefined
		env(name: string): string | undefined
		onShutdown(callback: () => void): void
		root: string
	}>

	export default app
}

declare module 'runtime:http' {
	type Header = string | string[]

	export interface Request {
		method: string
		target: string
		path: string
		query: string
		headers: Record<string, Header | undefined>
		remoteAddress: string
		body(limit: number): Promise<Uint8Array>
	}

	export interface Writer {
		send(text: string): boolean
		close(): void
		closed: Promise<void>
	}

	export interface FileBody {
		readonly [Symbol.toStringTag]?: 'AjoFileBody'
	}

	export interface Response {
		status?: number
		headers?: Record<string, Header>
		body?: string | Uint8Array | FileBody
		sse?(writer: Writer): void
	}

	export interface Server {
		close(): void
	}

	export function files(root: string): (request: Request) => Response | null
	export function serve(
		options: { host?: string; port: number },
		handler: (request: Request) => Response | Promise<Response>,
	): Server
}

declare module 'runtime:sqlite' {
	type Value = null | number | bigint | string | Uint8Array
	type Parameters = ReadonlyArray<unknown> | Readonly<Record<string, unknown>>

	interface Result {
		changes: number
		lastInsertRowid: number | bigint
	}

	interface Statement {
		readonly reader: boolean
		all(parameters?: Parameters): Array<Record<string, Value>>
		get(parameters?: Parameters): Record<string, Value> | undefined
		iterate(parameters?: Parameters): IterableIterator<Record<string, Value>>
		run(parameters?: Parameters): Result
		finalize(): void
	}

	interface Database {
		close(): void
		exec(sql: string): void
		prepare(sql: string): Statement
	}

	interface Options {
		create?: boolean
		readonly?: boolean
	}

	export default function open(path: string, options?: Options): Database
}
