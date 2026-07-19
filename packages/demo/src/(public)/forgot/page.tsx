import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import { Alert, AlertDescription } from 'ajo-ui-playa/alert'
import Button from 'ajo-ui-playa/button'
import { CardContent, CardDescription, CardFooter, CardHeader } from 'ajo-ui-playa/card'
import { Field, FieldError, FieldLabel } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

type Result = { message: string }

const Forgot: Stateful<PageArgs> = function* () {

	const form = action<Result>()

	while (true) yield (
		<>
			<CardHeader class="text-center">
				<h1 class="text-2xl font-semibold tracking-tight">
					Reset Password
				</h1>
				<CardDescription class="text-balance">
					Enter your email and we'll send you a reset link
				</CardDescription>
			</CardHeader>

			<CardContent>
				{form.data ? (
					<Alert variant="success">
						<span data-slot="alert-icon" class="i-lucide-check-circle" />
						<AlertDescription>{form.data.message}</AlertDescription>
					</Alert>
				) : (
					<form set:onsubmit={form.submit} class="grid gap-6">
						<Field>
							<FieldLabel for="email">Email</FieldLabel>
							<Input
								id="email"
								type="email"
								name="email"
								required
								placeholder="you@example.com"
								autocomplete="email"
								disabled={form.loading}
							/>
						</Field>

						{form.error && (
							<FieldError>{form.error.message}</FieldError>
						)}

						<Button
							type="submit"
							disabled={form.loading}
							class="w-full"
						>
							{form.loading ? 'Sending...' : 'Send Reset Link'}
						</Button>
					</form>
				)}
			</CardContent>

			<CardFooter class="justify-center">
				<a href="/login" class="text-sm font-medium text-primary underline-offset-4 hover:underline">
					Back to login
				</a>
			</CardFooter>
		</>
	)
}

export default Forgot
