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

/**
 * Numbered or custom pagination link; a disabled link is a Button link without
 * `href`. The current page sits on enamel: the raised fill with its hairline.
 */
const PaginationLink: Stateless<PaginationLinkArgs> = ({ class: classes, isActive, size = 'icon', ...attrs }) => (
	<Button
		{...attrs}
		aria-current={isActive ? 'page' : undefined}
		as="a"
		class={clx(isActive && 'edge', classes)}
		data-active={isActive ? 'true' : undefined}
		data-slot="pagination-link"
		size={size}
		variant={isActive ? 'secondary' : 'ghost'}
	/>
)

// size 'none': the link owns its geometry, so the compact gap-1 and the
// tighter padding on the chevron's side render instead of losing to a sized
// recipe's gap-2/px-4. The chevron points where the pages go, in either direction.
const direction = (step: 'previous' | 'next'): Stateless<PaginationDirectionArgs> => {
	const next = step === 'next'

	return ({ children, class: classes, size: _size, text = next ? 'Next' : 'Previous', ...attrs }) => {
		const icon = <span aria-hidden="true" class={clx(next ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left', 'inline-block size-4 shrink-0 rtl:-scale-x-100')} />
		const label = <span class="hidden sm:block">{text}</span>

		return (
			<PaginationLink
				{...attrs}
				aria-label={attrs['aria-label'] ?? (next ? 'Go to next page' : 'Go to previous page')}
				class={clx('h-control gap-1 rounded-md px-2 [&_svg:not([class*=size-])]:size-4', next ? 'sm:ps-3' : 'sm:pe-3', classes)}
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
	<span {...attrs} class={clx('flex size-control items-center justify-center', classes)} data-slot="pagination-ellipsis">
		<span aria-hidden="true" class="i-lucide-ellipsis size-4 text-muted-foreground" />
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
