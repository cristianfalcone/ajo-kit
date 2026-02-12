import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'

type Result = { redirect: string }

const Register: Stateful<PageArgs> = function* () {

	const form = action<Result>()

	while (true) yield (
		<>
			<h1 class="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">
				Create Account
			</h1>

			<form set:onsubmit={form.submit} class="space-y-4">

				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
						Email
					</label>
					<input
						type="email"
						name="email"
						required
						autocomplete="email"
						class="w-full input"
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
					{form.loading ? 'Creating account...' : 'Create Account'}
				</button>

			</form>

			<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
				Already have an account?{' '}
				<a href="/login" class="text-accent hover:text-primary dark:text-accent dark:hover:text-accent/70 font-medium">
					Sign in
				</a>
			</p>
		</>
	)
}

export default Register
