import type { Stateless } from 'ajo'
import type { PageArgs } from 'ajo-kit'
import { Card, CardContent, CardHeader, CardTitle } from 'ajo-ui-playa/card'

const Verification: Stateless<PageArgs<{ verified: boolean }>> = ({ data }) => (
	<Card>
		<CardHeader><CardTitle role="heading" aria-level={1}>{data?.verified ? 'Email verified' : 'Invalid or expired verification link'}</CardTitle></CardHeader>
		<CardContent><a href="/notes" class="underline">Return to my notes</a></CardContent>
	</Card>
)

export default Verification
