import type { Request } from 'polka'
import { NotFoundError } from '/src/constants'
import { posts } from '/src/data'

export async function page(req: Request) {
	const { params } = req
	const post = await posts.find(Number(params.id))
	if (!post) throw new NotFoundError('Post not found')
	return { post }
}
