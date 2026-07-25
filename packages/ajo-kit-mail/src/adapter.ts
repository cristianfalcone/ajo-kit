import type { Transport as KitTransport } from 'ajo-kit/mail'
import { configure, deliver, type Options } from './index'

/** Configures ajo-kit-mail and returns a transport for ajo-kit's mail seam. */
export function adapter(options: Options): KitTransport {
	configure(options)

	return async mail => {
		const outcome = await deliver({
			to: mail.to,
			subject: mail.subject,
			text: mail.text,
			...(mail.html !== undefined && { html: mail.html }),
		})

		if (!outcome.ok) throw outcome.error
	}
}
