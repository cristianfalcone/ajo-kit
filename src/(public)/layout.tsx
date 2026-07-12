import type { Stateless } from 'ajo'
import type { LayoutArgs } from '@kit'
import { Panel } from '/src/ui'

const AuthLayout: Stateless<LayoutArgs> = ({ children }) => (
	<div class="flex-grow flex items-center justify-center py-8">
		<Panel radius="xl" padding="lg" class="w-full max-w-sm shadow-lg">
			{children}
		</Panel>
	</div>
)

export default AuthLayout
