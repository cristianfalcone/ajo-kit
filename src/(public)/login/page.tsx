import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'
import { action } from '/src/app'

type Result = { redirect: string }

const Login: Stateful<PageArgs> = function* () {

	const form = action<Result>()

	while (true) yield (
		<>
			<h1 class="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">
				Sign In
			</h1>

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

				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
						Password
					</label>
					<input
						type="password"
						name="password"
						required
						autocomplete="current-password"
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						disabled={form.loading}
					/>
				</div>

				<div class="flex items-center justify-between">
					<label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
						<input
							type="checkbox"
							name="remember"
							value="true"
							class="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
							disabled={form.loading}
						/>
						Remember me
					</label>
					<a href="/forgot" class="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
						Forgot password?
					</a>
				</div>

				{form.error && (
					<p class="text-sm text-red-600 dark:text-red-400">{form.error.message}</p>
				)}

				<button
					type="submit"
					disabled={form.loading}
					class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-medium rounded-lg transition shadow hover:shadow-lg"
				>
					{form.loading ? 'Signing in...' : 'Sign In'}
				</button>

			</form>

			<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
				Don't have an account?{' '}
				<a href="/register" class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">
					Sign up
				</a>
			</p>
		</>
	)
}

export default Login
