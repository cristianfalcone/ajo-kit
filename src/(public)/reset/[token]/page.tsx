import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import { Alert, Button, Feedback, Input, Link } from '/src/ui'

type Result = { redirect: string }

interface Data {
	valid: boolean
}

const Reset: Stateful<Props<Data>> = function* (args) {

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
					<Alert tone="danger" class="mb-4">
						This reset link is invalid or has expired.
					</Alert>
					<Link href="/forgot">
						Request a new link
					</Link>
				</div>
			) : (
				<form set:onsubmit={form.submit} class="space-y-4">
					<Input
						type="password"
						name="password"
						label="New Password"
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
						{form.loading ? 'Resetting...' : 'Reset Password'}
					</Button>
				</form>
			)}
		</>
	)
	}
}

export default Reset
