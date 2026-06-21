import type { Stateful, Stateless } from 'ajo'
import clsx from 'clsx'
import { type Props, date } from '@kit'
import { action } from '@kit/client'
import { Alert, Button, Checkbox, Feedback, Input, Panel, Table, type Column } from '/src/ui'
import { can, groups } from '/src/abilities'

type Token = {
	id: string
	name: string
	abilities: string[]
	last: string | null
	created: string
}

type Data = { tokens: Token[], grantable: string[] }
type CreateResult = { token: string }
type RevokeResult = { revoked: boolean }

const shortDate = { month: 'short', day: 'numeric' } as const

type FullProps = {
	checked: boolean
	disabled?: boolean
	literal?: boolean
	onToggle: () => void
}

const FullAccess: Stateless<FullProps> = ({ checked, disabled, literal, onToggle }) => (
	<Checkbox
		name="selected"
		value="*"
		label={<>Full access {literal && <span class="font-medium text-slate-500 dark:text-slate-400">(*)</span>}</>}
		checked={checked}
		disabled={disabled}
		onToggle={onToggle}
		labelClass="font-semibold leading-5 text-slate-900 dark:text-white"
		attr:class={clsx(
			'group flex h-10 items-center gap-3 rounded-lg px-4 select-none shadow-xs shadow-slate-900/7 inset-ring transition dark:shadow-none',
			checked
				? 'bg-accent/10 inset-ring-accent text-slate-900 dark:bg-accent/15 dark:text-white dark:inset-ring-accent'
				: 'bg-[#fbfdfb]/55 inset-ring-slate-900/12 text-slate-800 hover:bg-[#fbfdfb]/85 dark:bg-white/4 dark:text-slate-200 dark:inset-ring-white/12 dark:hover:bg-white/8',
			disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
		)}
	/>
)

const options = (grantable: readonly string[]) => groups
	.map(group => ({
		label: group.label,
		wildcard: group.wildcard,
		abilities: grantable.includes('*')
			? [...group.abilities]
			: group.abilities.filter(ability => can(grantable, ability)),
	}))
	.filter(group => group.abilities.length > 0)

const AbilityPicker: Stateful<{ grantable: string[], error?: string, loading?: boolean }> = function* ({ grantable }) {

	const available = options(grantable)
	const abilities = available.flatMap(group => group.abilities)
	let selected = new Set<string>(abilities)

	const complete = (items: readonly string[], source = selected) =>
		items.every(ability => source.has(ability))
	const grants = () => {
		if (grantable.includes('*') && complete(abilities)) return ['*']

		return available.flatMap(group =>
			complete(group.abilities) && can(grantable, group.wildcard)
				? [group.wildcard]
				: group.abilities.filter(ability => selected.has(ability))
		)
	}

	const toggleFull = () => this.next(() => {
		selected = complete(abilities) ? new Set() : new Set(abilities)
	})
	const wildcard = (abilities: readonly string[]) => this.next(() => {
		const next = new Set(selected)

		if (complete(abilities, next)) {
			for (const ability of abilities) next.delete(ability)
		} else {
			for (const ability of abilities) next.add(ability)
		}

		selected = next
	})
	const ability = (value: string) => this.next(() => {
		const next = new Set(selected)

		if (next.has(value)) next.delete(value)
		else next.add(value)

		selected = next
	})

	for (const { error, loading } of this) {
		const full = complete(abilities)
		const grant = grants()
		const empty = grant.length === 0
		const literal = grantable.includes('*')
		const status = full
			? (literal ? 'Full access - token can perform every action.' : 'All grantable abilities selected.')
			: empty
				? 'Select at least one ability.'
				: `${grant.length} ${grant.length === 1 ? 'ability' : 'abilities'} selected.`

		yield (
			<>
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:items-start">
					<Input
						name="name"
						label="Token Name"
						required
						placeholder="e.g., CI/CD Pipeline"
						wrapper="min-w-0 lg:col-span-2"
						disabled={loading}
					/>
					<div class="md:pt-6">
						<FullAccess
							checked={full}
							disabled={loading}
							literal={literal}
							onToggle={toggleFull}
						/>
						<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
							Grant every ability
						</p>
					</div>
				</div>
				{grant.map(ability => (
					<input key={ability} type="hidden" name="abilities" value={ability} />
				))}

				<div class="space-y-4">
					<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
								Abilities
							</label>
							<p class="text-xs text-slate-500 dark:text-slate-400">
								Choose a resource wildcard, or specific abilities.
							</p>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{available.map(group => {
							const broad = complete(group.abilities)

							return (
								<fieldset
									key={group.wildcard}
									disabled={loading}
									class="rounded-xl bg-[#fbfdfb]/45 p-4 shadow-xs shadow-slate-900/6 inset-ring inset-ring-slate-900/10 transition dark:bg-[#0c1728]/35 dark:shadow-none dark:inset-ring-white/10"
								>
									<legend class="sr-only">{group.label}</legend>
									<div class="mb-3 flex items-center justify-between gap-3 pb-3 shadow-[inset_0_-1px_0_rgb(15_23_42_/_0.10)] dark:shadow-[inset_0_-1px_0_rgb(255_255_255_/_0.08)]">
										<h3 class="text-base font-semibold text-slate-900 dark:text-white">
											{group.label}
										</h3>
										<Checkbox
											key={group.wildcard}
											name="selected"
											value={group.wildcard}
											label={group.wildcard}
											checked={broad}
											disabled={loading}
											onToggle={() => wildcard(group.abilities)}
											attr:class={clsx('flex min-h-7 items-center gap-2 select-none group', loading ? 'cursor-not-allowed' : 'cursor-pointer')}
										/>
									</div>
									<div class="space-y-2">
										{group.abilities.map(value => (
											<Checkbox
												key={value}
												name="selected"
												value={value}
												label={value}
												checked={selected.has(value)}
												disabled={loading}
												onToggle={() => ability(value)}
												attr:class={clsx('flex min-h-7 items-center gap-2 select-none group', loading ? 'cursor-not-allowed' : 'cursor-pointer')}
											/>
										))}
									</div>
								</fieldset>
							)
						})}
					</div>
				</div>

				{error && (
					<Feedback>{error}</Feedback>
				)}

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<Button
						type="submit"
						height="lg"
						disabled={loading || empty}
					>
						{loading ? 'Creating...' : 'Create Token'}
					</Button>
					<p class={clsx('text-sm', empty ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400')}>
						{status}
					</p>
				</div>
			</>
		)
	}
}

AbilityPicker.attrs = { class: 'space-y-6' }

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

					<form set:onsubmit={createForm.submit} class="space-y-6">
						<AbilityPicker
							key={(args.data?.grantable ?? []).join('|')}
							grantable={args.data?.grantable ?? []}
							loading={createForm.loading}
							error={createForm.error?.message}
						/>
					</form>
				</Panel>

				{tokens.length > 0 && (
					<Panel padding="none" clip>
						<div class="px-6 py-4 shadow-[inset_0_-1px_0_rgb(15_23_42_/_0.10)] dark:shadow-[inset_0_-1px_0_rgb(255_255_255_/_0.08)]">
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
