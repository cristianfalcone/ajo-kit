import type { Stateless } from 'ajo'
import { clx, type OmitArg } from 'ajo-ui/utils'
import {
	Sidebar as BaseSidebar,
	SidebarContent as BaseSidebarContent,
	SidebarFooter as BaseSidebarFooter,
	SidebarGroup as BaseSidebarGroup,
	SidebarGroupAction as BaseSidebarGroupAction,
	SidebarGroupContent as BaseSidebarGroupContent,
	SidebarGroupLabel as BaseSidebarGroupLabel,
	SidebarHeader as BaseSidebarHeader,
	SidebarInset as BaseSidebarInset,
	SidebarMenu as BaseSidebarMenu,
	SidebarMenuAction as BaseSidebarMenuAction,
	SidebarMenuBadge as BaseSidebarMenuBadge,
	SidebarMenuButton as BaseSidebarMenuButton,
	SidebarMenuItem as BaseSidebarMenuItem,
	SidebarMenuSkeleton as BaseSidebarMenuSkeleton,
	SidebarMenuSub as BaseSidebarMenuSub,
	SidebarMenuSubButton as BaseSidebarMenuSubButton,
	SidebarMenuSubItem as BaseSidebarMenuSubItem,
	SidebarProvider as BaseSidebarProvider,
	SidebarTrigger as BaseSidebarTrigger,
	type SidebarArgs,
	type SidebarCollapsible,
	type SidebarContextValue,
	type SidebarContentArgs,
	type SidebarFooterArgs,
	type SidebarGroupActionArgs,
	type SidebarGroupArgs,
	type SidebarGroupContentArgs,
	type SidebarGroupLabelArgs,
	type SidebarHeaderArgs,
	type SidebarInsetArgs,
	type SidebarMenuArgs,
	type SidebarMenuActionArgs as BaseSidebarMenuActionArgs,
	type SidebarMenuBadgeArgs,
	type SidebarMenuButtonArgs as BaseSidebarMenuButtonArgs,
	type SidebarMenuItemArgs,
	type SidebarMenuSkeletonArgs,
	type SidebarMenuSubArgs,
	type SidebarMenuSubButtonArgs as BaseSidebarMenuSubButtonArgs,
	type SidebarMenuSubItemArgs,
	type SidebarProviderArgs,
	type SidebarSide,
	type SidebarState,
	type SidebarTriggerArgs,
	type SidebarVariant,
} from 'ajo-ui/sidebar'
import { buttonVariants } from './button'
import { Input, type InputArgs } from './input'
import { scrollAreaVariants } from './internal/recipes'
import { Separator, type SeparatorArgs } from './separator'

export type {
	SidebarArgs,
	SidebarCollapsible,
	SidebarContextValue,
	SidebarContentArgs,
	SidebarFooterArgs,
	SidebarGroupActionArgs,
	SidebarGroupArgs,
	SidebarGroupContentArgs,
	SidebarGroupLabelArgs,
	SidebarHeaderArgs,
	SidebarInsetArgs,
	SidebarMenuArgs,
	SidebarMenuBadgeArgs,
	SidebarMenuItemArgs,
	SidebarMenuSkeletonArgs,
	SidebarMenuSubArgs,
	SidebarMenuSubItemArgs,
	SidebarProviderArgs,
	SidebarSide,
	SidebarState,
	SidebarTriggerArgs,
	SidebarVariant,
}

export type SidebarInputArgs = InputArgs
export type SidebarSeparatorArgs = SeparatorArgs

export type SidebarMenuButtonVariant = 'default' | 'outline'
export type SidebarMenuButtonSize = 'default' | 'lg' | 'sm'

export type SidebarMenuButtonArgs = OmitArg<BaseSidebarMenuButtonArgs, 'size'> & {
	variant?: SidebarMenuButtonVariant
	size?: SidebarMenuButtonSize
}
export type SidebarMenuActionArgs = BaseSidebarMenuActionArgs & {
	showOnHover?: boolean
}
/** Nested items take one size: the base's `size` stamp is not themed. */
export type SidebarMenuSubButtonArgs = OmitArg<BaseSidebarMenuSubButtonArgs, 'size'>

