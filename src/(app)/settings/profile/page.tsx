import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action } from '/src/app'

type NameResult = { success: boolean; name: string }
type PasswordResult = { success: boolean }

interface Data {
	user?: { id: number; name: string; email: string }
}

const Profile: Stateful<PageArgs<Data>> = function* (args) {
	const nameForm = action<NameResult>('name')
	const passwordForm = action<PasswordResult>('password')
	const user = args.data?.user

	while (true) yield (
		<div class="space-y-8">
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">
					Profile Settings
				</h1>
			</div>

			<div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
					Update Name
				</h2>

				<form set:onsubmit={nameForm.handle} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
							Name
						</label>
						<input
							type="text"
							name="name"
							value={nameForm.data?.name ?? user?.name ?? ''}
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							disabled={nameForm.loading}
						/>
					</div>

					{nameForm.error && (
						<p class="text-sm text-red-600 dark:text-red-400">{nameForm.error.message}</p>
					)}

					{nameForm.data?.success && (
						<p class="text-sm text-green-600 dark:text-green-400">Name updated successfully!</p>
					)}

					<button
						type="submit"
						disabled={nameForm.loading}
						class="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-medium rounded-lg transition"
					>
						{nameForm.loading ? 'Saving...' : 'Save Name'}
					</button>
				</form>
			</div>

			<div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
					Change Password
				</h2>

				<form set:onsubmit={passwordForm.handle} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
							Current Password
						</label>
						<input
							type="password"
							name="current"
							required
							autocomplete="current-password"
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							disabled={passwordForm.loading}
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
							New Password
						</label>
						<input
							type="password"
							name="password"
							required
							minlength={8}
							autocomplete="new-password"
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							disabled={passwordForm.loading}
						/>
						<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
							At least 8 characters
						</p>
					</div>

					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
							Confirm New Password
						</label>
						<input
							type="password"
							name="confirm"
							required
							minlength={8}
							autocomplete="new-password"
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							disabled={passwordForm.loading}
						/>
					</div>

					{passwordForm.error && (
						<p class="text-sm text-red-600 dark:text-red-400">{passwordForm.error.message}</p>
					)}

					{passwordForm.data?.success && (
						<p class="text-sm text-green-600 dark:text-green-400">Password changed successfully!</p>
					)}

					<button
						type="submit"
						disabled={passwordForm.loading}
						class="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-medium rounded-lg transition"
					>
						{passwordForm.loading ? 'Changing...' : 'Change Password'}
					</button>
				</form>
			</div>
		</div>
	)
}

export default Profile
