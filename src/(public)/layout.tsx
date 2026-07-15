import type { Stateless } from 'ajo'
import type { LayoutArgs } from '@kit'
import { Card } from 'ajo-ui-playa/card'
import Water from '/src/water'

const AuthLayout: Stateless<LayoutArgs> = ({ children }) => (
	// Pages are stateful components, so Ajo wraps them in a div; collapse it so
	// card slots participate in the card's flex column and inherit its gap.
	<div class="flex-grow flex items-center justify-center px-6 py-12">
		<Water />
		<Card class="w-full max-w-md [&>div:not([data-slot])]:contents">
			{children}
		</Card>
	</div>
)

export default AuthLayout
