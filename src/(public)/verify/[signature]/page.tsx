import type { Stateful } from 'ajo'
import type { PageArgs } from '@kit'
import { Alert, AlertDescription, CardContent, CardFooter, CardHeader } from '/src/ui'

interface Data {
	error?: string
	verified?: boolean
	redirect?: string
}

const VerifyResult: Stateful<PageArgs<Data>> = function* (args) {

	for (args of this) {
		const error = args.data?.error
		const verified = args.data?.verified

		yield (
		<>
			<CardHeader class="text-center">
				<h1 class="text-2xl font-semibold tracking-tight">
					Email Verification
				</h1>
			</CardHeader>

			{error ? (
				<>
					<CardContent>
						<Alert variant="danger">
							<span data-slot="alert-icon" class="i-lucide-alert-circle" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					</CardContent>

					<CardFooter class="justify-center">
						<a href="/verify" class="text-sm font-medium text-primary underline-offset-4 hover:underline">
							Request a new verification link
						</a>
					</CardFooter>
				</>
			) : verified ? (
				<>
					<CardContent>
						<Alert variant="success">
							<span data-slot="alert-icon" class="i-lucide-check-circle" />
							<AlertDescription>Your email has been verified!</AlertDescription>
						</Alert>
					</CardContent>

					<CardFooter class="justify-center">
						<a href="/dashboard" class="text-sm font-medium text-primary underline-offset-4 hover:underline">
							Go to dashboard
						</a>
					</CardFooter>
				</>
			) : null}
		</>
	)
	}
}

export default VerifyResult
