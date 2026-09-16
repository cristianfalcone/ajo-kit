import app from 'runtime:app'
import { files, serve, type Response as RuntimeResponse, type Writer } from 'runtime:http'
import { close, connect, db } from 'ajo-kit/database'
import { run as runBootstrap } from './bootstrap'
import { normalize, requestOrigin } from './constants'
import { attach, request, type Reply } from './http'
import { security } from './headers'
import { migrator, type MigrationRegistry } from './migrations'
import { closeLive, create, type Registries } from './server'
import { environment } from './engine-config'
import { compile } from './template'

/** Generated engine entry configuration. */
export interface StartOptions {
	template: string
	registries: Registries
	migrations: MigrationRegistry
	options: {
		auth: boolean
		database: boolean
	}
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

const secured = (response: RuntimeResponse, origins = false): RuntimeResponse => ({
	...response,
	headers: {
		...Object.fromEntries(Object.entries(security()).map(([name, value]) => [name.toLowerCase(), String(value)])),
		...response.headers,
		...(origins && { 'x-ajo-origins': 'v1' }),
	},
})

/** Migrates, creates, and binds the sole production runtime: the ajo engine. */
export async function start(input: StartOptions): Promise<void> {
	const configured = environment(app.env, input.options.auth)
	const required = input.options.database || input.migrations.length > 0
	let connected = false
	const database = () => {
		if (!connected) {
			connect(configured.database)
			connected = true
		}
		return db()
	}

	if (required) {
		try {
			const { error } = await migrator(database(), input.migrations).migrateToLatest()
			if (error) throw error
		} catch (error) {
			await close()
			throw error
		}
	}

	let handler: Awaited<ReturnType<typeof create>>
	try {
		await runBootstrap(input.registries.wares['/src/wares.ts'], database, configured)
		handler = await create(compile(input.template), input.registries)
	} catch (error) {
		if (connected) await close()
		throw error
	}

	let assets: ReturnType<typeof files>
	let server: ReturnType<typeof serve>
	try {
		assets = files(`${app.root}/client`)
		server = serve({ host: configured.host, port: configured.port }, async raw => {
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
			if (asset) return secured(asset, incoming.originPolicy === 'v1')
			const reply = await handler(incoming)
			return secured(dynamic(reply), incoming.originPolicy === 'v1')
		})
	} catch (error) {
		if (connected) await close()
		throw error
	}

	app.onShutdown(() => {
		closeLive()
		server.close()
		if (connected) void close().catch(error => console.error('[ajo] Database shutdown failed:', error))
	})
}
