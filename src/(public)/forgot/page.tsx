import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import { Alert, Button, Feedback, Input, Link } from '/src/ui'

type Result = { message: string }

const Forgot: Stateful<Props> = function* () {

	const form = action<Result>()

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
					<Alert class="mb-4">{form.data.message}</Alert>
					<Link href="/login">
						Back to login
					</Link>
				</div>
			) : (
				<>
					<form set:onsubmit={form.submit} class="space-y-4">
						<Input
							type="email"
							name="email"
							label="Email"
							required
							autocomplete="email"
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
							{form.loading ? 'Sending...' : 'Send Reset Link'}
						</Button>
					</form>

					<p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
						<Link href="/login">
							Back to login
						</Link>
					</p>
				</>
			)}
		</>
	)
}

export default Forgot
