/** Email payload passed to the configured transport. */
export interface Mail {
	to: string
	subject: string
	text: string
	html?: string
}

/** Async mail transport used by send(). */
export type Transport = (mail: Mail) => Promise<void>

let transport: Transport = async (mail) => {
	console.log('📧 Email:', mail.to, '-', mail.subject)
	console.log(mail.text)
}

/** Sets the process-wide mail transport. */
export function configure(handler: Transport): void {
	transport = handler
}

/** Sends one email through the configured transport. */
export async function send(mail: Mail): Promise<void> {
	await transport(mail)
}
