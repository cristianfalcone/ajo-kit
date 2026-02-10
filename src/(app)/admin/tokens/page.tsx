import type { Stateful } from 'ajo'
import { type PageArgs, formatDate } from '@kit'
import { action, subscribe } from '@kit/client'

type Token = {
	id: string
	name: string
	abilities: string[]
	last: string | null
	expiry: string | null
	created: string
	userName: string
	email: string
}

type Data = { tokens: Token[] }
type FormResult = { revoked: boolean }

const Tokens: Stateful<PageArgs<Data>> = function* (args) {

	const form = action<FormResult>()

	let tokens = args.data?.tokens ?? []

	subscribe<Data>('tokens', ({ data, error }) => {
		if (error) return
		tokens = data!.tokens
	})

	while (true) {

		yield (
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white">API Tokens</h2>
					<span class="text-sm text-slate-500 dark:text-slate-400">{tokens.length} total</span>
				</div>

				{tokens.length === 0 ? (
					<div class="glass rounded-lg p-8 text-center">
						<span class="i-lucide-key w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
						<p class="text-slate-500 dark:text-slate-400">No API tokens created yet</p>
					</div>
				) : (
					<div class="glass ring-0 rounded-lg overflow-hidden">
						<table class="w-full text-sm">
							<thead>
								<tr>
									<th>Token</th>
									<th>User</th>
									<th>Abilities</th>
									<th>Last Used</th>
									<th class="text-right">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200 dark:divide-slate-700">
								{tokens.map(token => (
									<tr key={token.id} class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
										<td class="px-4 py-3">
											<div class="font-medium text-slate-900 dark:text-white">{token.name}</div>
											<div class="text-slate-400 font-mono text-xs">****{token.id}</div>
										</td>
										<td class="px-4 py-3">
											<div class="text-slate-900 dark:text-white">{token.userName}</div>
											<div class="text-slate-500 dark:text-slate-400 text-xs">{token.email}</div>
										</td>
										<td class="px-4 py-3">
											<span class="text-slate-600 dark:text-slate-300">
												{token.abilities.includes('*') ? 'Full access' : token.abilities.join(', ')}
											</span>
										</td>
										<td class="px-4 py-3 text-slate-500 dark:text-slate-400">
											{token.last ? formatDate(token.last) : 'Never'}
										</td>
										<td class="px-4 py-3 text-right">
											<form set:onsubmit={form.handle}>
												<input type="hidden" name="id" value={token.id} />
												<button
													type="submit"
													title="Revoke this token"
													disabled={form.loading}
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
