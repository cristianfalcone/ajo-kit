import type { Request } from 'polka'
import { NotFoundError, ForbiddenError, UnauthorizedError } from '/src/constants'
import { posts, comments, users } from '/src/data'
import { v, parse, numeric, body } from '/src/schemas'

const AddComment = v.object({ body })
const EditComment = v.object({ commentId: numeric, body })
const DeleteComment = v.object({ commentId: numeric })

export async function page(req: Request) {
	const { id } = parse(v.object({ id: numeric }), req.params)
	const post = await posts.find(id)
	if (!post) throw new NotFoundError('Post not found')
	return { post }
}

export async function addComment(req: Request) {

	if (!req.auth) throw new UnauthorizedError()

	const { id } = parse(v.object({ id: numeric }), req.params)

	const input = parse(AddComment, req.body)

	const post = await posts.find(id)

	if (!post) throw new NotFoundError('Post not found')

	const comment = await comments.create({ postId: id, userId: req.auth.id, body: input.body })
	const user = await users.find(req.auth.id)

	return { comment: { ...comment, user } }
}

export async function editComment(req: Request) {

	if (!req.auth) throw new UnauthorizedError()

	const { commentId, body: newBody } = parse(EditComment, req.body)

	const comment = await comments.find(commentId)

	if (!comment) throw new NotFoundError('Comment not found')
	if (comment.userId !== req.auth.id) throw new ForbiddenError()

	const updated = await comments.update(commentId, newBody)

	return { comment: updated }
}

export async function deleteComment(req: Request) {

	if (!req.auth) throw new UnauthorizedError()

	const { commentId } = parse(DeleteComment, req.body)

	const comment = await comments.find(commentId)

	if (!comment) throw new NotFoundError('Comment not found')
	if (comment.userId !== req.auth.id) throw new ForbiddenError()

	await comments.remove(commentId)

	return { success: true }
}
