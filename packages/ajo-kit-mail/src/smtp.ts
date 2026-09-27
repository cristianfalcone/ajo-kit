// Node-only by design. The ajo package-export condition blocks this subpath,
// and these static builtins make a forced source import fail the engine graph audit.
import { isIP, Socket } from 'node:net'
import { connect as connectTls } from 'node:tls'
import { createTransport } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { Refused, Undelivered, classify } from './errors'
import type { Receipt, Transport } from './index'
import { domain, type Sealed } from './seal'

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

type SocketOptions = {
	readonly connection: Socket
	readonly secured?: boolean
}

type SocketCallback = (error: Error | null, options?: SocketOptions) => void

const connector = (
	host: string,
	port: number,
	implicit: boolean,
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
		// A socket closed before it connected (an error, or close() on abort)
		// fails the send instead of leaving nodemailer waiting for this callback.
		const fail = () => finish(Object.assign(new Error('SMTP connection failed'), {
			code: implicit ? 'ETLS' : 'ESOCKET',
		}))

		if (implicit) {
			socket = connectTls({
				host,
				port,
				...(isIP(host) === 0 && { servername: host }),
				rejectUnauthorized: true,
				minVersion: 'TLSv1.2',
			}, () => finish(null, {
				connection: socket,
				secured: true,
			}))
		} else {
			socket = new Socket()
			socket.connect(port, host, () => finish(null, {
				connection: socket,
			}))
		}

		own(socket)
		socket.on('error', fail).once('close', fail)
	}

const remaining = (deadline: number) => {
	const value = Math.ceil(deadline - Date.now())
	return value > 0 ? Math.min(value, 2_147_483_647) : 0
}

/**
 * Creates a one-connection-per-message SMTP transport with mandatory verified
 * TLS, deadline-derived socket timeouts and sanitized failure classifications.
 */
export function smtp(options: SmtpOptions): Transport {
	const { host, port = 587, implicit = false, user, pass } = options

	if (!Number.isInteger(port) || port < 1 || port > 65_535 || (user === undefined) !== (pass === undefined)) {
		throw new Refused('invalid-config')
	}

	return async (mail: Sealed): Promise<Receipt | void> => {
		const timeout = remaining(mail.deadline)
		if (!timeout) throw new Undelivered('timeout')

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

		mail.signal.addEventListener('abort', close, { once: true })

		const settings: SMTPTransport.Options = {
			host,
			port,
			secure: implicit,
			requireTLS: !implicit,
			opportunisticTLS: false,
			name: options.name ?? domain(mail.from.address),
			...(user !== undefined && { auth: { user, pass: pass! } }),
			connectionTimeout: timeout,
			greetingTimeout: timeout,
			socketTimeout: timeout,
			dnsTimeout: timeout,
			tls: {
				rejectUnauthorized: true,
				minVersion: 'TLSv1.2',
			},
			// Nodemailer copies both onto every message it builds.
			disableFileAccess: true,
			disableUrlAccess: true,
			getSocket: connector(host, port, implicit, own),
		}

		try {
			mailer = createTransport(settings)
			const result = await mailer.sendMail({
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
			}) as { messageId?: unknown }

			return typeof result.messageId === 'string' && result.messageId
				? { id: result.messageId }
				: undefined
		} catch (error) {
			if (mail.signal.aborted) throw new Undelivered('timeout')
			// Nodemailer reports a socket lost during the STARTTLS handshake as ESOCKET at CONN.
			const { code, command } = (error ?? {}) as { code?: unknown, command?: unknown }
			throw classify(code === 'ESOCKET' && command === 'CONN' ? { code: 'ETLS' } : error)
		} finally {
			mail.signal.removeEventListener('abort', close)
			close()
		}
	}
}
