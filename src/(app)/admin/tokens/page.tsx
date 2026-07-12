import type { Stateful } from 'ajo'
import { type PageArgs, date } from '@kit'
import { action } from '@kit/client'
import { buttonVariants, Card, Empty, EmptyDescription, EmptyHeader, EmptyMedia, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, TooltipContent, TooltipTrigger } from '/src/ui'
import PageControls, { type PageInfo } from '../pagination'

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

type Data = { tokens: Token[]; page: PageInfo }
type FormResult = { revoked: boolean }

const Tokens: Stateful<PageArgs<Data>> = function* (args) {

	const form = action<FormResult>()

	for (args of this) {

		const tokens = args.data?.tokens ?? []

		yield (
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-foreground">API Tokens</h2>
					<span class="text-sm text-muted-foreground tabular-nums">{tokens.length} shown</span>
				</div>

				{tokens.length === 0 ? (
					<Card class="py-0">
						<Empty class="py-12">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<span class="i-lucide-key size-6" />
								</EmptyMedia>
								<EmptyDescription>No API tokens created yet</EmptyDescription>
							</EmptyHeader>
						</Empty>
					</Card>
				) : (
					<Card class="overflow-hidden py-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Token</TableHead>
									<TableHead>User</TableHead>
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
											<div>{token.userName}</div>
											<div class="text-muted-foreground text-xs">{token.email}</div>
										</TableCell>
										<TableCell>
											<span class="text-muted-foreground">
												{token.abilities.includes('*') ? 'Full access' : token.abilities.join(', ')}
											</span>
										</TableCell>
										<TableCell class="text-muted-foreground">
											{token.last ? date(token.last) : 'Never'}
										</TableCell>
										<TableCell class="text-right">
											<form set:onsubmit={form.submit}>
												<input type="hidden" name="id" value={token.id} />
												<Tooltip delayDuration={500}>
													<TooltipTrigger
														type="submit"
														aria-label="Revoke this token"
														disabled={form.loading}
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
						{args.data?.page && <PageControls page={args.data.page} count={tokens.length} label="tokens" />}
					</Card>
				)}
			</div>
		)
	}
}

export default Tokens
