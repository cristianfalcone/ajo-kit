import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { action } from '@kit/client'
import { Button, Feedback, Input, Panel } from '/src/ui'

type NameResult = { success: boolean; name: string }
type PasswordResult = { success: boolean }

interface Data {
	user?: { id: number; name: string; email: string }
}

const Profile: Stateful<Props<Data>> = function* (args) {

	const nameForm = action<NameResult>('name')
	const passwordForm = action<PasswordResult>('password')
	for (args of this) {
		const user = args.data?.user

		yield (
		<div class="space-y-8">
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">
					Profile Settings
				</h1>
			</div>

			<Panel>
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
					Update Name
				</h2>

				<form set:onsubmit={nameForm.submit} class="space-y-4">
					<Input
						name="name"
						label="Name"
						value={nameForm.data?.name ?? user?.name ?? ''}
						disabled={nameForm.loading}
					/>

					{nameForm.error && (
						<Feedback>{nameForm.error.message}</Feedback>
					)}

					{nameForm.data?.success && (
						<Feedback tone="success">Name updated successfully!</Feedback>
					)}

					<Button
						type="submit"
						disabled={nameForm.loading}
					>
						{nameForm.loading ? 'Saving...' : 'Save Name'}
					</Button>
				</form>
			</Panel>

			<Panel>
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
					Change Password
				</h2>

				<form set:onsubmit={passwordForm.submit} class="space-y-4">
					<Input
						type="password"
						name="current"
						label="Current Password"
						required
						autocomplete="current-password"
						disabled={passwordForm.loading}
					/>

					<Input
						type="password"
						name="password"
						label="New Password"
						hint="At least 8 characters"
						required
						minlength={8}
						autocomplete="new-password"
						disabled={passwordForm.loading}
					/>

					<Input
						type="password"
						name="confirm"
						label="Confirm New Password"
						required
						minlength={8}
						autocomplete="new-password"
						disabled={passwordForm.loading}
					/>

					{passwordForm.error && (
						<Feedback>{passwordForm.error.message}</Feedback>
					)}

					{passwordForm.data?.success && (
						<Feedback tone="success">Password changed successfully!</Feedback>
					)}

					<Button
						type="submit"
						disabled={passwordForm.loading}
					>
						{passwordForm.loading ? 'Changing...' : 'Change Password'}
					</Button>
				</form>
			</Panel>
		</div>
	)
	}
}

export default Profile
