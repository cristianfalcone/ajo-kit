import type { Stateless } from 'ajo'
import type { PageArgs } from '../../constants'

const Logout: Stateless<PageArgs> = () => (
	<div class="text-center">
		<h1 class="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
			Sign Out
		</h1>

		<p class="mb-6 text-slate-600 dark:text-slate-400">
			Are you sure you want to sign out?
		</p>

		<form method="post" action="/logout?/signout">
			<button
				type="submit"
				class="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition shadow hover:shadow-lg"
			>
				Sign Out
			</button>
		</form>

		<a
			href="/"
			class="mt-4 inline-block text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
		>
			Cancel
		</a>
	</div>
)

export default Logout
