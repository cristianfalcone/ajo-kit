import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import { Alert, Button, Feedback, Input, Link } from '/src/ui'

type Result = { redirect: string }

type Data = {
	invite: {
		email: string
		name: string
	} | null
}

const Invite: Stateful<Props<Data>> = function* () {
	const form = action<Result>()

	for (const { data } of this) {
		const invite = data?.invite

		yield (
			<>
				<h1 class="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">
					Accept Invitation
				</h1>

				{!invite ? (
					<div class="text-center">
						<Alert tone="danger" class="mb-4">
							This invitation link is invalid or has expired.
						</Alert>
						<Link href="/login">
							Sign in
						</Link>
					</div>
				) : (
					<form set:onsubmit={form.submit} class="space-y-4">
						<div>
							<p class="text-sm font-medium text-slate-700 dark:text-slate-300">
								Email
							</p>
							<p class="mt-1 rounded-lg bg-[#e8f0ef]/80 px-4 py-2 text-sm text-slate-800 inset-ring inset-ring-slate-900/10 dark:bg-white/10 dark:text-slate-200 dark:inset-ring-white/10">
								{invite.email}
							</p>
						</div>

						<Input
							type="text"
							name="name"
							label="Name"
							value={invite.name}
							autocomplete="name"
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
				)}
			</>
		)
	}
}

export default Invite
