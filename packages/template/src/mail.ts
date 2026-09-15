import { env } from 'ajo-kit/platform'
import { configure } from 'ajo-kit-mail'
import { capture } from 'ajo-kit-mail/capture'
import { http } from 'ajo-kit-mail/http'

const required = (name: string) => {
	const value = env(name)
	if (!value) throw new Error(`Missing ${name}`)
	return value
}

export const mailbox = env('NODE_ENV') === 'production' ? null : capture({ keep: 20 })
const sender = mailbox ? env('MAIL_FROM') ?? 'notes@example.test' : required('MAIL_FROM')
const endpoint = mailbox ? null : new URL(required('MAIL_URL'))
if (endpoint && endpoint.protocol !== 'https:') throw new Error('MAIL_URL must use HTTPS')

configure({
	from: sender,
	transport: mailbox ?? http({
		url: endpoint!.href,
		headers: () => ({ Authorization: `Bearer ${required('MAIL_TOKEN')}` }),
		body: mail => ({
			from: mail.from.name ? `${mail.from.name} <${mail.from.address}>` : mail.from.address,
			to: mail.to.address,
			subject: mail.subject,
			text: mail.text,
		}),
	}),
})
