import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import { Alert, AlertDescription } from 'ajo-ui-playa/alert'
import Button from 'ajo-ui-playa/button'
import { CardContent, CardDescription, CardFooter, CardHeader } from 'ajo-ui-playa/card'
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

type Result = { redirect: string }

type Data = {
	invite: {
		email: string
		name: string
	} | null
}

const Invite: Stateful<PageArgs<Data>> = function* () {
	const form = action<Result>()

	for (const { data } of this) {
		const invite = data?.invite

		yield (
			<>
				<CardHeader class="text-center">
					<h1 class="text-2xl font-semibold tracking-tight">
						Accept Invitation
					</h1>
					<CardDescription>
						Complete your details below to create your account
					</CardDescription>
				</CardHeader>

				{!invite ? (
					<>
						<CardContent>
							<Alert variant="danger">
								<span data-slot="alert-icon" class="i-lucide-alert-circle" />
								<AlertDescription>
									This invitation link is invalid or has expired.
								</AlertDescription>
							</Alert>
						</CardContent>

						<CardFooter class="justify-center">
							<a href="/login" class="text-sm font-medium text-primary underline-offset-4 hover:underline">
								Sign in
							</a>
						</CardFooter>
					</>
				) : (
					<CardContent>
						<form set:onsubmit={form.submit} class="grid gap-6">
							<Field>
								<FieldTitle>Email</FieldTitle>
								<p class="flex h-9 w-full items-center rounded-md bg-muted/50 px-3 text-sm edge">
									{invite.email}
								</p>
							</Field>

							<Field>
								<FieldLabel for="name">Name</FieldLabel>
								<Input
									id="name"
									type="text"
									name="name"
									value={invite.name}
									autocomplete="name"
									disabled={form.loading}
								/>
							</Field>

							<Field>
								<FieldLabel for="password">Password</FieldLabel>
								<Input
									id="password"
									type="password"
									name="password"
									required
									minlength={8}
									autocomplete="new-password"
									disabled={form.loading}
									aria-describedby="password-hint"
								/>
								<FieldDescription id="password-hint">At least 8 characters</FieldDescription>
							</Field>

							<Field>
								<FieldLabel for="confirm">Confirm Password</FieldLabel>
								<Input
									id="confirm"
									type="password"
									name="confirm"
									required
									minlength={8}
									autocomplete="new-password"
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
								{form.loading ? 'Creating account...' : 'Create Account'}
							</Button>
						</form>
					</CardContent>
				)}
			</>
		)
	}
}

export default Invite
