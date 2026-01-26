import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action } from '/src/app'

type Result = { redirect: string }

interface Data {
	valid: boolean
}

const Reset: Stateful<PageArgs<Data>> = function* (args) {

	const form = action<Result>('reset')
	const valid = args.data?.valid

	while (true) yield (
		<>
			<h1 class="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">
				Set New Password
			</h1>

			{!valid ? (
				<div class="text-center">
					<div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<p class="text-red-800 dark:text-red-200">
							This reset link is invalid or has expired.
						</p>
					</div>
					<a href="/forgot" class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">
						Request a new link
					</a>
				</div>
			) : (
				<form set:onsubmit={form.handle} class="space-y-4">
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
							disabled={form.loading}
						/>
						<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
							At least 8 characters
						</p>
					</div>

					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
							Confirm Password
						</label>
						<input
							type="password"
							name="confirm"
							required
							minlength={8}
							autocomplete="new-password"
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
						class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-medium rounded-lg transition shadow hover:shadow-lg"
					>
						{form.loading ? 'Resetting...' : 'Reset Password'}
					</button>
				</form>
			)}
		</>
	)
}

export default Reset
