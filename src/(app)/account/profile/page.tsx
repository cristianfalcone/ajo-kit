import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'

type NameResult = { success: boolean; name: string }
type PasswordResult = { success: boolean }

interface Data {
	user?: { id: number; name: string; email: string }
}

const Profile: Stateful<Props<Data>> = function* (args) {

	const nameForm = action<NameResult>('name')
	const passwordForm = action<PasswordResult>('password')
	for (args of this) {
		const user = args.data?.user

		yield (
		<div class="space-y-8">
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">
					Profile Settings
				</h1>
			</div>

			<div class="glass rounded-lg p-6">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
					Update Name
				</h2>

				<form set:onsubmit={nameForm.submit} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
							Name
						</label>
						<input
							type="text"
							name="name"
							value={nameForm.data?.name ?? user?.name ?? ''}
							class="w-full input"
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
						class="btn"
					>
						{nameForm.loading ? 'Saving...' : 'Save Name'}
					</button>
				</form>
			</div>

			<div class="glass rounded-lg p-6">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
					Change Password
				</h2>

				<form set:onsubmit={passwordForm.submit} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
							Current Password
						</label>
						<input
							type="password"
							name="current"
							required
							autocomplete="current-password"
							class="w-full input"
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
							class="w-full input"
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
							class="w-full input"
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
						class="btn"
					>
						{passwordForm.loading ? 'Changing...' : 'Change Password'}
					</button>
				</form>
			</div>
		</div>
	)
	}
}

export default Profile
