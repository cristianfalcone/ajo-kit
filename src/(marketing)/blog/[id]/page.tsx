import clsx from 'clsx'
import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import type { PostWithDetails, CommentWithUser } from '/src/data'
import { Button } from '/src/ui/button'
import { Image } from '/src/ui/image'

export const defer = true

type Args = PageArgs<{ post: PostWithDetails }>

const Comments: Stateful<{ list: CommentWithUser[] }> = function* (args) {

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
