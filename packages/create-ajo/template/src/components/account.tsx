import type { Stateful } from 'ajo'
import { action } from 'ajo-kit/client'
import { Button } from 'ajo-ui-playa/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ajo-ui-playa/card'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldRow } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

const Account: Stateful<{ register?: boolean }> = function* () {
	const form = action()

	for (const { register = false } of this) {
		const password = (
			<Field name="password">
				<FieldLabel>Password</FieldLabel>
				<Input name="password" type="password" autocomplete={register ? 'new-password' : 'current-password'} minlength={register ? 12 : undefined} maxlength={128} required disabled={form.loading} />
				{register && <FieldDescription>Use at least 12 characters.</FieldDescription>}
			</Field>
		)

		yield (
			<Card>
				<CardHeader>
					<CardTitle role="heading" aria-level={1}>{register ? 'Create account' : 'Sign in'}</CardTitle>
					<CardDescription>{register ? 'Your notes belong to your account.' : 'Welcome back to your notes.'}</CardDescription>
				</CardHeader>
				<CardContent>
					<form method="post" class="space-y-6" set:onsubmit={form.submit}>
						<FieldGroup>
							{register && <Field name="name">
								<FieldLabel>Name</FieldLabel>
								<Input name="name" autocomplete="name" maxlength={80} required disabled={form.loading} />
							</Field>}
							<Field name="email">
								<FieldLabel>Email</FieldLabel>
								<Input name="email" type="email" autocomplete="email" maxlength={254} required disabled={form.loading} />
							</Field>
							{register ? <FieldRow>
								{password}
								<Field name="confirm">
									<FieldLabel>Confirm password</FieldLabel>
									<Input name="confirm" type="password" autocomplete="new-password" minlength={12} maxlength={128} required disabled={form.loading} />
								</Field>
							</FieldRow> : password}
						</FieldGroup>
						{form.error && <p class="text-sm text-danger" role="alert">{form.error.message}</p>}
						<Button type="submit" disabled={form.loading}>
							{form.loading ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
						</Button>
						<p class="text-sm"><a class="underline" href={register ? '/login' : '/register'}>{register ? 'Already registered? Sign in' : 'New here? Create an account'}</a></p>
					</form>
				</CardContent>
			</Card>
		)
	}
}

export default Account
