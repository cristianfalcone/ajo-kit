import type { Stateless } from 'ajo'
import type { LayoutArgs } from '/src/constants'

const AuthLayout: Stateless<LayoutArgs> = ({ children }) => (
	<div class="flex-grow flex items-center justify-center py-8">
		<div class="w-full max-w-sm p-8 rounded-xl ring-1 ring-slate-200/70 dark:ring-white/10 bg-white/60 dark:bg-white/5 backdrop-blur shadow-lg">
			{children}
		</div>
	</div>
)

export default AuthLayout
