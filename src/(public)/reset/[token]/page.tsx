import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'

type Result = { redirect: string }

interface Data {
	valid: boolean
}

const Reset: Stateful<PageArgs<Data>> = function* (args) {

	const form = action<Result>()
	for (args of this) {
		const valid = args.data?.valid

		yield (
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
					<a href="/forgot" class="text-accent hover:text-primary dark:text-accent dark:hover:text-accent/70 font-medium">
						Request a new link
					</a>
				</div>
			) : (
				<form set:onsubmit={form.submit} class="space-y-4">
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
							class="w-full input"
							disabled={form.loading}
						/>
					</div>

					{form.error && (
						<p class="text-sm text-red-600 dark:text-red-400">{form.error.message}</p>
					)}

					<button
						type="submit"
						disabled={form.loading}
						class="w-full btn py-2.5 shadow hover:shadow-lg"
					>
						{form.loading ? 'Resetting...' : 'Reset Password'}
					</button>
				</form>
			)}
		</>
	)
	}
}

export default Reset
