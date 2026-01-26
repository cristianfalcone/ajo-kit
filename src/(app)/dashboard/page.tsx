import type { PageArgs } from '/src/constants'

type Data = {
	user?: { id: number; name: string; email: string }
	timestamp?: number
}

export default ({ data, loading }: PageArgs<Data>) => (
	<section class="py-8">
		<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">
			Dashboard
		</h1>
		<div class="rounded-xl ring-1 ring-slate-200/70 dark:ring-white/10 bg-white/60 dark:bg-white/5 backdrop-blur p-6">
			{loading ? (
				<p class="text-slate-600 dark:text-gray-300">Loading...</p>
			) : (
				<div class="space-y-2">
					<p class="text-slate-600 dark:text-gray-300">
						Welcome back, <strong>{data?.user?.name || 'User'}</strong>!
					</p>
					<p class="text-sm text-slate-500 dark:text-gray-400">
						Email: {data?.user?.email}
					</p>
					<p class="text-xs text-slate-400 dark:text-gray-500 font-mono">
						Timestamp: {data?.timestamp}
					</p>
				</div>
			)}
		</div>
	</section>
)
