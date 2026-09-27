import type { Stateful } from 'ajo'
import { type PageArgs, date } from 'ajo-kit'
import { action } from 'ajo-kit/client'
import { Card } from 'ajo-ui-playa/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from 'ajo-ui-playa/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ajo-ui-playa/table'
import { IconAction } from '/src/view'
import type { Info } from '/src/data/pagination'
import PageControls from '../pagination'

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

type Data = { tokens: Token[]; page: Info }
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
											<div class="text-muted-foreground font-mono text-xs">****{token.id.slice(-4)}</div>
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
											<IconAction action={form} name="id" value={token.id} label="Revoke this token" icon="i-lucide-trash-2" />
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
