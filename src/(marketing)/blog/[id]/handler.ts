import type { HandlerArgs } from '/src/constants'
import { NotFoundError } from '/src/constants'
import { posts } from '/src/data'

export async function page({ params }: HandlerArgs) {
	const post = await posts.find(Number(params.id))
	if (!post) throw new NotFoundError('Post not found')
	return { post }
}
