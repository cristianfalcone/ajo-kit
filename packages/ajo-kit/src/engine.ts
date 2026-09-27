import app from 'runtime:app'
import { files, serve, type Response as RuntimeResponse, type Writer } from 'runtime:http'
import { close, db } from 'ajo-kit/database'
import { normalize, requestOrigin, security, setOriginReader, type Bootstrap } from './utils'
import { attach, request, type Reply } from './http'
import { migrator, type Migrations } from './migrate'
import { closeLive, create } from './server'
import { wares } from 'virtual:ajo/handlers'

/** Generated engine entry configuration. */
export interface StartOptions {
	template: string
	migrations: Migrations
	options: { database: boolean }
	/** runtime:fs readText, passed only when the App declares the host origin manifest. */
	origins?: (path: string, options: { maxBytes: number }) => string
}

const values = (reply: Reply) => Object.fromEntries([...reply.headers].map(([name, value]) => [
	name,
	Array.isArray(value) ? value.map(String) : String(value),
]))

const dynamic = (reply: Reply): RuntimeResponse => ({
	status: reply.statusCode,
	headers: values(reply),
	...(reply.stream
		? {
			sse(writer: Writer) {
				attach(reply, {
					send: text => { if (!writer.send(text)) writer.close() },
					close: () => writer.close(),
					closed: writer.closed,
				})
			}
		}
		: { body: reply.body }),
})

/** Migrates, creates, and binds the sole production runtime: the ajo engine. */
export async function start(input: StartOptions): Promise<void> {
	// Outside production auth signing falls back to a public key, so the engine refuses to start.
	if (app.env('NODE_ENV') !== 'production') throw new Error('NODE_ENV must be "production" for the ajo engine')
	let url: URL | undefined
	try { url = new URL(app.env('APP_URL')!) } catch {}
	if (url?.protocol !== 'http:' && url?.protocol !== 'https:') throw new Error('APP_URL must be an absolute HTTP(S) URL')

	setOriginReader(input.origins)
	// Assets and early refusals take these here; dynamic replies get them from `secure`, the first ware in create().
	const headers = Object.fromEntries(Object.entries(security()).map(([name, value]) => [name.toLowerCase(), value]))
	const secured = (response: RuntimeResponse): RuntimeResponse => ({ ...response, headers: { ...headers, ...response.headers } })

	try {
		if (input.options.database || input.migrations.length > 0) {
			const { error } = await migrator(db(), input.migrations).migrateToLatest()
			if (error) throw error
		}

		const hook = (await wares['/src/wares.ts']?.())?.bootstrap as Bootstrap | undefined
		if (hook) await hook({ db: db() })

		const handler = await create(input.template)
		const assets = files(`${app.root}/client`)
		const server = serve({ host: app.env('HOST') ?? '0.0.0.0', port: Number(app.env('PORT') ?? 8080) }, async raw => {
			const incoming = request({
				method: raw.method,
				target: raw.target,
				headers: raw.headers,
				remoteAddress: raw.remoteAddress,
				read: limit => raw.body(limit),
			})
			try { requestOrigin(incoming) }
			catch (error) {
				const failure = normalize(error)
				return secured({
					status: failure.status,
					headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
					body: failure.toJSON().message,
				})
			}

			const asset = assets(raw)
			return asset ? secured(asset) : dynamic(await handler(incoming))
		})

		app.onShutdown(() => {
			closeLive()
			server.close()
			void close().catch(error => console.error('[ajo] Database shutdown failed:', error))
		})
	} catch (error) {
		await close()
		throw error
	}
}
