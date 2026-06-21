import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import { Alert, Button, Panel } from '/src/ui'
import type { VerificationResult } from '/src/verification'

const Verify: Stateful<Props> = function* () {

	const form = action<VerificationResult>()

	while (true) yield (
		<section class="flex min-h-[calc(100vh-10rem)] items-start justify-center py-10">
			<Panel radius="xl" padding="lg" class="w-full max-w-xl text-center">
				<div class="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent inset-ring inset-ring-accent/20">
					<span class="i-lucide-mail size-7" />
				</div>

				<h1 class="text-2xl font-bold text-slate-900 dark:text-white">
					Verify your email
				</h1>
				<p class="mt-3 text-slate-600 dark:text-slate-400">
					We sent a verification link to your email address. Please check your inbox and click the link to verify your account.
				</p>

				<div class="mt-6 space-y-3">
					{form.data?.sent && (
						<Alert class="text-left">Verification email sent.</Alert>
					)}

					{form.error && (
						<Alert tone="danger" class="text-left">{form.error.message}</Alert>
					)}

					<form set:onsubmit={form.submit} class="flex justify-center">
						<Button type="submit" icon="i-lucide-mail" disabled={form.loading}>
							{form.loading ? 'Resending...' : 'Resend verification email'}
						</Button>
					</form>
				</div>
			</Panel>
		</section>
	)
}

export default Verify
