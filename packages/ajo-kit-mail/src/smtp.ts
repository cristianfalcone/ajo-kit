// Node-only by design. The ajo package-export condition blocks this subpath,
// and these static builtins make a forced source import fail the engine graph audit.
import { isIP, Socket } from 'node:net'
import { connect as connectTls } from 'node:tls'
import { createTransport } from 'nodemailer'
import { Refused, Undelivered } from './errors'
import type { Receipt, Transport } from './index'
import type { Sealed } from './seal'

/**
 * Discrete credential fields on purpose. There is no `url` option: a
 * smtp://user:pass@host string leaks into config dumps, error text and issue
 * trackers far more casually than a `pass` field does.
 *
 * There is no `insecure` flag, no `requireTls: false`, no NODE_TLS_REJECT_UNAUTHORIZED
 * accommodation. STARTTLS is required, the certificate is verified, the floor is
 * TLS 1.2, and none of that is configurable. Local development uses capture().
 */
export interface SmtpOptions {
	host: string
	/** Default 587. Use 465 with implicit: true. */
	port?: number
	/** Implicit TLS from the first byte (465). Default false: plaintext connect + required STARTTLS. */
	implicit?: boolean
	user?: string
	pass?: string
	/** EHLO name. Defaults to the sender's domain, so the host name never leaves the box. */
	name?: string
}

interface Configuration {
	readonly host: string
	readonly port: number
	readonly implicit: boolean
	readonly user?: string
	readonly pass?: string
	readonly name?: string
}

const CONTROL = /[\u0000-\u001f\u007f]/
const VERIFY_TIMEOUT = 10_000

type SocketOptions = {
	readonly connection: Socket
	readonly secured?: boolean
}

type SocketCallback = (error: Error | null, options?: SocketOptions) => void

const configuration = (options: SmtpOptions): Configuration => {
	if (!options || typeof options !== 'object') throw new Refused('invalid-config')

	const host = options.host
	const port = options.port ?? 587
	const implicit = options.implicit ?? false
	const user = options.user
	const pass = options.pass
	const name = options.name

	if (
		typeof host !== 'string'
		|| !host
		|| host !== host.trim()
		|| host.length > 253
		|| CONTROL.test(host)
		|| /\s/.test(host)
		|| !Number.isInteger(port)
		|| port < 1
		|| port > 65_535
		|| typeof implicit !== 'boolean'
		|| (user !== undefined && (typeof user !== 'string' || !user))
		|| (pass !== undefined && (typeof pass !== 'string' || !pass))
		|| (user === undefined) !== (pass === undefined)
		|| (
			name !== undefined
			&& (
				typeof name !== 'string'
				|| !name
				|| name !== name.trim()
				|| name.length > 253
				|| CONTROL.test(name)
				|| /\s/.test(name)
			)
		)
	) {
		throw new Refused('invalid-config')
	}

	return Object.freeze({
		host,
		port,
		implicit,
		...(user !== undefined && { user, pass }),
		...(name !== undefined && { name }),
	})
}

const connector = (
	config: Configuration,
	own: (socket: Socket) => void,
) =>
	(_options: unknown, callback: SocketCallback) => {
		let settled = false
		let socket: Socket
		const finish = (error: Error | null, options?: SocketOptions) => {
			if (settled) return
			settled = true
			callback(error, options)
		}

		if (config.implicit) {
			socket = connectTls({
				host: config.host,
				port: config.port,
				...(isIP(config.host) === 0 && { servername: config.host }),
				rejectUnauthorized: true,
				minVersion: 'TLSv1.2',
			}, () => finish(null, {
				connection: socket,
				secured: true,
			}))
		} else {
			socket = new Socket()
			socket.connect(config.port, config.host, () => finish(null, {
				connection: socket,
			}))
		}

		own(socket)
		socket.on('error', () => {
			if (!settled) {
				finish(Object.assign(new Error('SMTP connection failed'), {
					code: config.implicit ? 'ETLS' : 'ESOCKET',
				}))
			}
		})
	}

const settings = (
	config: Configuration,
	name: string,
	timeout: number,
	own: (socket: Socket) => void,
) => ({
	host: config.host,
	port: config.port,
	secure: config.implicit,
	pool: false,
	requireTLS: !config.implicit,
	ignoreTLS: false,
	opportunisticTLS: false,
	name,
	...(config.user !== undefined && {
		auth: {
			user: config.user,
			pass: config.pass!,
		},
	}),
	connectionTimeout: timeout,
	greetingTimeout: timeout,
	socketTimeout: timeout,
	dnsTimeout: timeout,
	tls: {
		rejectUnauthorized: true,
		minVersion: 'TLSv1.2' as const,
	},
	disableFileAccess: true,
	disableUrlAccess: true,
	logger: false,
	debug: false,
	transactionLog: false,
	getSocket: connector(config, own),
})

