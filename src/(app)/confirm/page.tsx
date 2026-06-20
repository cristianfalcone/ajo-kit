import type { Stateful } from 'ajo'
import { type Props, navigate } from '@kit'
import { action } from '@kit/client'
import { Button, Feedback, Input, Panel } from '/src/ui'

type Result = { confirmed: boolean }

const Confirm: Stateful<Props> = function* () {

	const form = action<Result>()

	while (true) {

		if (form.data?.confirmed) {
			const params = new URLSearchParams(location.search)
			navigate(params.get('redirect') || '/dashboard')
			return
		}

		yield (
			<div class="flex-1 flex items-center justify-center px-4">
				<Panel class="w-full max-w-sm">
					<h1 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
						Confirm Password
					</h1>
					<p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
						Please enter your password to continue.
					</p>

					<form set:onsubmit={form.submit} class="space-y-4">
						<Input
							type="password"
							name="password"
							required
							autocomplete="current-password"
							placeholder="Password"
							disabled={form.loading}
						/>

						{form.error && (
							<Feedback>{form.error.message}</Feedback>
						)}

						<Button
							type="submit"
							disabled={form.loading}
							wide
						>
							{form.loading ? 'Confirming...' : 'Confirm'}
						</Button>
					</form>
				</Panel>
			</div>
		)
	}
}

Confirm.attrs = { class: 'flex-1 flex flex-col' }

export default Confirm
