import type { Stateful, Stateless } from 'ajo'
import clsx from 'clsx'
import { type PageArgs, date } from '@kit'
import { action } from '@kit/client'
import { Alert, AlertDescription, AlertTitle, Button, buttonVariants, Card, CardContent, CardHeader, CardTitle, Checkbox, Field, FieldError, FieldLabel, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, TooltipContent, TooltipTrigger } from '/src/ui'
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

type FullArgs = {
	checked: boolean
	disabled?: boolean
	literal?: boolean
	onChange: () => void
}

const FullAccess: Stateless<FullArgs> = ({ checked, disabled, literal, onChange }) => (
	<Field
		orientation="horizontal"
		disabled={disabled}
		class={clsx(
			'group flex h-9 items-center gap-3 rounded-lg px-4 select-none shadow-xs inset-ring transition',
			checked
				? 'bg-primary/10 inset-ring-primary text-foreground'
				: 'bg-transparent inset-ring-border text-foreground hover:bg-accent hover:text-accent-foreground',
			disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
		)}
	>
		<Checkbox
			id="full-access"
			name="selected"
			value="*"
			set:checked={checked}
			disabled={disabled}
			set:onchange={onChange}
		/>
		<FieldLabel for="full-access" class="font-semibold leading-5 text-foreground">
			Full access {literal && <span class="font-medium text-muted-foreground">(*)</span>}
		</FieldLabel>
	</Field>
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

const checkboxId = (value: string) => `ability-${value.replace(/[^a-z0-9]+/gi, '-')}`

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
					<Field class="min-w-0 lg:col-span-2">
						<FieldLabel for="token-name">Token Name</FieldLabel>
						<Input
							id="token-name"
							name="name"
							required
							placeholder="e.g., CI/CD Pipeline"
							disabled={loading}
						/>
					</Field>
					<div class="md:pt-6">
						<FullAccess
							checked={full}
							disabled={loading}
							literal={literal}
							onChange={toggleFull}
						/>
						<p class="mt-1 text-xs text-muted-foreground">
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
							<label class="block text-sm font-medium text-foreground mb-1">
								Abilities
							</label>
							<p class="text-xs text-muted-foreground">
								Choose a resource wildcard, or specific abilities.
							</p>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{available.map(group => {
							const broad = complete(group.abilities)
							const groupId = checkboxId(group.wildcard)

							return (
								<fieldset
									key={group.wildcard}
									disabled={loading}
									class="rounded-xl glass edge p-4 shadow-xs"
								>
									<legend class="sr-only">{group.label}</legend>
									<div class="mb-3 flex items-center justify-between gap-3 border-b pb-3">
										<h3 class="text-base font-semibold">
											{group.label}
										</h3>
										<Field orientation="horizontal" disabled={loading} class="w-auto">
											<Checkbox
												id={groupId}
												name="selected"
												value={group.wildcard}
												set:checked={broad}
												disabled={loading}
												set:onchange={() => wildcard(group.abilities)}
											/>
											<FieldLabel for={groupId}>{group.wildcard}</FieldLabel>
										</Field>
									</div>
									<div class="space-y-2">
										{group.abilities.map(value => {
											const id = checkboxId(value)

											return (
												<Field key={value} orientation="horizontal" disabled={loading}>
													<Checkbox
														id={id}
														name="selected"
														value={value}
														set:checked={selected.has(value)}
														disabled={loading}
														set:onchange={() => ability(value)}
													/>
													<FieldLabel for={id}>{value}</FieldLabel>
												</Field>
											)
										})}
									</div>
								</fieldset>
							)
						})}
					</div>
				</div>

				{error && (
					<FieldError>{error}</FieldError>
				)}

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<Button
						type="submit"
						size="lg"
						disabled={loading || empty}
					>
						{loading ? 'Creating...' : 'Create Token'}
					</Button>
					<p class={clsx('text-sm', empty ? 'text-warning' : 'text-muted-foreground')}>
						{status}
					</p>
				</div>
			</>
		)
	}
}

AbilityPicker.attrs = { class: 'space-y-6' }

const Tokens: Stateful<PageArgs<Data>> = function* (args) {

	const createForm = action<CreateResult>('make')
	const revokeForm = action<RevokeResult>('revoke')

	for (args of this) {

		const tokens = args.data?.tokens ?? []

		yield (
			<div class="space-y-8">
				<div class="space-y-2">
					<h1 class="text-2xl font-semibold tracking-tight">
						API Tokens
					</h1>
					<p class="text-sm text-muted-foreground">
						Create and manage API tokens for programmatic access.
					</p>
				</div>

				{createForm.data?.token && (
					<Alert variant="success">
						<span data-slot="alert-icon" class="i-lucide-check-circle" />
						<AlertTitle>Token created! Copy it now - it won't be shown again.</AlertTitle>
						<AlertDescription class="w-full">
							<div class="mt-2 flex items-stretch">
								<code class="flex-1 rounded-l bg-muted p-3 font-mono text-sm break-all text-foreground">
									{createForm.data.token}
								</code>
								<Button
									type="button"
									size="none"
									variant="secondary"
									class="h-9 gap-2 rounded-r-md px-4 py-2 has-[>svg]:px-3 [&_svg:not([class*=size-])]:size-4"
									set:onclick={() => {
										if (createForm.data?.token) {
											navigator.clipboard.writeText(createForm.data.token)
										}
										createForm.reset()
									}}
								>
									Copy and close
								</Button>
							</div>
						</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Create New Token</CardTitle>
					</CardHeader>

					<CardContent>
						<form set:onsubmit={createForm.submit}>
							<AbilityPicker
								key={(args.data?.grantable ?? []).join('|')}
								grantable={args.data?.grantable ?? []}
								loading={createForm.loading}
								error={createForm.error?.message}
							/>
						</form>
					</CardContent>
				</Card>

				{tokens.length > 0 && (
					<div class="space-y-4">
						<h2 class="text-lg font-semibold">
							Existing Tokens
						</h2>
						<Card class="overflow-hidden py-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Token</TableHead>
										<TableHead>Abilities</TableHead>
										<TableHead>Last Used</TableHead>
										<TableHead class="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{tokens.map(token => (
										<TableRow key={token.id}>
											<TableCell>
												<div class="font-medium">{token.name}</div>
												<div class="text-muted-foreground font-mono text-xs">****{token.id}</div>
											</TableCell>
											<TableCell>
												<span class="text-muted-foreground">
													{token.abilities.includes('*') ? 'Full access' : token.abilities.join(', ')}
												</span>
											</TableCell>
											<TableCell class="text-muted-foreground">
												{token.last ? date(token.last, shortDate) : 'Never'}
											</TableCell>
											<TableCell class="text-right">
												<form set:onsubmit={revokeForm.submit}>
													<input type="hidden" name="id" value={token.id} />
													<Tooltip delayDuration={500}>
														<TooltipTrigger
															type="submit"
															aria-label="Revoke this token"
															disabled={revokeForm.loading}
													class={buttonVariants({ variant: 'danger-ghost', size: 'icon-sm' })}
														>
															<span class="i-lucide-trash-2 size-4" />
														</TooltipTrigger>
														<TooltipContent>Revoke this token</TooltipContent>
													</Tooltip>
												</form>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					</div>
				)}
			</div>
		)
	}
}

export default Tokens