// Hover is a neutral wash, so only the current item wears the gold tint.
const hover = 'hover:[&:not([data-active=true])]:bg-foreground/5'

/** State provider for the sidebar component family; below `md` the sidebar is a drawer. */
const SidebarProvider: Stateless<SidebarProviderArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarProvider
		{...attrs}
		class={clx('group/sidebar-wrapper flex min-h-0 w-full text-foreground', classes)}
	/>
)

/** Main sidebar panel. */
const Sidebar: Stateless<SidebarArgs> = ({
	class: classes,
	collapsible = 'offcanvas',
	mobileClass,
	side = 'left',
	variant = 'sidebar',
	...attrs
}) => (
	<BaseSidebar
		{...attrs}
		class={clx(
			// The collapsible aside only exists in the desktop presentation
			// (the base renders the drawer otherwise), so its widths carry no
			// breakpoint gate: a gate desyncs from a custom provider
			// mobileQuery. collapsible="none" renders in both presentations and
			// stays consumer-sized below md (StaticNavigation pattern).
			'group/sidebar flex min-h-0 shrink-0 flex-col text-foreground',
			collapsible === 'none' ? 'w-full md:w-[var(--sidebar-width)]' : 'w-[var(--sidebar-width)]',
			// Enamel at the page edge, with the hairline on its inner side: a
			// left sidebar leads the row, so its inner side is the inline end.
			// A collapsible one runs the viewport height and stays there while
			// the page scrolls.
			variant === 'sidebar' && 'bg-card text-card-foreground',
			variant === 'sidebar' && (side === 'left'
				? (collapsible === 'none' ? 'md:border-e' : 'border-e')
				: (collapsible === 'none' ? 'md:border-s' : 'border-s')),
			variant === 'sidebar' && collapsible !== 'none' && 'sticky top-0 h-svh',
			variant === 'floating' && 'rounded-lg panel',
			variant === 'inset' && 'rounded-xl panel',
			collapsible === 'icon' && 'data-[collapsible=icon]:w-[var(--sidebar-width-icon)]',
			collapsible === 'offcanvas' && 'data-[collapsible=offcanvas]:w-0 data-[collapsible=offcanvas]:overflow-hidden',
			classes,
		)}
		collapsible={collapsible}
		mobileClass={clx(
			// A modal panel: enamel over the blurred scrim, with the hairline
			// only on its inner side, like the desktop sidebar. It docks on the
			// physical side because the Drawer's slide motion is physical.
			'fixed inset-y-0 z-40 m-0 h-dvh max-h-none w-[var(--sidebar-width-mobile)] max-w-[calc(100vw-2rem)] bg-card p-0 text-card-foreground shadow-xl scrim',
			side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
			'*:data-[slot=sidebar-inner]:flex *:data-[slot=sidebar-inner]:h-full *:data-[slot=sidebar-inner]:w-full *:data-[slot=sidebar-inner]:flex-col',
			mobileClass,
		)}
		side={side}
		variant={variant}
	/>
)

/** Button that toggles the current SidebarProvider. */
const SidebarTrigger: Stateless<SidebarTriggerArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<BaseSidebarTrigger
		{...attrs}
		class={buttonVariants({ class: classes, size: 'icon', variant: 'ghost' })}
	>
		{children ?? <span aria-hidden="true" class="i-lucide-panel-left size-4 rtl:-scale-x-100" />}
	</BaseSidebarTrigger>
)

/** Main content wrapper used with inset sidebars. */
const SidebarInset: Stateless<SidebarInsetArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarInset {...attrs} class={clx('relative flex min-w-0 flex-1 flex-col bg-background', classes)} />
)

/** Themed input for sidebar search or filtering. */
const SidebarInput: Stateless<SidebarInputArgs> = ({ class: classes, ...attrs }) => (
	<Input
		{...attrs}
		class={clx('group-data-[collapsible=icon]/sidebar:hidden', classes)}
	/>
)

