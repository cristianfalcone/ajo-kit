import type { Stateful } from 'ajo'
import type { HandlerArgs, PageArgs } from '/src/constants'
import { action } from '/src/app'
import { Image } from '/src/ui/image'

interface User {
	id: number
	username: string
}

interface Post {
	id: number
	title: string
	body: string
	userId: number
	user?: User
	imageUrl: string
}

export async function handler({}: HandlerArgs) {

	const [postsRes, usersRes] = await Promise.all([
		fetch('https://dummyjson.com/posts?limit=18'),
		fetch('https://dummyjson.com/users?limit=100'),
	])

	if (!postsRes.ok || !usersRes.ok) throw new Error('Failed to load posts')

	const postsJson = await postsRes.json()
	const usersJson = await usersRes.json()
	const rawPosts = postsJson.posts as any[]
	const users = usersJson.users as any[]

	const posts: Post[] = rawPosts.map(p => ({
		...p,
		user: users.find(u => u.id === p.userId),
		imageUrl: `https://picsum.photos/seed/ajo-post-${p.id}/600/400`,
	}))

	return { posts }
}

type Args = PageArgs<{ posts: Post[]; time?: string; source?: string }>

const Page: Stateful<Args, 'article'> = function* (args) {

	const subscribe = action<{ success: boolean; email: string }>(this, 'subscribe')

	while (true) {

		const { posts, time, source } = args.data!

		yield (
			<>
				<header class="text-center space-y-4 max-w-3xl mx-auto">
					<h1 class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Latest Posts</h1>
					<p class="text-sm text-indigo-600/70 dark:text-indigo-200/70">Fresh updates pulled from a public sample API.</p>
					{time && (
						<p class="text-xs text-slate-500 dark:text-gray-400">
							Server time: {time} (from {source})
						</p>
					)}
				</header>

				<form set:onsubmit={subscribe.handle} class="max-w-md mx-auto flex flex-col gap-2">
					<div class="flex gap-2">
						<input
							type="email"
							name="email"
							placeholder="Subscribe to newsletter"
							disabled={subscribe.loading}
							class="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 disabled:opacity-50"
						/>
						<button
							type="submit"
							disabled={subscribe.loading}
							class="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
						>
							{subscribe.loading ? 'Subscribing...' : 'Subscribe'}
						</button>
					</div>
					{subscribe.data && (
						<p class="text-sm text-green-600 dark:text-green-400">
							Subscribed: {subscribe.data.email}
						</p>
					)}
					{subscribe.error && (
						<p class="text-sm text-red-600 dark:text-red-400">
							{subscribe.error}
						</p>
					)}
				</form>
			<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{posts.map(post => (
					<li key={post.id}>
						<a href={`/blog/${post.id}`} class="group flex flex-col h-full rounded-xl bg-slate-900/5 ring-1 ring-slate-200 overflow-hidden hover:ring-indigo-500/40 hover:bg-indigo-500/5 dark:bg-white/5 dark:ring-white/10 dark:hover:ring-indigo-400/40 dark:hover:bg-white/[0.07] transition">
							<Image
								src={post.imageUrl}
								alt={post.title}
								aspect="4/3"
								class="group-hover:scale-105 duration-500 transition-transform"
							/>
							<div class="flex flex-1 flex-col p-5 gap-3">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="text-xs uppercase tracking-wider text-indigo-600/70 dark:text-indigo-300/70">Post {post.id}</span>
									{post.user && <span class="text-xs text-slate-500 dark:text-gray-400/70">{post.user.username}</span>}
								</div>
								<h2 class="font-medium leading-snug text-sm text-slate-800 group-hover:text-slate-900 dark:text-gray-100 dark:group-hover:text-white line-clamp-2">
									{post.title}
								</h2>
								<p class="text-xs text-slate-600 dark:text-gray-400/80 line-clamp-3">
									{post.body}
								</p>
							</div>
						</a>
					</li>
				))}
			</ul>
		</>
		)
	}
}

Page.is = 'article'
Page.attrs = { class: 'py-10 space-y-12' }

export default Page
