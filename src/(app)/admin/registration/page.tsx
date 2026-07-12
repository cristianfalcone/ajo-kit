import type { Stateful } from 'ajo'
import { type PageArgs, date } from '@kit'
import { action } from '@kit/client'
import { Button, buttonVariants, Card, CardContent, CardDescription, CardHeader, CardTitle, Chip, Empty, EmptyDescription, EmptyHeader, EmptyMedia, Field, FieldError, FieldLabel, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ToggleGroup, ToggleGroupItem, toast, Tooltip, TooltipContent, TooltipTrigger } from '/src/ui'
import type { Signup } from '/src/data/registration'
import PageControls, { type PageInfo } from '../pagination'

type Status = 'accepted' | 'expired' | 'pending' | 'revoked'

type Invitation = {
	id: string
	email: string
	name: string
	inviterName: string | null
	inviterEmail: string | null
	expiry: string
	accepted: string | null
	revoked: string | null
	created: string
	status: Status
}

type Data = { signup: Signup; invitations: Invitation[]; page: PageInfo }
type ModeResult = { saved: boolean }
type InviteResult = { invited: boolean }
type RevokeResult = { revoked: boolean }

const statusChip = {
	accepted: {
		variant: 'success',
		class: undefined,
	},
	expired: {
		variant: 'secondary',
		class: undefined,
	},
	pending: {
		variant: 'warning',
		class: undefined,
	},
	revoked: {
		variant: 'danger',
		class: undefined,
	},
} as const

const statusText = {
	accepted: 'Accepted',
	expired: 'Expired',
	pending: 'Pending',
	revoked: 'Revoked',
} as const

const Registration: Stateful<PageArgs<Data>> = function* (args) {
	const mode = action<ModeResult>('mode')
	const invite = action<InviteResult>('invite')
	const revoke = action<RevokeResult>('revoke')

	for (args of this) {
		const signup = args.data?.signup ?? 'open'
		const invitations = args.data?.invitations ?? []

		yield (
			<div class="space-y-8">
				<div class="space-y-1">
					<h1 class="text-2xl font-semibold tracking-tight text-foreground">
						Registration
					</h1>
					<p class="text-sm text-muted-foreground">
						Choose how new accounts are created and manage pending invitations.
					</p>
				</div>

				<div class="grid gap-4 lg:grid-cols-2 lg:items-start">
					<Card>
						<CardHeader>
							<CardTitle>Signup Mode</CardTitle>
							<CardDescription>Changes apply immediately.</CardDescription>
						</CardHeader>

						<CardContent>
							<ToggleGroup
								type="single"
								variant="outline"
								spacing={0}
								value={signup}
								disabled={mode.loading}
								aria-label="Signup mode"
								onValueChange={value => {
									if (!value || value === signup) return
									mode.invoke({ signup: value }).then(result => {
										if (mode.error) toast.error(mode.error.message)
										else if (result?.saved) toast.success('Signup mode saved.')
									})
								}}
							>
								<ToggleGroupItem value="open">Open</ToggleGroupItem>
								<ToggleGroupItem value="invite">Invite only</ToggleGroupItem>
							</ToggleGroup>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Send Invitation</CardTitle>
						</CardHeader>

						<CardContent>
							<form
								class="space-y-4"
								set:onsubmit={(event: SubmitEvent) => {
									event.preventDefault()
									const form = event.currentTarget as HTMLFormElement
									invite.invoke(Object.fromEntries(new FormData(form))).then(result => {
										if (result?.invited) {
											toast.success('Invitation sent.')
											form.reset()
										}
									})
								}}
							>
								<div class="grid gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel for="email">Email</FieldLabel>
										<Input
											id="email"
											type="email"
											name="email"
											required
											autocomplete="email"
											disabled={invite.loading}
										/>
									</Field>
									<Field>
										<FieldLabel for="name">Name</FieldLabel>
										<Input
											id="name"
											name="name"
											autocomplete="name"
											disabled={invite.loading}
										/>
									</Field>
								</div>

								{invite.error && <FieldError>{invite.error.message}</FieldError>}

								<Button type="submit" disabled={invite.loading}>
									{invite.loading ? 'Sending...' : 'Send Invitation'}
								</Button>
							</form>
						</CardContent>
					</Card>
				</div>

				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-foreground">
							Recent Invitations
						</h2>
						<span class="text-sm text-muted-foreground tabular-nums">{invitations.length} shown</span>
					</div>
					<Card class="overflow-hidden py-0">
						{invitations.length === 0 ? (
							<Empty class="py-12">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<span class="i-lucide-mail size-6" />
									</EmptyMedia>
									<EmptyDescription>No invitations created yet</EmptyDescription>
								</EmptyHeader>
							</Empty>
						) : (
							<>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Invitation</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Inviter</TableHead>
											<TableHead>Expiry</TableHead>
											<TableHead>Created</TableHead>
											<TableHead class="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{invitations.map(row => {
											const chip = statusChip[row.status]

											return (
												<TableRow key={row.id}>
													<TableCell>
														<div class="font-medium">{row.email}</div>
														{row.name && <div class="text-muted-foreground">{row.name}</div>}
													</TableCell>
													<TableCell>
														<Chip variant={chip.variant} class={chip.class}>
															{statusText[row.status]}
														</Chip>
													</TableCell>
													<TableCell>{row.inviterName || row.inviterEmail || 'Unknown'}</TableCell>
													<TableCell class="text-muted-foreground">{date(row.expiry)}</TableCell>
													<TableCell class="text-muted-foreground">{date(row.created)}</TableCell>
													<TableCell class="text-right">
														{row.status === 'pending' ? (
															<form set:onsubmit={revoke.submit}>
																<input type="hidden" name="id" value={row.id} />
																<Tooltip delayDuration={500}>
																	<TooltipTrigger
																		type="submit"
																		aria-label="Revoke invitation"
																		disabled={revoke.loading}
															class={buttonVariants({ variant: 'danger-ghost', size: 'icon-sm' })}
																	>
																		<span class="i-lucide-trash-2 size-4" />
																	</TooltipTrigger>
																	<TooltipContent>Revoke invitation</TooltipContent>
																</Tooltip>
															</form>
														) : null}
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
								{args.data?.page && <PageControls page={args.data.page} count={invitations.length} label="invitations" />}
							</>
						)}
					</Card>
				</div>
			</div>
		)
	}
}

export default Registration
