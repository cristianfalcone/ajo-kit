import type { Stateful } from 'ajo'
import { type PageArgs, navigate } from '/src/constants'
import { action } from '/src/app'

type Result = { confirmed: boolean }

const Confirm: Stateful<PageArgs> = function* () {

	const form = action<Result>('confirm')

	while (true) {

		if (form.data?.confirmed) {
			const params = new URLSearchParams(location.search)
			navigate(params.get('redirect') || '/dashboard')
			return
		}

		yield (
			<div class="flex-1 flex items-center justify-center px-4">
				<div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6 w-full max-w-sm">
					<h1 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
						Confirm Password
					</h1>
					<p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
						Please enter your password to continue.
					</p>

					<form set:onsubmit={form.handle} class="space-y-4">
						<div>
							<input
								type="password"
								name="password"
								required
								autocomplete="current-password"
								placeholder="Password"
								class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								disabled={form.loading}
							/>
						</div>

						{form.error && (
							<p class="text-sm text-red-600 dark:text-red-400">{form.error.message}</p>
						)}

						<button
							type="submit"
							disabled={form.loading}
							class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-medium rounded-lg transition"
						>
							{form.loading ? 'Confirming...' : 'Confirm'}
						</button>
					</form>
				</div>
			</div>
		)
	}
}

Confirm.attrs = { class: 'flex-1 flex flex-col' }

export default Confirm
