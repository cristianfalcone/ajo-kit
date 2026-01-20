import type { Action, HandlerArgs } from '/src/constants'
import { posts } from '/src/data'

// Server-only data loading for the blog page
export async function page({}: HandlerArgs) {
	return {
		posts: await posts.all(18),
		time: new Date().toISOString(),
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
