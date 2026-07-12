import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { action } from '@kit/client'
import { Button, Card, CardContent, CardHeader, CardTitle, Field, FieldDescription, FieldError, FieldLabel, Input, toast } from '/src/ui'

type NameResult = { success: boolean; name: string }
type PasswordResult = { success: boolean }

interface Data {
	user?: { id: number; name: string; email: string }
}

const Profile: Stateful<PageArgs<Data>> = function* (args) {

	const nameForm = action<NameResult>('name')
	const passwordForm = action<PasswordResult>('password')
	for (args of this) {
		const user = args.data?.user

		yield (
			<div class="space-y-8">
				<div>
					<h1 class="text-2xl font-semibold tracking-tight">
						Profile Settings
					</h1>
				</div>

				<div class="grid gap-4 xl:grid-cols-2 xl:items-start">
					<Card>
						<CardHeader>
							<CardTitle>Update Name</CardTitle>
						</CardHeader>

						<CardContent>
							<form
								class="space-y-4"
								set:onsubmit={(event: SubmitEvent) => {
									event.preventDefault()
									const form = event.currentTarget as HTMLFormElement
									nameForm.invoke(Object.fromEntries(new FormData(form))).then(result => {
										if (result?.success) toast.success('Name updated successfully!')
									})
								}}
							>
								<Field>
									<FieldLabel for="name">Name</FieldLabel>
									<Input
										id="name"
										name="name"
										value={nameForm.data?.name ?? user?.name ?? ''}
										disabled={nameForm.loading}
									/>
								</Field>

								{nameForm.error && (
									<FieldError>{nameForm.error.message}</FieldError>
								)}

								<Button
									type="submit"
									disabled={nameForm.loading}
								>
									{nameForm.loading ? 'Saving...' : 'Save Name'}
								</Button>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Change Password</CardTitle>
						</CardHeader>

						<CardContent>
							<form
								class="space-y-4"
								set:onsubmit={(event: SubmitEvent) => {
									event.preventDefault()
									const form = event.currentTarget as HTMLFormElement
									passwordForm.invoke(Object.fromEntries(new FormData(form))).then(result => {
										if (result?.success) {
											toast.success('Password changed successfully!')
											form.reset()
										}
									})
								}}
							>
								<Field>
									<FieldLabel for="current">Current Password</FieldLabel>
									<Input
										id="current"
										type="password"
										name="current"
										required
										autocomplete="current-password"
										disabled={passwordForm.loading}
									/>
								</Field>

								<Field>
									<FieldLabel for="password">New Password</FieldLabel>
									<Input
										id="password"
										type="password"
										name="password"
										required
										minlength={8}
										autocomplete="new-password"
										disabled={passwordForm.loading}
										aria-describedby="password-hint"
									/>
									<FieldDescription id="password-hint">At least 8 characters</FieldDescription>
								</Field>

								<Field>
									<FieldLabel for="confirm">Confirm New Password</FieldLabel>
									<Input
										id="confirm"
										type="password"
										name="confirm"
										required
										minlength={8}
										autocomplete="new-password"
										disabled={passwordForm.loading}
									/>
								</Field>

								{passwordForm.error && (
									<FieldError>{passwordForm.error.message}</FieldError>
								)}

								<Button
									type="submit"
									disabled={passwordForm.loading}
								>
									{passwordForm.loading ? 'Changing...' : 'Change Password'}
								</Button>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}
}

export default Profile
