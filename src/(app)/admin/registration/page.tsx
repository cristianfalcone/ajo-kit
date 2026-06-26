import type { Stateful } from 'ajo'
import { type Props, date } from '@kit'
import { action } from '@kit/client'
import { Badge, Button, Feedback, Input, Pager, Panel, Table, type Column } from '/src/ui'
import type { Signup } from '/src/data/registration'

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

type Info = Parameters<typeof Pager>[0]['page']
type Data = { signup: Signup; invitations: Invitation[]; page: Info }
type ModeResult = { saved: boolean }
type InviteResult = { invited: boolean }
type RevokeResult = { revoked: boolean }

const statusTone = {
	accepted: 'success',
	expired: 'neutral',
	pending: 'warning',
	revoked: 'danger',
} as const

const statusText = {
	accepted: 'Accepted',
	expired: 'Expired',
	pending: 'Pending',
	revoked: 'Revoked',
} as const

const option = (active: boolean) =>
	[
		'flex min-h-10 items-center gap-3 rounded-lg px-4 text-sm font-medium shadow-xs shadow-slate-900/7 inset-ring transition dark:shadow-none',
		active
			? 'bg-accent/10 text-slate-950 inset-ring-accent dark:bg-accent/15 dark:text-white dark:inset-ring-accent'
			: 'bg-[#fbfdfb]/55 text-slate-700 inset-ring-slate-900/12 hover:bg-[#fbfdfb]/85 dark:bg-white/4 dark:text-slate-200 dark:inset-ring-white/12 dark:hover:bg-white/8',
	].join(' ')

const Registration: Stateful<Props<Data>> = function* (args) {
	const mode = action<ModeResult>('mode')
	const invite = action<InviteResult>('invite')
	const revoke = action<RevokeResult>('revoke')

	for (args of this) {
		const signup = args.data?.signup ?? 'open'
		const invitations = args.data?.invitations ?? []
		const columns = [
			{
				header: 'Invitation',
				cell: (row) => (
					<>
						<div class="font-medium text-slate-900 dark:text-white">{row.email}</div>
						{row.name && <div class="text-slate-500 dark:text-slate-400">{row.name}</div>}
					</>
				),
			},
			{
				header: 'Status',
				cell: (row) => (
					<Badge tone={statusTone[row.status]}>
						{statusText[row.status]}
					</Badge>
				),
			},
			{
				header: 'Inviter',
				cell: (row) => row.inviterName || row.inviterEmail || 'Unknown',
			},
			{
				header: 'Expiry',
				tone: 'muted',
				cell: (row) => date(row.expiry),
			},
			{
				header: 'Created',
				tone: 'muted',
				cell: (row) => date(row.created),
			},
			{
				header: 'Actions',
				align: 'right',
				cell: (row) => row.status === 'pending' ? (
					<form set:onsubmit={revoke.submit}>
						<input type="hidden" name="id" value={row.id} />
						<Button
							type="submit"
							title="Revoke invitation"
							disabled={revoke.loading}
							icon="i-lucide-trash-2"
							tone="danger"
						/>
					</form>
				) : null,
			},
		] satisfies Column<Invitation>[]

		yield (
			<div class="space-y-8">
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
						Registration
					</h1>
					<p class="text-sm text-slate-600 dark:text-slate-400">
						Choose how new accounts are created and manage pending invitations.
					</p>
				</div>

				<div class="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
					<Panel>
						<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							Signup Mode
						</h2>

						<div class="space-y-4">
							<div class="grid gap-2 sm:grid-cols-2">
								<form set:onsubmit={mode.submit}>
									<input type="hidden" name="signup" value="open" />
									<button
										type="submit"
										disabled={mode.loading}
										class={`${option(signup === 'open')} w-full justify-center disabled:cursor-not-allowed disabled:opacity-60`}
									>
										Open
									</button>
								</form>
								<form set:onsubmit={mode.submit}>
									<input type="hidden" name="signup" value="invite" />
									<button
										type="submit"
										disabled={mode.loading}
										class={`${option(signup === 'invite')} w-full justify-center disabled:cursor-not-allowed disabled:opacity-60`}
									>
										Invite only
									</button>
								</form>
							</div>

							{mode.error && <Feedback>{mode.error.message}</Feedback>}
							{mode.data?.saved && <Feedback tone="success">Signup mode saved.</Feedback>}

							<p class="text-xs text-slate-500 dark:text-slate-400">
								Changes apply immediately.
							</p>
						</div>
					</Panel>

					<Panel>
						<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							Send Invitation
						</h2>

						<form set:onsubmit={invite.submit} class="space-y-4">
							<Input
								type="email"
								name="email"
								label="Email"
								required
								autocomplete="email"
								disabled={invite.loading}
							/>
							<Input
								name="name"
								label="Name"
								autocomplete="name"
								disabled={invite.loading}
							/>

							{invite.error && <Feedback>{invite.error.message}</Feedback>}
							{invite.data?.invited && <Feedback tone="success">Invitation sent.</Feedback>}

							<Button type="submit" disabled={invite.loading}>
								{invite.loading ? 'Sending...' : 'Send Invitation'}
							</Button>
						</form>
					</Panel>
				</div>

				<Panel padding="none" clip>
					<div class="flex items-center justify-between px-6 py-4 shadow-[inset_0_-1px_0_rgb(15_23_42_/_0.10)] dark:shadow-[inset_0_-1px_0_rgb(255_255_255_/_0.08)]">
						<h2 class="text-lg font-semibold text-slate-900 dark:text-white">
							Recent Invitations
						</h2>
						<span class="text-sm text-slate-500 dark:text-slate-400">{invitations.length} shown</span>
					</div>
					{invitations.length === 0 ? (
						<div class="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
							No invitations created yet
						</div>
					) : (
						<>
							<Table rows={invitations} columns={columns} getKey={row => row.id} />
							{args.data?.page && <Pager page={args.data.page} count={invitations.length} label="invitations" />}
						</>
					)}
				</Panel>
			</div>
		)
	}
}

export default Registration
