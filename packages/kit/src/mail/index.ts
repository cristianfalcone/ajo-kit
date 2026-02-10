export interface Mail {
	to: string
	subject: string
	text: string
	html?: string
}

export type Transport = (mail: Mail) => Promise<void>

let transport: Transport = async (mail) => {
	console.log('📧 Email:', mail.to, '-', mail.subject)
	console.log(mail.text)
}

export function configure(handler: Transport): void {
	transport = handler
}

export async function send(mail: Mail): Promise<void> {
	await transport(mail)
}
