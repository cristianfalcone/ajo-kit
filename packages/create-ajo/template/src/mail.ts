import { env } from 'ajo-kit/platform'
import { configure } from 'ajo-kit-mail'
import { capture } from 'ajo-kit-mail/capture'
import { http } from 'ajo-kit-mail/http'

const names = ['MAIL_FROM', 'MAIL_URL', 'MAIL_TOKEN']
const missing = names.filter(name => !env(name))

/** Development captures mail in memory; production has no mailbox. */
export const mailbox = env('NODE_ENV') === 'production' ? null : capture({ keep: 20 })

/**
 * Why mail is off in production while no MAIL_* value is set; null when mail can be sent.
 * Nothing is configured then, so ajo-kit-mail refuses every send with `no-transport`.
 */
export const refusal = !mailbox && missing.length === names.length
	? 'Mail is not set up yet: the host owner adds MAIL_FROM, MAIL_URL and MAIL_TOKEN in the admin Secrets screen.'
	: null

if (mailbox) {
	configure({ from: env('MAIL_FROM') || 'notes@example.test', transport: mailbox })
} else if (!refusal) {
	if (missing.length) throw new Error(`Missing ${missing.join(', ')}: set every MAIL_* value, or none to leave mail off`)
	const endpoint = new URL(env('MAIL_URL')!)
	if (endpoint.protocol !== 'https:') throw new Error('MAIL_URL must use HTTPS')
	configure({
		from: env('MAIL_FROM')!,
		transport: http({
			url: endpoint.href,
			headers: () => ({ Authorization: `Bearer ${env('MAIL_TOKEN')}` }),
			body: mail => ({
				from: mail.from.name ? `${mail.from.name} <${mail.from.address}>` : mail.from.address,
				to: mail.to.address,
				subject: mail.subject,
				text: mail.text,
			}),
		}),
	})
}
