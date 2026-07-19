import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import Button from 'ajo-ui-playa/button'
import { Field, FieldError, FieldLabel } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

type Result = { deleted: boolean }

const Delete: Stateful<PageArgs> = function* () {

	const form = action<Result>()

	while (true) {

		if (form.data?.deleted) {
			location.href = '/'
			return
		}

		yield (
			<div class="space-y-8">
				<div class="space-y-2">
					<h1 class="text-2xl font-semibold tracking-tight">
						Delete Account
					</h1>
					<p class="text-sm text-muted-foreground">
						This action is permanent and cannot be undone.
					</p>
				</div>

				<div class="space-y-4 rounded-lg bg-danger/10 p-6 text-danger inset-ring inset-ring-danger/25">
					<h2 class="text-base font-semibold">
						Danger Zone
					</h2>

					<p class="text-sm text-danger/85">
						Deleting your account will permanently remove all your data, including sessions, API tokens, and role memberships.
					</p>

					<form set:onsubmit={form.submit} class="space-y-4">
						<Field invalid class="max-w-xs">
							<FieldLabel for="confirmation" class="text-danger">Type DELETE to confirm</FieldLabel>
							<Input
								id="confirmation"
								name="confirmation"
								required
								pattern="DELETE"
								autocomplete="off"
								disabled={form.loading}
								aria-invalid="true"
							/>
						</Field>

						{form.error && (
							<FieldError>{form.error.message}</FieldError>
						)}

						<Button
							type="submit"
							disabled={form.loading}
							variant="danger"
						>
							{form.loading ? 'Deleting...' : 'Delete My Account'}
						</Button>
					</form>
				</div>
			</div>
		)
	}
}

export default Delete
