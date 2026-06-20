import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'

type LinkProps = WithChildren<IntrinsicElements['a'] & {
	weight?: 'medium' | 'normal'
	class?: string
}>

const weightClass = {
	normal: '',
	medium: 'font-medium',
}

/** Shared inline text link styling. */
const Link: Stateless<LinkProps> = ({
	weight = 'medium',
	class: classes,
	children,
	...props
}) => (
	<a
		{...props}
		class={clsx('text-accent hover:text-primary dark:text-accent dark:hover:text-accent/70', weightClass[weight], classes)}
	>
		{children}
	</a>
)

export default Link
