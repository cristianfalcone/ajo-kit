import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { LoaderArgs } from '/src/app'
import { Button } from '/src/ui/button'
import { Image } from '/src/ui/image'

interface User {
	username: string
	firstName: string
	lastName: string
}

interface Comment {
	id: number
	body: string
	user?: User
}

interface Post {
	id: number
	title: string
	body: string
	userId: number
	user?: User
	comments: Comment[]
	imageUrl: string
}

export async function load({ params }: LoaderArgs) {

	const postRes = await fetch(`https://dummyjson.com/posts/${params.id}`)

	if (!postRes.ok) {
		if (postRes.status === 404) throw new Error('Post not found')
		throw new Error('Failed to load post')
	}

	const post = await postRes.json()

	const [userRes, commentsRes] = await Promise.all([
		fetch(`https://dummyjson.com/users/${post.userId}`),
		fetch(`https://dummyjson.com/posts/${post.id}/comments`),
	])

	if (!userRes.ok || !commentsRes.ok) throw new Error('Failed to load post data')

	const user = await userRes.json()
	const commentsJson = await commentsRes.json()
	const comments = commentsJson.comments ?? []

	const fullPost: Post = {
		...post,
		user,
		comments,
		imageUrl: `https://picsum.photos/seed/ajo-post-${post.id}/1200/700`
	}

	return { post: fullPost }
}

type Args = {
	params: { id: string }
	data: { post: Post }
}

const Comments: Stateful<{ list: Comment[] }> = function* (args) {

	let open = false

	const toggle = () => this.next(() => open = !open)

	while (true) yield (
		<>
			<button
				class={clsx(
					'inline-flex items-center gap-1 font-medium rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-400 px-2.5 py-1.5 text-xs',
					args.list.length === 0
						? 'bg-slate-900/5 text-slate-400 dark:bg-white/5 dark:text-gray-400 cursor-not-allowed'
						: 'bg-slate-900/10 hover:bg-slate-900/15 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-200'
				)}
				set:onclick={args.list.length === 0 ? undefined : toggle}
				disabled={args.list.length === 0}
			>
				{open ? 'Hide' : 'Show'} Comments ({args.list.length})
			</button>
			{open && (
				<ul class="space-y-3">
					{args.list.slice(0, 50).map(c => (
						<li key={c.id} class="panel p-4 space-y-1">
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium text-indigo-600 dark:text-indigo-300">{c.user?.username ?? 'user'}</span>
								<span class="text-xs text-slate-500 dark:text-gray-400/70">#{c.id}</span>
							</div>
							<p class="text-xs leading-relaxed text-slate-600 dark:text-gray-300/80">{c.body}</p>
						</li>
					))}
				</ul>
			)}
		</>
	)
}

Comments.attrs = { class: 'space-y-4' }

const Page: Stateful<Args, 'article'> = function* (args) {

	const { id, title, body, user, comments, imageUrl } = args.data.post

	while (true) yield (
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

Page.is = 'article'
Page.attrs = { class: 'py-14 max-w-4xl mx-auto space-y-10' }

export default Page
