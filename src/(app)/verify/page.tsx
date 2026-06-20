import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import { Alert } from '/src/ui'

type Result = { sent: boolean }

const Verify: Stateful<Props> = function* () {

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
					<Alert>Verification email sent!</Alert>
				)}

				{form.error && (
					<Alert tone="danger">{form.error.message}</Alert>
				)}

				<form set:onsubmit={form.submit}>
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
