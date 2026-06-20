import type { Stateful } from 'ajo'
import { type Props, date } from '@kit'
import { action } from '@kit/client'
import { Button, Pager, Panel, Table, type Column } from '/src/ui'

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

type Info = Parameters<typeof Pager>[0]['page']
type Data = { tokens: Token[]; page: Info }
type FormResult = { revoked: boolean }

const Tokens: Stateful<Props<Data>> = function* (args) {

	const form = action<FormResult>()

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
				header: 'User',
				cell: (token) => (
					<>
						<div class="text-slate-900 dark:text-white">{token.userName}</div>
						<div class="text-slate-500 dark:text-slate-400 text-xs">{token.email}</div>
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
				cell: (token) => token.last ? date(token.last) : 'Never',
			},
			{
				header: 'Actions',
				align: 'right',
				cell: (token) => (
					<form set:onsubmit={form.submit}>
						<input type="hidden" name="id" value={token.id} />
						<Button
							type="submit"
							title="Revoke this token"
							disabled={form.loading}
							icon="i-lucide-trash-2"
							tone="danger"
						/>
					</form>
				),
			},
		] satisfies Column<Token>[]

		yield (
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white">API Tokens</h2>
					<span class="text-sm text-slate-500 dark:text-slate-400">{tokens.length} shown</span>
				</div>

				{tokens.length === 0 ? (
					<Panel padding="lg" class="text-center">
						<span class="i-lucide-key w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
						<p class="text-slate-500 dark:text-slate-400">No API tokens created yet</p>
					</Panel>
				) : (
					<Panel padding="none" clip>
						<Table rows={tokens} columns={columns} getKey={token => token.id} />
						{args.data?.page && <Pager page={args.data.page} count={tokens.length} label="tokens" />}
					</Panel>
				)}
			</div>
		)
	}
}

export default Tokens
