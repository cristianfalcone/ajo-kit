import type { Stateless } from 'ajo'
import type { LayoutArgs } from '@kit'

const AuthLayout: Stateless<LayoutArgs> = ({ children }) => (
	<div class="flex-grow flex items-center justify-center py-8">
		<div class="w-full max-w-sm p-8 rounded-xl glass shadow-lg">
			{children}
		</div>
	</div>
)

export default AuthLayout
