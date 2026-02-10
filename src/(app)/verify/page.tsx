import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'

type Result = { sent: boolean }

const Verify: Stateful<PageArgs> = function* () {

	const form = action<Result>()

	while (true) yield (
		<>
			<h1 class="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
				Verify Your Email
			</h1>

			<div class="text-center space-y-4">
				<p class="text-slate-600 dark:text-slate-400">
					We sent a verification link to your email address.
					Please check your inbox and click the link to verify your account.
				</p>

				{form.data?.sent && (
					<div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
						<p class="text-green-800 dark:text-green-200">
							Verification email sent!
						</p>
					</div>
				)}

				{form.error && (
					<div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<p class="text-red-800 dark:text-red-200">{form.error.message}</p>
					</div>
				)}

				<form set:onsubmit={form.handle}>
					<button
						type="submit"
						disabled={form.loading}
						class="text-accent hover:text-primary dark:text-accent dark:hover:text-accent/70 font-medium disabled:opacity-50"
					>
						{form.loading ? 'Sending...' : "Didn't receive the email? Click to resend"}
					</button>
				</form>
			</div>
		</>
	)
}

export default Verify
