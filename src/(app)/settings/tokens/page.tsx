import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action, invalidate } from '/src/app'

type Token = {
	id: string
	name: string
	abilities: string[]
	last: string | null
	created: string
}

type Data = { tokens: Token[] }
type CreateResult = { token: string }
type RevokeResult = { revoked: boolean }

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString(undefined, {
		month: 'short', day: 'numeric'
	})
}

const Tokens: Stateful<PageArgs<Data>> = function* (args) {
	const createForm = action<CreateResult>('make')
	const revokeForm = action<RevokeResult>('revoke')

	while (true) {
		if (revokeForm.data?.revoked) {
			invalidate('tokens')
			revokeForm.reset()
		}

		const tokens = args.data?.tokens ?? []

		yield (
			<div class="space-y-8">
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
						API Tokens
					</h1>
					<p class="text-sm text-slate-600 dark:text-slate-400">
						Create and manage API tokens for programmatic access.
					</p>
				</div>

				{createForm.data?.token && (
					<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
						<p class="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
							Token created! Copy it now - it won't be shown again.
						</p>
						<code class="block p-3 bg-green-100 dark:bg-green-900/40 rounded text-sm font-mono break-all">
							{createForm.data.token}
						</code>
					</div>
				)}

				<div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
						Create New Token
					</h2>

					<form set:onsubmit={createForm.handle} class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
								Token Name
							</label>
							<input
								type="text"
								name="name"
								required
								placeholder="e.g., CI/CD Pipeline"
								class="w-full max-w-sm px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
								disabled={createForm.loading}
							/>
						</div>

						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
								Abilities
							</label>
							<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
								Leave empty for full access, or select specific abilities.
							</p>
							<div class="flex flex-wrap gap-3">
								{['read', 'write', 'delete'].map(ability => (
									<label key={ability} class="inline-flex items-center gap-1.5">
										<input type="checkbox" name="abilities" value={ability} class="rounded" />
										<span class="text-sm text-slate-700 dark:text-slate-300">{ability}</span>
									</label>
								))}
							</div>
						</div>

						{createForm.error && (
							<p class="text-sm text-red-600">{createForm.error.message}</p>
						)}

						<button
							type="submit"
							disabled={createForm.loading}
							class="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-medium rounded-lg transition"
						>
							{createForm.loading ? 'Creating...' : 'Create Token'}
						</button>
					</form>
				</div>

				{tokens.length > 0 && (
					<div class="bg-white dark:bg-slate-800 rounded-lg shadow">
						<div class="p-6 border-b border-slate-200 dark:border-slate-700">
							<h2 class="text-lg font-semibold text-slate-900 dark:text-white">
								Existing Tokens
							</h2>
						</div>
						<ul class="divide-y divide-slate-200 dark:divide-slate-700">
							{tokens.map(token => (
								<li key={token.id} class="p-4 flex items-center justify-between">
									<div>
										<div class="font-medium text-slate-900 dark:text-white">
											{token.name}
											<span class="ml-2 text-xs font-mono text-slate-500">
												****{token.id}
											</span>
										</div>
										<div class="text-sm text-slate-500 dark:text-slate-400">
											{token.abilities.includes('*') ? 'Full access' : token.abilities.join(', ')}
											{token.last && ` · Last used ${formatDate(token.last)}`}
										</div>
									</div>
									<form set:onsubmit={revokeForm.handle}>
										<input type="hidden" name="id" value={token.id} />
										<button
											type="submit"
											disabled={revokeForm.loading}
											class="text-sm text-red-600 hover:text-red-500"
										>
											Revoke
										</button>
									</form>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		)
	}
}

export default Tokens
