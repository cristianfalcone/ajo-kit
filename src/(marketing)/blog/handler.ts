import type { Action } from '/src/constants'

// Server-only data loading for the blog page
export async function page() {

	// Example: load server-side metadata that merges with page's handler()
	return {
		time: new Date().toISOString(),
		source: 'handler.ts'
	}
}

// Example form action for newsletter subscription
export async function subscribe({ body }: Action) {

	const email = body.email as string

	if (!email || !email.includes('@')) {
		throw new Error('Invalid email address')
	}

	// Simulate server processing
	console.log(`Newsletter subscription: ${email}`)

	return { success: true, email }
}
