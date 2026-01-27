import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action } from '/src/app'

type Result = { message: string }

const Forgot: Stateful<PageArgs> = function* () {

	const form = action<Result>('forgot')

	while (true) yield (
		<>
			<h1 class="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
				Reset Password
			</h1>
			<p class="text-center text-sm text-slate-600 dark:text-slate-400 mb-8">
				Enter your email and we'll send you a reset link
			</p>

			{form.data ? (
				<div class="text-center">
					<div class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
						<p class="text-green-800 dark:text-green-200">{form.data.message}</p>
					</div>
					<a href="/login" class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">
						Back to login
					</a>
				</div>
			) : (
				<>
					<form set:onsubmit={form.handle} class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
								Email
							</label>
							<input
								type="email"
								name="email"
								required
								autocomplete="email"
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
							{form.loading ? 'Sending...' : 'Send Reset Link'}
						</button>
					</form>

					<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
						<a href="/login" class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">
							Back to login
						</a>
					</p>
				</>
			)}
		</>
	)
}

export default Forgot
