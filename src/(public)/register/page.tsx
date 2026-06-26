import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import type { Signup } from '/src/data/registration'
import { Button, Feedback, Input, Link } from '/src/ui'

type Result = { redirect: string }
type Data = { signup: Signup }

const Register: Stateful<Props<Data>> = function* () {

	const form = action<Result>()

	for (const { data } of this) yield data?.signup === 'invite' ? (
		<>
			<h1 class="text-2xl font-bold text-center mb-4 text-slate-900 dark:text-white">
				Registration is by invitation only
			</h1>

			<p class="text-center text-sm leading-6 text-slate-600 dark:text-slate-400">
				New accounts are currently created from invitation links.
			</p>

			<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
				Already have an account?{' '}
				<Link href="/login">
					Sign in
				</Link>
			</p>
		</>
	) : (
		<>
			<h1 class="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">
				Create Account
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
					hint="At least 8 characters"
					required
					minlength={8}
					autocomplete="new-password"
					disabled={form.loading}
				/>

				<Input
					type="password"
					name="confirm"
					label="Confirm Password"
					required
					minlength={8}
					autocomplete="new-password"
					disabled={form.loading}
				/>

				{form.error && (
					<Feedback>{form.error.message}</Feedback>
				)}

				<Button
					type="submit"
					disabled={form.loading}
					wide
				>
					{form.loading ? 'Creating account...' : 'Create Account'}
				</Button>

			</form>

			<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
				Already have an account?{' '}
				<Link href="/login">
					Sign in
				</Link>
			</p>
		</>
	)
}

export default Register
