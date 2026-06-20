import { type Props, date } from '@kit'
import { Badge, Pager, Panel, Table, type Column } from '/src/ui'

type User = {
	id: number
	name: string
	email: string
	verified: string | null
	created: string
	role: string | null
}

type Info = Parameters<typeof Pager>[0]['page']
type Data = { users: User[]; page: Info }

export default function Users({ data }: Props<Data>) {

	const users = data?.users ?? []
	const columns = [
		{
			header: 'User',
			cell: (user) => (
				<>
					<div class="font-medium text-slate-900 dark:text-white">{user.name}</div>
					<div class="text-slate-500 dark:text-slate-400">{user.email}</div>
				</>
			),
		},
		{
			header: 'Role',
			cell: (user) => (
				<Badge tone={user.role === 'admin' ? 'primary' : 'neutral'}>
					{user.role ?? 'none'}
				</Badge>
			),
		},
		{
			header: 'Verified',
			cell: (user) => user.verified ? (
				<span class="i-lucide-check-circle w-5 h-5 text-green-500" />
			) : (
				<span class="i-lucide-x-circle w-5 h-5 text-slate-300 dark:text-slate-600" />
			),
		},
		{
			header: 'Created',
			tone: 'muted',
			cell: (user) => date(user.created),
		},
	] satisfies Column<User>[]

	return (
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Users</h2>
				<span class="text-sm text-slate-500 dark:text-slate-400">{users.length} shown</span>
			</div>

			<Panel padding="none" clip>
				<Table rows={users} columns={columns} getKey={user => user.id} />
				{data?.page && <Pager page={data.page} count={users.length} label="users" />}
			</Panel>
		</div>
	)
}
