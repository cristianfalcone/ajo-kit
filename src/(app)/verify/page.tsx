import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import { Alert, AlertDescription, Button, Card, CardContent } from '/src/ui'
import type { VerificationResult } from '/src/verification'

const Verify: Stateful<PageArgs> = function* () {

	const form = action<VerificationResult>()

	while (true) yield (
		<section class="flex min-h-[calc(100vh-10rem)] items-start justify-center py-8">
			<Card class="w-full max-w-xl text-center">
				<CardContent class="space-y-6">
					<div class="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary inset-ring inset-ring-primary/25">
						<span class="i-lucide-mail size-6" />
					</div>

					<div class="space-y-2">
						<h1 class="text-2xl font-semibold tracking-tight">
							Verify your email
						</h1>
						<p class="text-sm text-muted-foreground">
							We sent a verification link to your email address. Please check your inbox and click the link to verify your account.
						</p>
					</div>

					<div class="space-y-4">
						{form.data?.sent && (
							<Alert variant="success" class="text-left">
								<span data-slot="alert-icon" class="i-lucide-check-circle" />
								<AlertDescription>Verification email sent.</AlertDescription>
							</Alert>
						)}

						{form.error && (
							<Alert variant="danger" class="text-left">
								<span data-slot="alert-icon" class="i-lucide-alert-circle" />
								<AlertDescription>{form.error.message}</AlertDescription>
							</Alert>
						)}

						<form set:onsubmit={form.submit} class="flex justify-center">
							<Button type="submit" disabled={form.loading}>
								<span class="i-lucide-mail size-4" />
								{form.loading ? 'Resending...' : 'Resend verification email'}
							</Button>
						</form>
					</div>
				</CardContent>
			</Card>
		</section>
	)
}

export default Verify
