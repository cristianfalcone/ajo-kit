import type { PageArgs } from '/src/constants'

type User = {
	id: number
	name: string
	email: string
	verified: string | null
	created: string
	role: string | null
}

type Data = { users: User[] }

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString(undefined, {
		month: 'short', day: 'numeric', year: 'numeric'
	})
}

export default function Users({ data }: PageArgs<Data>) {
	const users = data?.users ?? []

	return (
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Users</h2>
				<span class="text-sm text-slate-500 dark:text-slate-400">{users.length} total</span>
			</div>

			<div class="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-slate-50 dark:bg-slate-700/50">
						<tr>
							<th class="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">User</th>
							<th class="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Role</th>
							<th class="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Verified</th>
							<th class="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Created</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200 dark:divide-slate-700">
						{users.map(user => (
							<tr key={user.id} class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
								<td class="px-4 py-3">
									<div class="font-medium text-slate-900 dark:text-white">{user.name}</div>
									<div class="text-slate-500 dark:text-slate-400">{user.email}</div>
								</td>
								<td class="px-4 py-3">
									<span class={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
										user.role === 'admin'
											? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
											: 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
									}`}>
										{user.role ?? 'none'}
									</span>
								</td>
								<td class="px-4 py-3">
									{user.verified ? (
										<span class="i-lucide-check-circle w-5 h-5 text-green-500" />
									) : (
										<span class="i-lucide-x-circle w-5 h-5 text-slate-300 dark:text-slate-600" />
									)}
								</td>
								<td class="px-4 py-3 text-slate-500 dark:text-slate-400">
									{formatDate(user.created)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
