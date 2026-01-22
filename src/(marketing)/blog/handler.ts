import type { Request } from 'polka'
import { posts } from '/src/data'
import { v, parse, email } from '/src/schemas'

export async function page() {
	return {
		posts: await posts.all(18),
		time: new Date().toISOString(),
	}
}

const Subscribe = v.object({ email })

export async function subscribe(req: Request) {

	const input = parse(Subscribe, req.body)

	console.log(`Newsletter subscription: ${input.email}`)

	return { success: true, email: input.email }
}
