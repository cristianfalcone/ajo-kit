import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import type { PostWithDetails, CommentWithUser } from '/src/data'
import { AuthContext } from '/src/constants'
import { action } from '/src/app'
import { Button } from '/src/ui/button'
import { Image } from '/src/ui/image'

export const defer = true

type Args = PageArgs<{ post: PostWithDetails }>

const CommentItem: Stateful<{
	comment: CommentWithUser
	isOwner: boolean
	onUpdate: (c: CommentWithUser) => void
	onDelete: (id: number) => void
}> = function* ({ comment, isOwner, onUpdate, onDelete }) {

	let editing = false
	let body = comment.body

	const edit = action<{ comment: CommentWithUser }>(this, 'editComment')
	const del = action<{ success: boolean }>(this, 'deleteComment')

	while (true) {

		if (edit.data?.comment) {
			const updated = edit.data.comment
			body = updated.body
			editing = false
			edit.reset()
			queueMicrotask(() => onUpdate(updated))
		}

		if (del.data?.success) {
			queueMicrotask(() => onDelete(comment.id))
			return
		}

		yield (
			<li class="panel p-4 space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-medium text-indigo-600 dark:text-indigo-300">
						{comment.user?.username ?? 'user'}
					</span>
					<div class="flex items-center gap-2 text-xs">
						<span class="text-slate-500 dark:text-gray-400/70">#{comment.id}</span>
						{isOwner && !editing && (
							<>
								<button
									class="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
									set:onclick={() => this.next(() => editing = true)}
								>
									Edit
								</button>
								<form set:onsubmit={del.handle}>
									<input type="hidden" name="commentId" value={comment.id} />
									<button
										type="submit"
										class="text-slate-500 hover:text-red-600 dark:hover:text-red-400"
										disabled={del.loading}
									>
										{del.loading ? '...' : 'Delete'}
									</button>
								</form>
							</>
						)}
					</div>
				</div>

				{editing ? (
					<form set:onsubmit={edit.handle} class="space-y-2">
						<input type="hidden" name="commentId" value={comment.id} />
						<textarea
							name="body"
							rows={3}
							maxlength={1000}
							required
							class="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							disabled={edit.loading}
						>{body}</textarea>
						{edit.error && <p class="text-xs text-red-600 dark:text-red-400">{edit.error}</p>}
						<div class="flex gap-2">
							<Button type="submit" variant="primary" size="xs" disabled={edit.loading}>
								{edit.loading ? 'Saving...' : 'Save'}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								set:onclick={() => this.next(() => { editing = false; edit.reset() })}
							>
								Cancel
							</Button>
						</div>
					</form>
				) : (
					<p class="text-xs leading-relaxed text-slate-600 dark:text-gray-300/80">{body}</p>
				)}

				{del.error && <p class="text-xs text-red-600 dark:text-red-400">{del.error}</p>}
			</li>
		)
	}
}

const Comments: Stateful<{ list: CommentWithUser[] }> = function* (args) {

	const { user } = AuthContext()

	let open = false
	let items = [...args.list]

	const toggle = () => this.next(() => open = !open)
	const add = action<{ comment: CommentWithUser }>(this, 'addComment')

	const handleUpdate = (updated: CommentWithUser) => this.next(() => {
		items = items.map(c => c.id === updated.id ? { ...updated, user: c.user } : c)
	})

	const handleDelete = (id: number) => this.next(() => {
		items = items.filter(c => c.id !== id)
	})

	while (true) {

		if (add.data?.comment) {
			items = [...items, add.data.comment]
			add.reset()
		}

		yield (
			<>
				<button
					class={clsx(
						'inline-flex items-center gap-1 font-medium rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-400 px-2.5 py-1.5 text-xs',
						'bg-slate-900/10 hover:bg-slate-900/15 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-200'
					)}
					set:onclick={toggle}
				>
					{open ? 'Hide' : 'Show'} Comments ({items.length})
				</button>

				{open && (
					<>
						{user ? (
							<form set:onsubmit={add.handle} class="panel p-4 space-y-3">
								<textarea
									name="body"
									rows={2}
									maxlength={1000}
									placeholder="Write a comment..."
									required
									class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									disabled={add.loading}
								/>
								{add.error && <p class="text-xs text-red-600 dark:text-red-400">{add.error}</p>}
								<div class="flex justify-end">
									<Button type="submit" variant="primary" size="xs" disabled={add.loading}>
										{add.loading ? 'Posting...' : 'Post'}
									</Button>
								</div>
							</form>
						) : (
							<p class="panel p-4 text-xs text-slate-600 dark:text-gray-400 text-center">
								<a href="/login" class="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign in</a> to leave a comment
							</p>
						)}

						<ul class="space-y-3">
							{items.slice(0, 50).map(c => (
								<CommentItem
									key={c.id}
									comment={c}
									isOwner={user?.id === c.userId}
									onUpdate={handleUpdate}
									onDelete={handleDelete}
								/>
							))}
						</ul>
					</>
				)}
			</>
		)
	}
}

Comments.attrs = { class: 'space-y-4' }

const PostSkeleton = () => (
	<>
		<div class="flex items-center justify-between">
			<div class="h-8 w-16 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
			<div class="h-4 w-32 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
		</div>
		<div class="rounded-xl overflow-hidden aspect-16/9 bg-slate-200 dark:bg-white/10 animate-pulse" />
		<header class="space-y-4">
			<div class="h-10 w-3/4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
			<div class="space-y-2">
				<div class="h-4 w-full rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
				<div class="h-4 w-2/3 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
			</div>
		</header>
		<div class="panel p-6 space-y-3">
			<div class="h-4 w-full rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
			<div class="h-4 w-full rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
			<div class="h-4 w-5/6 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
			<div class="h-4 w-4/5 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
		</div>
		<div class="h-8 w-40 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
	</>
)

const Page: Stateful<Args, 'article'> = function* (args) {

	while (true) {

		if (args.loading) {
			yield <PostSkeleton />
			continue
		}

		if (args.error) {
			yield (
				<div class="text-center py-20 space-y-4">
					<p class="text-red-600 dark:text-red-400">{args.error.message}</p>
					<Button href="/blog" variant="ghost" size="sm">Back to Blog</Button>
				</div>
			)
			continue
		}

		const { id, title, body, user, comments, imageUrl } = args.data!.post

		yield (
			<>
				<div class="flex items-center justify-between">
					<Button href="/blog" variant="ghost" size="xs">Back</Button>
					{user && <span class="text-xs text-indigo-600/80 dark:text-indigo-300/80">By {user.firstName} {user.lastName}</span>}
				</div>
				<div class="rounded-xl overflow-hidden">
					<Image src={imageUrl} alt={title} aspect="16/9" />
				</div>
				<header class="space-y-4">
					<h1 class="text-4xl font-bold tracking-tight leading-tight text-balance text-slate-900 dark:text-white">{title}</h1>
					<p class="text-sm text-slate-600 dark:text-gray-400/80">{body.slice(0, 140)}...</p>
				</header>
				<div class="panel p-6 space-y-4">
					<p class="text-sm leading-relaxed text-slate-700 dark:text-gray-300/80" set:innerHTML={body} skip />
				</div>
				<Comments list={comments} />
				<footer class="pt-6 border-t border-slate-200 dark:border-white/10 text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400/60">Post #{id}</footer>
			</>
		)
	}
}

Page.is = 'article'
Page.attrs = { class: 'py-14 max-w-4xl mx-auto space-y-10' }

export default Page
