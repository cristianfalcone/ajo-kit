import type { IntrinsicElements, Stateless, WithChildren } from 'ajo'
import { clx, part } from 'ajo-ui/utils'
import { emptyChildren } from './internal/recipes'

export type BreadcrumbArgs = WithChildren<IntrinsicElements['nav'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbListArgs = WithChildren<IntrinsicElements['ol'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbItemArgs = WithChildren<IntrinsicElements['li'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbLinkArgs = WithChildren<IntrinsicElements['a'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbPageArgs = WithChildren<IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}>

export type BreadcrumbSeparatorArgs = BreadcrumbItemArgs

export type BreadcrumbEllipsisArgs = IntrinsicElements['span'] & {
	/** Additional UnoCSS classes. */
	class?: string
}

/** Landmark wrapper for breadcrumb navigation. */
const Breadcrumb: Stateless<BreadcrumbArgs> = ({
	children,
	'aria-label': ariaLabel = 'breadcrumb',
	class: classes,
	...attrs
}) => (
	<nav
		{...attrs}
		aria-label={ariaLabel}
		class={classes}
		data-slot="breadcrumb"
	>
		{children}
	</nav>
)

/** Ordered breadcrumb item list. */
const BreadcrumbList = part<BreadcrumbListArgs>('ol', 'breadcrumb-list', { class: 'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5' })

/** Single breadcrumb list item. */
const BreadcrumbItem = part<BreadcrumbItemArgs>('li', 'breadcrumb-item', { class: 'inline-flex items-center gap-1.5' })

/** Clickable breadcrumb link. */
const BreadcrumbLink = part<BreadcrumbLinkArgs>('a', 'breadcrumb-link', { class: 'transition-colors hover:text-foreground' })

/** Current page marker inside a breadcrumb. */
const BreadcrumbPage = part<BreadcrumbPageArgs>('span', 'breadcrumb-page', {
	'aria-current': 'page',
	'aria-disabled': 'true',
	class: 'font-normal text-foreground',
	role: 'link',
})

/** Decorative separator between breadcrumb items. */
const BreadcrumbSeparator: Stateless<BreadcrumbSeparatorArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<li
		{...attrs}
		aria-hidden="true"
		class={clx('inline-flex items-center justify-center [&>svg]:size-3.5', classes)}
		data-slot="breadcrumb-separator"
		role="presentation"
	>
		{emptyChildren(children) ? <span aria-hidden="true" class="i-lucide-chevron-right block size-3.5 shrink-0 text-muted-foreground" /> : children}
	</li>
)

/** Collapsed breadcrumb range indicator, hidden from assistive technology. */
const BreadcrumbEllipsis: Stateless<BreadcrumbEllipsisArgs> = ({ class: classes, ...attrs }) => (
	<span
		{...attrs}
		aria-hidden="true"
		class={clx('flex size-9 items-center justify-center', classes)}
		data-slot="breadcrumb-ellipsis"
		role="presentation"
	>
		<span class="i-lucide-ellipsis size-4" />
	</span>
)

export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
}