/** Top region for sidebar identity and primary controls. */
const SidebarHeader: Stateless<SidebarHeaderArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarHeader {...attrs} class={clx('flex flex-col gap-2 p-2', classes)} />
)

/** Bottom region for secondary sidebar controls. */
const SidebarFooter: Stateless<SidebarFooterArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarFooter {...attrs} class={clx('flex flex-col gap-2 p-2', classes)} />
)

/** Themed divider between sidebar regions; Separator supplies its 1px rule, inset by its margins. */
const SidebarSeparator: Stateless<SidebarSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<Separator {...attrs} class={clx('mx-2 max-w-[calc(100%-1rem)]', classes)} />
)

/** Scrollable main region for sidebar groups. */
const SidebarContent: Stateless<SidebarContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarContent
		{...attrs}
		class={clx(scrollAreaVariants({ axis: 'y' }), 'flex min-h-0 flex-1 flex-col gap-2 group-data-[collapsible=icon]/sidebar:overflow-hidden', classes)}
	/>
)

/** Themed container for one related sidebar section. */
const SidebarGroup: Stateless<SidebarGroupArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarGroup {...attrs} class={clx('relative flex w-full min-w-0 flex-col p-2', classes)} />
)

/** Compact heading for a sidebar group. */
const SidebarGroupLabel: Stateless<SidebarGroupLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarGroupLabel
		{...attrs}
		class={clx('flex h-8 shrink-0 items-center overflow-hidden rounded-md px-2 text-xs font-medium text-muted-foreground transition-[height,opacity] group-data-[collapsible=icon]/sidebar:h-0 group-data-[collapsible=icon]/sidebar:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0', classes)}
	/>
)

/** Action positioned alongside a sidebar group label. */
const SidebarGroupAction: Stateless<SidebarGroupActionArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarGroupAction
		{...attrs}
		class={clx(`absolute end-3 top-3.5 flex size-5 items-center justify-center rounded-sm text-foreground playa-focus ${hover} group-data-[collapsible=icon]/sidebar:hidden [&>svg]:size-4`, classes)}
	/>
)

/** Content region within a sidebar group. */
const SidebarGroupContent: Stateless<SidebarGroupContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarGroupContent {...attrs} class={clx('w-full text-sm', classes)} />
)

/** Vertical list of sidebar navigation items. */
const SidebarMenu: Stateless<SidebarMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenu {...attrs} class={clx('flex w-full min-w-0 flex-col gap-1', classes)} />
)

/** Positioned wrapper for one sidebar menu item. */
const SidebarMenuItem: Stateless<SidebarMenuItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuItem {...attrs} class={clx('group/menu-item relative', classes)} />
)

const buttonVariant = {
	default: hover,
	outline: `edge bg-transparent ${hover}`,
}

const buttonSize = {
	default: 'h-8 text-sm',
	sm: 'h-7 text-xs',
	lg: 'h-12 text-sm group-data-[collapsible=icon]/sidebar:p-0',
}

const menuButtonClass = (variant: SidebarMenuButtonVariant, size: SidebarMenuButtonSize, classes?: string) =>
	clx(
		// !p-2: the icon-collapsed padding must beat the same-specificity
		// pe-8 reserved for menu actions, or crowded buttons stay 40px wide
		// inside the 48px rail. Icon mode hides every span but the leading
		// icon (not just the last one): composed triggers carry three spans
		// (icon, label, chevron) and a last-child rule leaves the label
		// clipping through the rail.
		'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-start playa-focus transition-[width,height,padding] group-has-[[data-slot=sidebar-menu-action]]/menu-item:pe-8 group-data-[collapsible=icon]/sidebar:size-8 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:!p-2 group-data-[collapsible=icon]/sidebar:[&>span:not(:first-child)]:hidden playa-disabled data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-medium [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
		buttonVariant[variant],
		buttonSize[size],
		classes,
	)

