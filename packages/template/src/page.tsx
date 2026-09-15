import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ajo-ui-playa/card'

export default () => (
	<Card>
		<CardHeader>
			<CardTitle role="heading" aria-level={1}>Small notes. Just for you.</CardTitle>
			<CardDescription>A private notebook that stays in sync across your open tabs.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<p>Create an account, keep a few thoughts, and email yourself a copy whenever you need it.</p>
			<p class="flex gap-4">
				<a class="font-medium underline" href="/register">Create account</a>
				<a class="underline" href="/login">Sign in</a>
			</p>
		</CardContent>
	</Card>
)
