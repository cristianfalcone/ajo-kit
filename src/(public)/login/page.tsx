import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import type { Signup } from '/src/data/registration'
import { Button, CardContent, CardDescription, CardFooter, CardHeader, Checkbox, Field, FieldError, FieldLabel, Input } from '/src/ui'

type Result = { redirect: string }
type Data = { signup: Signup }

const Login: Stateful<PageArgs<Data>> = function* () {

	const form = action<Result>()

	for (const { data } of this) yield (
		<>
			<CardHeader class="text-center">
				<h1 class="text-2xl font-semibold tracking-tight">
					Sign In
				</h1>
				<CardDescription>
					Enter your email and password to sign in
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

					{/* Grid keeps the link on the label row while the DOM order keeps tab focus email → password → link. */}
					<div role="group" class="grid grid-cols-[1fr_auto] items-center gap-3">
						<FieldLabel for="password">Password</FieldLabel>
						<Input
							id="password"
							type="password"
							name="password"
							required
							autocomplete="current-password"
							disabled={form.loading}
							class="col-span-2"
						/>
						<a href="/forgot" class="col-start-2 row-start-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
							Forgot password?
						</a>
					</div>

					<Field orientation="horizontal">
						<Checkbox id="remember" name="remember" value="true" disabled={form.loading} />
						<FieldLabel for="remember">Remember me</FieldLabel>
					</Field>

					{form.error && (
						<FieldError>{form.error.message}</FieldError>
					)}

					<Button
						type="submit"
						disabled={form.loading}
						class="w-full"
					>
						{form.loading ? 'Signing in...' : 'Sign In'}
					</Button>

				</form>
			</CardContent>

			{data?.signup !== 'invite' && (
				<CardFooter class="justify-center">
					<p class="text-center text-sm text-muted-foreground">
						Don't have an account?{' '}
						<a href="/register" class="font-medium text-primary underline-offset-4 hover:underline">
							Sign up
						</a>
					</p>
				</CardFooter>
			)}
		</>
	)
}

export default Login