/** Returns the UnoCSS class list for a sidebar menu button, for composing other triggers such as CollapsibleTrigger and MenuTrigger. */
export const sidebarMenuButtonVariants = ({
	class: classes,
	size = 'default',
	variant = 'default',
}: {
	class?: string
	size?: SidebarMenuButtonSize
	variant?: SidebarMenuButtonVariant
} = {}) => menuButtonClass(variant, size, classes)

const menuActionClass = (showOnHover?: boolean, classes?: string) =>
	clx(`absolute end-1 top-1.5 flex size-5 items-center justify-center rounded-sm p-0 text-foreground playa-focus ${hover} group-data-[collapsible=icon]/sidebar:hidden [&>svg]:size-4`, showOnHover && 'opacity-0 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100', classes)

/** Returns the UnoCSS class list for a sidebar menu action, for composing other triggers into the item's action slot. */
export const sidebarMenuActionVariants = ({
	class: classes,
	showOnHover,
}: {
	class?: string
	showOnHover?: boolean
} = {}) => menuActionClass(showOnHover, classes)

/** Primary themed control for a sidebar menu item. */
const SidebarMenuButton: Stateless<SidebarMenuButtonArgs> = ({
	class: classes,
	size = 'default',
	variant = 'default',
	...attrs
}) => (
	<BaseSidebarMenuButton
		{...attrs}
		class={menuButtonClass(variant, size, classes)}
		size={size}
	/>
)

/** Secondary action positioned inside a sidebar menu item. */
const SidebarMenuAction: Stateless<SidebarMenuActionArgs> = ({ class: classes, showOnHover, ...attrs }) => (
	<BaseSidebarMenuAction
		{...attrs}
		class={menuActionClass(showOnHover, classes)}
	/>
)

/** Small count or status badge for a sidebar menu item. */
const SidebarMenuBadge: Stateless<SidebarMenuBadgeArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuBadge
		{...attrs}
		class={clx('pointer-events-none absolute end-1 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-xs font-medium tabular-nums text-muted-foreground peer-data-[active=true]/menu-button:text-accent-foreground group-data-[collapsible=icon]/sidebar:hidden', classes)}
	/>
)

/** Loading placeholder shaped like a sidebar menu item. */
const SidebarMenuSkeleton: Stateless<SidebarMenuSkeletonArgs> = ({
	class: classes,
	...attrs
}) => (
	<BaseSidebarMenuSkeleton
		{...attrs}
		class={clx(
			'flex h-8 animate-pulse items-center gap-2 rounded-md px-2 motion-reduce:animate-none',
			// An ink wash, not --muted: it reads on the enamel and the drawer in dark.
			'*:data-[slot=sidebar-menu-skeleton-icon]:size-4 *:data-[slot=sidebar-menu-skeleton-icon]:rounded-xs *:data-[slot=sidebar-menu-skeleton-icon]:bg-foreground/10',
			'*:data-[slot=sidebar-menu-skeleton-text]:h-4 *:data-[slot=sidebar-menu-skeleton-text]:flex-1 *:data-[slot=sidebar-menu-skeleton-text]:rounded-xs *:data-[slot=sidebar-menu-skeleton-text]:bg-foreground/10',
			classes,
		)}
	/>
)

/** Indented list for nested sidebar navigation. */
const SidebarMenuSub: Stateless<SidebarMenuSubArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuSub
		{...attrs}
		class={clx('ms-4 flex min-w-0 flex-col gap-1 border-s ps-2 py-1 group-data-[collapsible=icon]/sidebar:hidden', classes)}
	/>
)

/** Positioned wrapper for one nested sidebar item. */
const SidebarMenuSubItem: Stateless<SidebarMenuSubItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuSubItem {...attrs} class={clx('group/menu-sub-item relative', classes)} />
)

/** Themed navigation control for a nested sidebar item, one size with the items above it. */
const SidebarMenuSubButton: Stateless<SidebarMenuSubButtonArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuSubButton
		{...attrs}
		class={clx(`flex h-8 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-foreground playa-focus ${hover} data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-medium [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0`, classes)}
	/>
)

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
}
