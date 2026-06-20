import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import { Button, Feedback, Input } from '/src/ui'

type Result = { deleted: boolean }

const Delete: Stateful<Props> = function* () {

	const form = action<Result>()

	while (true) {

		if (form.data?.deleted) {
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

					<form set:onsubmit={form.submit} class="space-y-4">
						<Input
							name="confirmation"
							label="Type DELETE to confirm"
							tone="danger"
							width="xs"
							required
							pattern="DELETE"
							autocomplete="off"
							disabled={form.loading}
						/>

						{form.error && (
							<Feedback>{form.error.message}</Feedback>
						)}

						<Button
							type="submit"
							disabled={form.loading}
							tone="danger"
						>
							{form.loading ? 'Deleting...' : 'Delete My Account'}
						</Button>
					</form>
				</div>
			</div>
		)
	}
}

export default Delete
