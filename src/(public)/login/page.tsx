import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import Checkbox from '/src/ui/checkbox'

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
						autocomplete="current-password"
						class="w-full input"
						disabled={form.loading}
					/>
				</div>

				<div class="flex items-center justify-between">
					<Checkbox name="remember" label="Remember me" disabled={form.loading} />
					<a href="/forgot" class="text-sm text-accent hover:text-primary dark:text-accent dark:hover:text-accent/70">
						Forgot password?
					</a>
				</div>

				{form.error && (
					<p class="text-sm text-red-600 dark:text-red-400">{form.error.message}</p>
				)}

				<button
					type="submit"
					disabled={form.loading}
					class="w-full btn py-2.5 shadow hover:shadow-lg"
				>
					{form.loading ? 'Signing in...' : 'Sign In'}
				</button>

			</form>

			<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
				Don't have an account?{' '}
				<a href="/register" class="text-accent hover:text-primary dark:text-accent dark:hover:text-accent/70 font-medium">
					Sign up
				</a>
			</p>
		</>
	)
}

export default Login
