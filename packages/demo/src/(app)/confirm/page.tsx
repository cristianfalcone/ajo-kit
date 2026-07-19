import type { Stateful } from 'ajo'
import { type PageArgs, navigate } from '@kit'
import { action } from '@kit/client'
import Button from 'ajo-ui-playa/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ajo-ui-playa/card'
import { FieldError } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

type Result = { confirmed: boolean }

const Confirm: Stateful<PageArgs> = function* () {

	const form = action<Result>()

	while (true) {

		if (form.data?.confirmed) {
			const params = new URLSearchParams(location.search)
			navigate(params.get('redirect') || '/dashboard')
			return
		}

		yield (
			<div class="flex-1 flex items-center justify-center px-4 py-8">
				<Card class="w-full max-w-sm">
					<CardHeader>
						<CardTitle class="text-2xl tracking-tight">
							Confirm Password
						</CardTitle>
						<CardDescription>
							Please enter your password to continue.
						</CardDescription>
					</CardHeader>

					<CardContent>
						<form set:onsubmit={form.submit} class="space-y-4">
							<Input
								type="password"
								name="password"
								required
								autocomplete="current-password"
								placeholder="Password"
								aria-label="Password"
								disabled={form.loading}
							/>

							{form.error && (
								<FieldError>{form.error.message}</FieldError>
							)}

							<Button
								type="submit"
								disabled={form.loading}
								class="w-full"
							>
								{form.loading ? 'Confirming...' : 'Confirm'}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		)
	}
}

Confirm.attrs = { class: 'flex-1 flex flex-col' }

export default Confirm
