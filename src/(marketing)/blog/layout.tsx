import { Children } from 'ajo'

type Props = {
	children: Children
}

export default (props: Props) =>
	<>
		<div class="bg-gray-600 p-4 text-white text-2xl">
			Blog Layout
		</div>
		{props.children}
	</>