const remaining = (deadline: number) => {
	const value = Math.ceil(deadline - Date.now())
	return value > 0 ? Math.min(value, 2_147_483_647) : 0
}

const bounded = <T>(work: Promise<T>, signal: AbortSignal, close: () => void) =>
	new Promise<T>((resolve, reject) => {
		const stop = () => {
			close()
			reject(new Undelivered('timeout', true))
		}

		if (signal.aborted) return stop()

		signal.addEventListener('abort', stop, { once: true })
		work.then(
			value => {
				signal.removeEventListener('abort', stop)
				resolve(value)
			},
			error => {
				signal.removeEventListener('abort', stop)
				reject(error)
			},
		)
	})

/** SMTP reply-code mapping. Note the parentheses: this is where a precedence bug hides. */
const reply = (error: unknown): Undelivered => {
	const value = (error ?? {}) as {
		code?: unknown
		command?: unknown
		responseCode?: unknown
	}
	const code = typeof value.code === 'string' ? value.code : ''
	const command = typeof value.command === 'string' ? value.command : ''
	const status = typeof value.responseCode === 'number' ? value.responseCode : undefined
	const hint = status === undefined ? undefined : `smtp ${status}`

	if (code === 'EAUTH' || status === 530 || status === 535) return new Undelivered('auth', false, hint)
	if (code === 'ETLS' || code.startsWith('ERR_TLS') || code.includes('CERT')) {
		return new Undelivered('tls', false)
	}
	if (code === 'ESOCKET' && command === 'CONN') return new Undelivered('tls', false)
	if (code === 'ETIMEDOUT' || (code === 'ECONNECTION' && status === undefined)) {
		return new Undelivered('timeout', true)
	}
	if (status !== undefined && status >= 400 && status < 500) {
		return new Undelivered('throttled', true, hint)
	}
	if (status !== undefined && status >= 500) return new Undelivered('rejected', false, hint)
	if (code) return new Undelivered('connection', true)

	return new Undelivered('unknown', false)
}

/**
 * Creates a one-connection-per-message SMTP transport with mandatory verified
 * TLS, deadline-derived socket timeouts and sanitized failure classifications.
 */
export function smtp(options: SmtpOptions): Transport {
	const config = configuration(options)

	const send = async (mail: Sealed): Promise<Receipt | void> => {
		const timeout = remaining(mail.deadline)
		if (!timeout) throw new Undelivered('timeout', true)

		let mailer: ReturnType<typeof createTransport> | undefined
		let socket: Socket | undefined
		let closed = false
		const own = (value: Socket) => {
			socket = value
			if (closed) value.destroy()
		}
		const close = () => {
			if (closed) return
			closed = true
			socket?.destroy()
			mailer?.close()
		}

		try {
			const name = config.name ?? mail.from.address.slice(mail.from.address.lastIndexOf('@') + 1)
			mailer = createTransport(settings(config, name, timeout, own))
			const result = await bounded<{ messageId?: unknown }>(mailer.sendMail({
				from: mail.from,
				to: mail.to,
				...(mail.replyTo && { replyTo: mail.replyTo }),
				subject: mail.subject,
				text: mail.text,
				...(mail.html !== undefined && { html: mail.html }),
				envelope: {
					from: mail.from.address,
					to: [mail.to.address],
				},
				disableFileAccess: true,
				disableUrlAccess: true,
			}) as Promise<{ messageId?: unknown }>, mail.signal, close)

			return typeof result.messageId === 'string' && result.messageId
				? { id: result.messageId }
				: undefined
		} catch (error) {
			if (error instanceof Undelivered) throw error
			throw reply(error)
		} finally {
			close()
		}
	}

	const verify = async (signal: AbortSignal): Promise<void> => {
		if (signal.aborted) throw new Undelivered('timeout', true)

		let mailer: ReturnType<typeof createTransport> | undefined
		let socket: Socket | undefined
		let closed = false
		const own = (value: Socket) => {
			socket = value
			if (closed) value.destroy()
		}
		const close = () => {
			if (closed) return
			closed = true
			socket?.destroy()
			mailer?.close()
		}

		try {
			mailer = createTransport(settings(config, config.name ?? config.host, VERIFY_TIMEOUT, own))
			await bounded(mailer.verify(), signal, close)
		} catch (error) {
			if (error instanceof Undelivered) throw error
			throw reply(error)
		} finally {
			close()
		}
	}

	return Object.assign(send, {
		label: 'smtp',
		verify,
	})
}
