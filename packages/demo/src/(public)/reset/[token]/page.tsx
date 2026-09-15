import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import { Alert, AlertDescription } from 'ajo-ui-playa/alert'
import Button from 'ajo-ui-playa/button'
import { CardContent, CardDescription, CardFooter, CardHeader } from 'ajo-ui-playa/card'
import { FieldError } from 'ajo-ui-playa/field'
import Password from '../../password'

type Result = { redirect: string }

interface Data {
	valid: boolean
}

const Reset: Stateful<PageArgs<Data>> = function* (args) {

	const form = action<Result>()
	for (args of this) {
		const valid = args.data?.valid

		yield (
		<>
			<CardHeader class="text-center">
				<h1 class="text-2xl font-semibold tracking-tight">
					Set New Password
				</h1>
				<CardDescription>
					Choose a new password for your account
				</CardDescription>
			</CardHeader>

			{!valid ? (
				<>
					<CardContent>
						<Alert variant="danger">
							<span data-slot="alert-icon" class="i-lucide-alert-circle" />
							<AlertDescription>
								This reset link is invalid or has expired.
							</AlertDescription>
						</Alert>
					</CardContent>

					<CardFooter class="justify-center">
						<a href="/forgot" class="text-sm font-medium text-primary underline-offset-4 hover:underline">
							Request a new link
						</a>
					</CardFooter>
				</>
			) : (
				<CardContent>
					<form set:onsubmit={form.submit} class="grid gap-6">
						<Password disabled={form.loading} label="New Password" />

						{form.error && (
							<FieldError>{form.error.message}</FieldError>
						)}

						<Button
							type="submit"
							disabled={form.loading}
							class="w-full"
						>
							{form.loading ? 'Resetting...' : 'Reset Password'}
						</Button>
					</form>
				</CardContent>
			)}
		</>
	)
	}
}

export default Reset
