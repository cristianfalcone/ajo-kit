import type { Stateful } from 'ajo'
import { type Props, date } from '@kit'
import { action } from '@kit/client'
import { Alert, Button, Checkbox, Feedback, Input, Panel, Table, type Column } from '/src/ui'
import { options } from '/src/abilities'

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

const Tokens: Stateful<Props<Data>> = function* (args) {

	const createForm = action<CreateResult>('make')
	const revokeForm = action<RevokeResult>('revoke')

	for (args of this) {

		const tokens = args.data?.tokens ?? []
		const columns = [
			{
				header: 'Token',
				cell: (token) => (
					<>
						<div class="font-medium text-slate-900 dark:text-white">{token.name}</div>
						<div class="text-slate-400 font-mono text-xs">****{token.id}</div>
					</>
				),
			},
			{
				header: 'Abilities',
				cell: (token) => (
					<span class="text-slate-600 dark:text-slate-300">
						{token.abilities.includes('*') ? 'Full access' : token.abilities.join(', ')}
					</span>
				),
			},
			{
				header: 'Last Used',
				tone: 'muted',
				cell: (token) => token.last ? date(token.last, shortDate) : 'Never',
			},
			{
				header: 'Actions',
				align: 'right',
				cell: (token) => (
					<form set:onsubmit={revokeForm.submit}>
						<input type="hidden" name="id" value={token.id} />
						<Button
							type="submit"
							title="Revoke this token"
							disabled={revokeForm.loading}
							icon="i-lucide-trash-2"
							tone="danger"
						/>
					</form>
				),
			},
		] satisfies Column<Token>[]

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
					<Alert>
						<p class="text-sm font-medium mb-2">
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
					</Alert>
				)}

				<Panel>
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
						Create New Token
					</h2>

					<form set:onsubmit={createForm.submit} class="space-y-4">
						<Input
							name="name"
							label="Token Name"
							required
							placeholder="e.g., CI/CD Pipeline"
							width="sm"
							disabled={createForm.loading}
						/>

						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
								Abilities
							</label>
							<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
								Leave empty for full access, or select specific abilities.
							</p>
							<div class="flex flex-wrap gap-3">
								{options.map(ability => (
									<Checkbox key={ability.value} name="abilities" value={ability.value} label={ability.label} />
								))}
							</div>
						</div>

						{createForm.error && (
							<Feedback>{createForm.error.message}</Feedback>
						)}

						<Button
							type="submit"
							disabled={createForm.loading}
						>
							{createForm.loading ? 'Creating...' : 'Create Token'}
						</Button>
					</form>
				</Panel>

				{tokens.length > 0 && (
					<Panel padding="none" clip>
						<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
							<h2 class="text-lg font-semibold text-slate-900 dark:text-white">
								Existing Tokens
							</h2>
						</div>
						<Table rows={tokens} columns={columns} getKey={token => token.id} />
					</Panel>
				)}
			</div>
		)
	}
}

export default Tokens
