import type { Stateful } from 'ajo'
import { type PageArgs, formatDate } from '@kit'
import { action } from '@kit/client'
import Checkbox from '/src/ui/checkbox'
import { apiAbilityOptions } from '/src/abilities'

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

const shortDate = { month: 'short', day: 'numeric' } as const

const Tokens: Stateful<PageArgs<Data>> = function* (args) {

	const createForm = action<CreateResult>('make')
	const revokeForm = action<RevokeResult>('revoke')

	for (args of this) {

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
						<div class="flex items-stretch">
							<code class="flex-1 p-3 bg-green-100 dark:bg-green-900/40 rounded-l text-sm font-mono break-all">
								{createForm.data.token}
							</code>
							<button
								type="button"
								set:onclick={() => {
									if (createForm.data?.token) {
										navigator.clipboard.writeText(createForm.data.token)
									}
									createForm.reset()
								}}
								class="px-3 py-2 bg-green-700 hover:bg-green-800 dark:bg-green-800 dark:hover:bg-green-900 text-white text-sm font-medium rounded-r transition-colors whitespace-nowrap"
							>
								Copy and close
							</button>
						</div>
					</div>
				)}

				<div class="glass rounded-lg p-6">
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
						Create New Token
					</h2>

					<form set:onsubmit={createForm.submit} class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
								Token Name
							</label>
							<input
								type="text"
								name="name"
								required
								placeholder="e.g., CI/CD Pipeline"
								class="w-full max-w-sm input"
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
								{apiAbilityOptions.map(ability => (
									<Checkbox key={ability.value} name="abilities" value={ability.value} label={ability.label} />
								))}
							</div>
						</div>

						{createForm.error && (
							<p class="text-sm text-red-600">{createForm.error.message}</p>
						)}

						<button
							type="submit"
							disabled={createForm.loading}
							class="btn"
						>
							{createForm.loading ? 'Creating...' : 'Create Token'}
						</button>
					</form>
				</div>

				{tokens.length > 0 && (
					<div class="glass ring-0 rounded-lg overflow-hidden">
						<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
							<h2 class="text-lg font-semibold text-slate-900 dark:text-white">
								Existing Tokens
							</h2>
						</div>
						<table class="w-full text-sm">
								<thead>
									<tr>
										<th class="px-6">Token</th>
										<th>Abilities</th>
										<th>Last Used</th>
										<th class="px-6 text-right">Actions</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200 dark:divide-slate-700">
									{tokens.map(token => (
										<tr key={token.id} class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
											<td class="px-6 py-3">
												<div class="font-medium text-slate-900 dark:text-white">{token.name}</div>
												<div class="text-slate-400 font-mono text-xs">****{token.id}</div>
											</td>
											<td class="px-4 py-3">
												<span class="text-slate-600 dark:text-slate-300">
													{token.abilities.includes('*') ? 'Full access' : token.abilities.join(', ')}
												</span>
											</td>
											<td class="px-4 py-3 text-slate-500 dark:text-slate-400">
												{token.last ? formatDate(token.last, shortDate) : 'Never'}
											</td>
											<td class="px-6 py-3 text-right">
												<form set:onsubmit={revokeForm.submit}>
													<input type="hidden" name="id" value={token.id} />
													<button
														type="submit"
														title="Revoke this token"
														disabled={revokeForm.loading}
														class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
													>
														<span class="i-lucide-trash-2 w-4 h-4 block" />
													</button>
												</form>
											</td>
										</tr>
									))}
								</tbody>
						</table>
					</div>
				)}
			</div>
		)
	}
}

export default Tokens
