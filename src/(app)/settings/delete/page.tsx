import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action, invalidate } from '/src/client'

type Result = { deleted: boolean }

const Delete: Stateful<PageArgs> = function* () {

	const form = action<Result>()

	while (true) {

		if (form.data?.deleted) {
			invalidate()
			location.href = '/'
			return
		}

		yield (
			<div class="space-y-8">
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
						Delete Account
					</h1>
					<p class="text-sm text-slate-600 dark:text-slate-400">
						This action is permanent and cannot be undone.
					</p>
				</div>

				<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
					<h2 class="text-lg font-semibold text-red-800 dark:text-red-300 mb-4">
						Danger Zone
					</h2>

					<p class="text-sm text-red-700 dark:text-red-400 mb-4">
						Deleting your account will permanently remove all your data, including sessions, API tokens, and role memberships.
					</p>

					<form set:onsubmit={form.handle} class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
								Type DELETE to confirm
							</label>
							<input
								type="text"
								name="confirmation"
								required
								pattern="DELETE"
								autocomplete="off"
								class="w-full max-w-xs px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
								disabled={form.loading}
							/>
						</div>

						{form.error && (
							<p class="text-sm text-red-600">{form.error.message}</p>
						)}

						<button
							type="submit"
							disabled={form.loading}
							class="py-2 px-4 bg-red-600 hover:bg-red-500 disabled:bg-red-400 text-white font-medium rounded-lg transition"
						>
							{form.loading ? 'Deleting...' : 'Delete My Account'}
						</button>
					</form>
				</div>
			</div>
		)
	}
}

export default Delete
