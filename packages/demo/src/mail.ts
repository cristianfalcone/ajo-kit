import { env } from 'ajo-kit/platform'
import { configure } from 'ajo-kit-mail'
import { capture } from 'ajo-kit-mail/capture'

// Production has no transport, so every delivery is refused with 'no-transport'.
// Development logs id, kind and recipient domain only, and retains nothing.
if (env('NODE_ENV') !== 'production') {
	configure({
		from: { name: 'Ajo Kit', address: 'no-reply@example.com' },
		transport: capture({ log: true, keep: 0 }),
	})
}
