import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import type { Signup } from '/src/data/registration'
import { Button, Checkbox, Feedback, Input, Link } from '/src/ui'

type Result = { redirect: string }
type Data = { signup: Signup }

const Login: Stateful<Props<Data>> = function* () {

	const form = action<Result>()

	for (const { data } of this) yield (
		<>
			<h1 class="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">
				Sign In
			</h1>

			<form set:onsubmit={form.submit} class="space-y-4">

				<Input
					type="email"
					name="email"
					label="Email"
					required
					autocomplete="email"
					disabled={form.loading}
				/>

				<Input
					type="password"
					name="password"
					label="Password"
					required
					autocomplete="current-password"
					disabled={form.loading}
				/>

				<div class="flex items-center justify-between">
					<Checkbox name="remember" label="Remember me" disabled={form.loading} />
					<Link href="/forgot" weight="normal" class="text-sm">
						Forgot password?
					</Link>
				</div>

				{form.error && (
					<Feedback>{form.error.message}</Feedback>
				)}

				<Button
					type="submit"
					disabled={form.loading}
					wide
				>
					{form.loading ? 'Signing in...' : 'Sign In'}
				</Button>

			</form>

			{data?.signup !== 'invite' && (
				<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
					Don't have an account?{' '}
					<Link href="/register">
						Sign up
					</Link>
				</p>
			)}
		</>
	)
}

export default Login
