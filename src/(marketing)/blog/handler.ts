import type { Request, Response } from 'polka'
import { posts } from '/src/data'

// Server-only data loading for the blog page
export async function page() {
	return {
		posts: await posts.all(18),
		time: new Date().toISOString(),
	}
}

// Example form action for newsletter subscription
export async function subscribe(req: Request, res: Response) {

	const { body } = req
	const email = body.email as string

	if (!email || !email.includes('@')) {
		throw new Error('Invalid email address')
	}

	// Simulate server processing
	console.log(`Newsletter subscription: ${email}`)

	return { success: true, email }
}
