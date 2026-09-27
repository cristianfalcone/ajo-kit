// The ajo engine modules, declared only as far as the kit packages import
// them. The engine documentation holds the full module reference.

declare module 'runtime:app' {
	const app: Readonly<{
		data: string | undefined
		env(name: string): string | undefined
		onShutdown(callback: () => void): void
		root: string
	}>

	export default app
}

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
	export function randomUUID(): string
	export function sha256(data: string | Uint8Array): Uint8Array
	export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean
	export function validatePublicKey(key: PublicKey): true
	export function verify(key: PublicKey, data: Uint8Array, signature: Uint8Array): boolean
}

declare module 'runtime:fs' {
	/** Reads a UTF-8 file inside a declared root, bounded (default 1 MiB, hard cap 8 MiB). */
	export function readText(path: string, options?: { maxBytes?: number }): string
}

declare module 'runtime:http' {
	type Header = string | string[]

	export interface Request {
		method: string
		target: string
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

	export function files(root: string): (request: Request) => Response | null
	export function serve(
		options: { host?: string; port: number },
		handler: (request: Request) => Response | Promise<Response>,
	): { close(): void }
}

declare module 'runtime:sqlite' {
	type Parameters = ReadonlyArray<unknown>

	interface Statement {
		readonly reader: boolean
		all(parameters?: Parameters): unknown[]
		iterate(parameters?: Parameters): IterableIterator<unknown>
		run(parameters?: Parameters): { changes: number; lastInsertRowid: number | bigint }
	}

	export default function open(path: string): { close(): void; prepare(sql: string): Statement }
}
