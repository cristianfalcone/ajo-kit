import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import type { Signup } from '/src/data/registration'
import { Button, CardContent, CardDescription, CardFooter, CardHeader, Field, FieldDescription, FieldError, FieldLabel, Input } from '/src/ui'

type Result = { redirect: string }
type Data = { signup: Signup }

const Register: Stateful<PageArgs<Data>> = function* () {

	const form = action<Result>()

	for (const { data } of this) yield data?.signup === 'invite' ? (
		<>
			<CardHeader class="text-center">
				<h1 class="text-2xl font-semibold tracking-tight text-balance">
					Registration is by invitation only
				</h1>
				<CardDescription class="text-balance">
					New accounts are currently created from invitation links
				</CardDescription>
			</CardHeader>

			<CardFooter class="justify-center">
				<p class="text-center text-sm text-muted-foreground">
					Already have an account?{' '}
					<a href="/login" class="font-medium text-primary underline-offset-4 hover:underline">
						Sign in
					</a>
				</p>
			</CardFooter>
		</>
	) : (
		<>
			<CardHeader class="text-center">
				<h1 class="text-2xl font-semibold tracking-tight">
					Create Account
				</h1>
				<CardDescription>
					Enter your details below to create your account
				</CardDescription>
			</CardHeader>

			<CardContent>
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

			<CardFooter class="justify-center">
				<p class="text-center text-sm text-muted-foreground">
					Already have an account?{' '}
					<a href="/login" class="font-medium text-primary underline-offset-4 hover:underline">
						Sign in
					</a>
				</p>
			</CardFooter>
		</>
	)
}

export default Register
