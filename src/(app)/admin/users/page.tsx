import { type PageArgs, date } from '@kit'
import { Card } from 'ajo-ui-playa/card'
import { Chip } from 'ajo-ui-playa/chip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ajo-ui-playa/table'
import PageControls, { type PageInfo } from '../pagination'

type User = {
	id: number
	name: string
	email: string
	verified: string | null
	created: string
	role: string | null
}

type Data = { users: User[]; page: PageInfo }

export default function Users({ data }: PageArgs<Data>) {

	const users = data?.users ?? []

	return (
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-foreground">Users</h2>
				<span class="text-sm text-muted-foreground tabular-nums">{users.length} shown</span>
			</div>

			<Card class="overflow-hidden py-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Verified</TableHead>
							<TableHead>Created</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map(user => (
							<TableRow key={user.id}>
								<TableCell>
									<div class="font-medium">{user.name}</div>
									<div class="text-xs text-muted-foreground">{user.email}</div>
								</TableCell>
								<TableCell>
									<Chip variant={user.role === 'admin' ? 'default' : 'secondary'}>
										{user.role ?? 'none'}
									</Chip>
								</TableCell>
								<TableCell>
									{user.verified ? (
										<span class="i-lucide-check-circle size-5 text-success" />
									) : (
										<span class="i-lucide-x-circle size-5 text-muted-foreground/50" />
									)}
								</TableCell>
								<TableCell class="text-muted-foreground">{date(user.created)}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{data?.page && <PageControls page={data.page} count={users.length} label="users" />}
			</Card>
		</div>
	)
}
