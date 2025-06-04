import type { Children } from 'ajo'

type Args = {
	children: Children
}

export default (args: Args) =>
	<>
		<div class="bg-gray-600 p-4 text-white text-2xl">
			Blog Layout
		</div>
		{args.children}
	</>
