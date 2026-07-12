import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import clsx from 'clsx'
import { emptyChildren } from 'ajo-ui/utils'
import { buttonVariants, type ButtonSize } from './button'

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
	children,
	'aria-label': ariaLabel = 'pagination',
	class: classes,
	role = 'navigation',
	...attrs
}) => (
	<nav
		{...attrs}
		aria-label={ariaLabel}
		class={clsx('mx-auto flex w-full justify-center', classes)}
		data-slot="pagination"
		role={role}
	>
		{children}
	</nav>
)

/** List wrapper for pagination items. */
const PaginationContent: Stateless<PaginationContentArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<ul
		{...attrs}
		class={clsx('flex flex-row items-center gap-1', classes)}
		data-slot="pagination-content"
	>
		{children}
	</ul>
)

/** Single pagination list item. */
const PaginationItem: Stateless<PaginationItemArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<li
		{...attrs}
		class={classes}
		data-slot="pagination-item"
	>
		{children}
	</li>
)

/** Numbered or custom pagination link. */
const PaginationLink: Stateless<PaginationLinkArgs> = ({
	children,
	class: classes,
	disabled,
	href,
	isActive,
	size = 'icon',
	tabindex,
	...attrs
}) => {
	const blocked = Boolean(disabled)

	return (
		<a
			{...attrs}
			aria-current={isActive ? 'page' : undefined}
			aria-disabled={blocked ? 'true' : undefined}
			class={buttonVariants({
				variant: isActive ? 'outline' : 'ghost',
				size,
				class: clsx(blocked && 'pointer-events-none opacity-50', classes),
			})}
			data-active={isActive ? 'true' : undefined}
			data-disabled={blocked ? 'true' : undefined}
			data-slot="pagination-link"
			href={blocked ? undefined : href}
			tabindex={blocked ? -1 : tabindex}
		>
			{children}
		</a>
	)
}

/** Link to the previous page. */
// size:'none' — the link owns its geometry, so the compact gap-1/px-2.5
// declared here actually render (the sized recipe's gap-2/px-4 beat them).
const PaginationPrevious: Stateless<PaginationDirectionArgs> = ({
	children,
	class: classes,
	size: _size,
	text = 'Previous',
	...attrs
}) => (
	<PaginationLink
		{...attrs}
		aria-label={attrs['aria-label'] ?? 'Go to previous page'}
		class={clsx('h-9 gap-1 rounded-md px-2.5 py-2 sm:pl-2.5 [&_svg:not([class*=size-])]:size-4', classes)}
		size="none"
	>
		{emptyChildren(children) ? (
			<>
				<span aria-hidden="true" class="i-lucide-chevron-left inline-block size-4 shrink-0" />
				<span class="hidden sm:block">{text}</span>
			</>
		) : children}
	</PaginationLink>
)

/** Link to the next page. */
const PaginationNext: Stateless<PaginationDirectionArgs> = ({
	children,
	class: classes,
	size: _size,
	text = 'Next',
	...attrs
}) => (
	<PaginationLink
		{...attrs}
		aria-label={attrs['aria-label'] ?? 'Go to next page'}
		class={clsx('h-9 gap-1 rounded-md px-2.5 py-2 sm:pr-2.5 [&_svg:not([class*=size-])]:size-4', classes)}
		size="none"
	>
		{emptyChildren(children) ? (
			<>
				<span class="hidden sm:block">{text}</span>
				<span aria-hidden="true" class="i-lucide-chevron-right inline-block size-4 shrink-0" />
			</>
		) : children}
	</PaginationLink>
)

/** Collapsed pagination range indicator. */
const PaginationEllipsis: Stateless<PaginationEllipsisArgs> = ({
	class: classes,
	...attrs
}) => (
	<span
		{...attrs}
		class={clsx('flex size-9 items-center justify-center', classes)}
		data-slot="pagination-ellipsis"
	>
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
