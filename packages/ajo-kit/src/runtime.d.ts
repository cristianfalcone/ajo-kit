declare module 'runtime:crypto' {
	type PublicKeyBytes = string | Uint8Array
	type PublicKey =
		| { kty: 'EC'; crv: 'P-256'; x: PublicKeyBytes; y: PublicKeyBytes }
		| { kty: 'OKP'; crv: 'Ed25519'; x: PublicKeyBytes }
		| { kty: 'RSA'; n: PublicKeyBytes; e: PublicKeyBytes }
	type PrivateKey = { kty: 'OKP'; crv: 'Ed25519'; x: Uint8Array; d: Uint8Array }

	/** Incremental SHA-256 or HMAC-SHA-256; digest() finalizes, one shot. */
	export interface Hash {
		update(data: string | Uint8Array): this
		digest(): Uint8Array
	}

	/**
	 * age v1 encryption of one file to an X25519 recipient. Both paths must
	 * be inside declared `runtime:fs` roots; the output is create-only.
	 */
	export function ageEncryptFile(recipient: string, inputPath: string, outputPath: string): void
	export function argon2Hash(plain: string | Uint8Array): Promise<string>
	export function argon2Verify(phc: string, plain: string | Uint8Array): Promise<boolean>
	export function createHash(algorithm: 'sha256'): Hash
	export function createHmac(algorithm: 'sha256', key: string | Uint8Array): Hash
	/** Fresh Ed25519 pair as JWK-shaped objects; the private key carries `d`. */
	export function generateKeyPair(): { publicKey: PublicKey; privateKey: PrivateKey }
	export function hmacSha256(key: string | Uint8Array, data: string | Uint8Array): Uint8Array
	export function randomBytes(length: number): Uint8Array
	export function randomUUID(): string
	export function sha256(data: string | Uint8Array): Uint8Array
	/** Ed25519 signature (64 bytes); message capped at 8 MiB. */
	export function sign(key: PrivateKey, message: Uint8Array): Uint8Array
	export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean
	export function validatePublicKey(key: PublicKey): true
	export function verify(key: PublicKey, data: Uint8Array, signature: Uint8Array): boolean
}

declare module 'runtime:app' {
	const app: Readonly<{
		argv: readonly string[]
		data: string | undefined
		env(name: string): string | undefined
		hostname(): string
		onShutdown(callback: () => void): void
		root: string
		rssBytes(): number
		uptimeSeconds(): number
	}>

	export default app
}

declare module 'runtime:fs' {
	/**
	 * Root-confined filesystem access. Every path must be absolute, normalized
	 * (no `.`/`..` segments) and inside a root the artifact declared under
	 * `package.json#kit.engine.fs.roots`; anything else throws. Importing this
	 * module with no declared roots fails at load.
	 */
	export interface FileStat {
		size: number
		/** Seconds since the Unix epoch. */
		mtime: number
		type: 'file' | 'directory' | 'fifo' | 'other'
	}

	export interface FileSystemStat {
		totalBytes: number
		freeBytes: number
	}

	/** SQLite page-level delta metrics, as diffPages reports them. */
	export interface PageDiff {
		pageSize: number
		oldPages: number
		newPages: number
		changedPages: number
		deltaBytes: number
	}

	/** Reads a UTF-8 file, bounded (default 1 MiB, hard cap 8 MiB). */
	export function readText(path: string, options?: { maxBytes?: number }): string
	/** Reads a UTF-8 window of a file; length is capped at 8 MiB. */
	export function readRange(path: string, offset: number, length: number): string
	/** Reads a binary window of a file; length is capped at 8 MiB. */
	export function readBytes(path: string, offset: number, length: number): Uint8Array
	/** Lowercase hex SHA-256 of the file's raw bytes; streaming, no size cap. */
	export function sha256File(path: string): string
	export function stat(path: string): FileStat
	export function statfs(path: string): FileSystemStat
	/** Sorted entry names, `.`/`..` excluded; throws past 4096 entries. */
	export function listDirectory(path: string): string[]
	/** Creates one directory, mode 0700; the parent must already exist. */
	export function makeDirectory(path: string): void
	/** Removes one regular file; anything else throws. */
	export function removeFile(path: string): void
	/** Watches a directory; returns the disposer that stops the watcher. */
	export function watchDirectory(path: string, callback: () => void): () => void
	/** Writes via temp file + rename in the same directory, mode 0600. */
	export function writeAtomic(path: string, text: string): void
	/** Binary writeAtomic: temp file + rename, mode 0600. */
	export function writeBytesAtomic(path: string, bytes: Uint8Array): void
	/** Create-only publication: fails if the destination already exists. */
	export function writeBytesCreate(path: string, bytes: Uint8Array): void
	/** Page-level delta between two SQLite database images. */
	export function diffPages(oldPath: string, newPath: string, deltaPath: string): PageDiff
	/** Rebuilds a database image from an old image plus a page delta. */
	export function applyPages(oldPath: string, deltaPath: string, outputPath: string): void
}

declare module 'runtime:ipc' {
	/**
	 * Writes one atomic line (≤ PIPE_BUF) to a FIFO declared under
	 * `package.json#kit.engine.ipc.pipes`, opened non-blocking. Typed
	 * failures: ENOENT (missing), ENXIO (no reader), EAGAIN (full) — all
	 * retryable by the caller. Deliberately NOT exec/spawn.
	 */
	export function writePipe(path: string, text: string): void
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
	/**
	 * Online copy of an open database to a create-only destination inside a
	 * declared `runtime:fs` root; the copy lands in journal_mode=DELETE.
	 */
	export function backup(source: Database, destination: string): void
}

declare module 'runtime:net' {
	/**
	 * One bounded HTTP/1.1 request. The engine owns the framing headers and
	 * refuses reserved ones, connects only to global-unicast destinations,
	 * and buffers the whole response. The prelude's global `fetch` is built
	 * over this; import it directly only when the raw shape is needed.
	 */
	export interface Options {
		host: string
		port: number
		tls: boolean
		method: string
		path: string
		headers: ReadonlyArray<readonly [string, string]>
		body?: string | Uint8Array
		/** Response-body cap in bytes; the request fails past it. */
		maxBody?: number
		connectTimeoutMs?: number
	}

	export interface Response {
		status: number
		reason: string
		headers: Array<[string, string]>
		body: Uint8Array
	}

	export function request(options: Options): { promise: Promise<Response>; abort(): void }
}
