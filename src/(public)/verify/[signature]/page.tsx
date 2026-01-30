import type { Stateful } from 'ajo'
import type { PageArgs } from '/src/constants'

interface Data {
	error?: string
	verified?: boolean
	redirect?: string
}

const VerifyResult: Stateful<PageArgs<Data>> = function* (args) {

	const error = args.data?.error
	const verified = args.data?.verified

	while (true) yield (
		<>
			<h1 class="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">
				Email Verification
			</h1>

			<div class="text-center">
				{error ? (
					<>
						<div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
							<p class="text-red-800 dark:text-red-200">{error}</p>
						</div>
						<a href="/verify" class="text-accent hover:text-primary dark:text-accent dark:hover:text-accent/70 font-medium">
							Request a new verification link
						</a>
					</>
				) : verified ? (
					<>
						<div class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
							<p class="text-green-800 dark:text-green-200">
								Your email has been verified!
							</p>
						</div>
						<a href="/dashboard" class="text-accent hover:text-primary dark:text-accent dark:hover:text-accent/70 font-medium">
							Go to dashboard
						</a>
					</>
				) : null}
			</div>
		</>
	)
}

export default VerifyResult
