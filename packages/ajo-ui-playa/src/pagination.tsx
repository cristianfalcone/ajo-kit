import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'
import { Button, type ButtonSize } from './button'
import { emptyChildren } from './internal/recipes'

export type PaginationArgs = WithChildren<IntrinsicElements['nav'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type PaginationContentArgs = WithChildren<IntrinsicElements['ul'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type PaginationItemArgs = WithChildren<IntrinsicElements['li'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type PaginationLinkArgs = WithChildren<IntrinsicElements['a'] & {
	/** Mark this link as the current page. */
	isActive?: boolean
	/** Size variant from the shared Button surface. */
	size?: ButtonSize
	/** Disable the link while preserving layout. */
	disabled?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

export type PaginationDirectionArgs = PaginationLinkArgs & {
	/** Visible text for RTL/localized pagination controls. */
	text?: string
}

export type PaginationEllipsisArgs = IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

/** Landmark wrapper for page navigation controls. */
const Pagination: Stateless<PaginationArgs> = ({
	'aria-label': ariaLabel = 'pagination',
	class: classes,
	role = 'navigation',
	...attrs
}) => (
	<nav
		{...attrs}
		aria-label={ariaLabel}
		class={clx('mx-auto flex w-full justify-center', classes)}
		data-slot="pagination"
		role={role}
	/>
)

/** List wrapper for pagination items. */
const PaginationContent = part<PaginationContentArgs>('ul', 'pagination-content', { class: 'flex flex-row items-center gap-1' })

/** Single pagination list item. */
const PaginationItem = part<PaginationItemArgs>('li', 'pagination-item')

/** Numbered or custom pagination link; a disabled link is a Button link without `href`. */
const PaginationLink: Stateless<PaginationLinkArgs> = ({ isActive, size = 'icon', ...attrs }) => (
	<Button
		{...attrs}
		aria-current={isActive ? 'page' : undefined}
		as="a"
		data-active={isActive ? 'true' : undefined}
		data-slot="pagination-link"
		size={size}
		variant={isActive ? 'outline' : 'ghost'}
	/>
)

// size 'none': the link owns its geometry, so the compact gap-1/px-2.5 here
// render instead of losing to a sized recipe's gap-2/px-4.
const direction = (step: 'previous' | 'next'): Stateless<PaginationDirectionArgs> => {
	const next = step === 'next'

	return ({ children, class: classes, size: _size, text = next ? 'Next' : 'Previous', ...attrs }) => {
		const icon = <span aria-hidden="true" class={clx(next ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left', 'inline-block size-4 shrink-0')} />
		const label = <span class="hidden sm:block">{text}</span>

		return (
			<PaginationLink
				{...attrs}
				aria-label={attrs['aria-label'] ?? (next ? 'Go to next page' : 'Go to previous page')}
				class={clx('h-9 gap-1 rounded-md px-2.5 py-2 [&_svg:not([class*=size-])]:size-4', next ? 'sm:pr-2.5' : 'sm:pl-2.5', classes)}
				size="none"
			>
				{emptyChildren(children) ? (next ? <>{label}{icon}</> : <>{icon}{label}</>) : children}
			</PaginationLink>
		)
	}
}

/** Link to the previous page. */
const PaginationPrevious = direction('previous')

/** Link to the next page. */
const PaginationNext = direction('next')

/** Collapsed pagination range indicator. */
const PaginationEllipsis: Stateless<PaginationEllipsisArgs> = ({ class: classes, ...attrs }) => (
	<span {...attrs} class={clx('flex size-9 items-center justify-center', classes)} data-slot="pagination-ellipsis">
		<span aria-hidden="true" class="text-muted-foreground">...</span>
		<span class="sr-only">More pages</span>
	</span>
)

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
}
