import type { Stateful } from 'ajo'
import { action } from 'ajo-kit/client'
import Button from 'ajo-ui-playa/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ajo-ui-playa/card'

const field = 'h-10 w-full rounded-md border bg-transparent px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

const Account: Stateful<{ register?: boolean }> = function* () {
	const form = action()

	for (const { register = false } of this) {
		yield (
			<Card>
				<CardHeader>
					<CardTitle role="heading" aria-level={1}>{register ? 'Create account' : 'Sign in'}</CardTitle>
					<CardDescription>{register ? 'Your notes belong to your account.' : 'Welcome back to your notes.'}</CardDescription>
				</CardHeader>
				<CardContent>
					<form method="post" class="space-y-4" set:onsubmit={form.submit}>
						{register && <div class="space-y-1">
							<label for="name">Name</label>
							<input id="name" name="name" class={field} autocomplete="name" maxlength={80} required disabled={form.loading} />
						</div>}
						<div class="space-y-1">
							<label for="email">Email</label>
							<input id="email" name="email" type="email" class={field} autocomplete="email" maxlength={254} required disabled={form.loading} />
						</div>
						<div class="space-y-1">
							<label for="password">Password</label>
							<input id="password" name="password" type="password" class={field} autocomplete={register ? 'new-password' : 'current-password'} minlength={register ? 12 : undefined} maxlength={128} required disabled={form.loading} />
							{register && <p class="text-sm text-muted-foreground">Use at least 12 characters.</p>}
						</div>
						{register && <div class="space-y-1">
							<label for="confirm">Confirm password</label>
							<input id="confirm" name="confirm" type="password" class={field} autocomplete="new-password" minlength={12} maxlength={128} required disabled={form.loading} />
						</div>}
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
