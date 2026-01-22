import type { Request } from 'polka'
import { object } from 'valibot'
import { posts, parse, email } from '/src/data'

export async function page() {
	return {
		posts: await posts.all(18),
		time: new Date().toISOString(),
	}
}

const Subscribe = object({ email })

export async function subscribe(req: Request) {

	const input = parse(Subscribe, req.body)

	console.log(`Newsletter subscription: ${input.email}`)

	return { success: true, email: input.email }
}
