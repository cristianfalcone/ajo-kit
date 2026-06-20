import type { Stateful } from 'ajo'
import type { Props } from '@kit'
import { Alert, Link } from '/src/ui'

interface Data {
	error?: string
	verified?: boolean
	redirect?: string
}

const VerifyResult: Stateful<Props<Data>> = function* (args) {

	for (args of this) {
		const error = args.data?.error
		const verified = args.data?.verified

		yield (
		<>
			<h1 class="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">
				Email Verification
			</h1>

			<div class="text-center">
				{error ? (
					<>
						<Alert tone="danger" class="mb-4">{error}</Alert>
						<Link href="/verify">
							Request a new verification link
						</Link>
					</>
				) : verified ? (
					<>
						<Alert class="mb-4">Your email has been verified!</Alert>
						<Link href="/dashboard">
							Go to dashboard
						</Link>
					</>
				) : null}
			</div>
		</>
	)
	}
}

export default VerifyResult
