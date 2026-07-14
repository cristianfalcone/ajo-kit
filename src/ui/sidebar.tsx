import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import {
	Sidebar as BaseSidebar,
	SidebarContent as BaseSidebarContent,
	SidebarContext,
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
	SidebarRail as BaseSidebarRail,
	SidebarTrigger as BaseSidebarTrigger,
	type SidebarCollapsible,
	type SidebarContextValue,
	type SidebarArgs as BaseSidebarArgs,
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
	type SidebarMenuSkeletonArgs as BaseSidebarMenuSkeletonArgs,
	type SidebarMenuSubArgs,
	type SidebarMenuSubButtonArgs as BaseSidebarMenuSubButtonArgs,
	type SidebarMenuSubItemArgs,
	type SidebarProviderArgs,
	type SidebarRailArgs,
	type SidebarSide,
	type SidebarState,
	type SidebarTriggerArgs,
	type SidebarVariant,
} from 'ajo-ui/sidebar'
import { buttonVariants } from './button'
import Input, { type InputArgs } from './input'
import { scrollAreaVariants } from './scroll-area'
import { Separator, type SeparatorArgs } from './separator'

export type {
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
	SidebarMenuSubArgs,
	SidebarMenuSubItemArgs,
	SidebarProviderArgs,
	SidebarRailArgs,
	SidebarSide,
	SidebarState,
	SidebarTriggerArgs,
	SidebarVariant,
}

export type SidebarInputArgs = InputArgs
export type SidebarSeparatorArgs = SeparatorArgs

export type SidebarMenuButtonVariant = 'default' | 'outline'
export type SidebarMenuButtonSize = 'default' | 'lg' | 'sm'
export type SidebarMenuSubButtonSize = 'md' | 'sm'

export type SidebarArgs = OmitArg<BaseSidebarArgs, 'mobileContentClass'> & FixedArgs<'mobileContentClass'> & {
	/** Additional UnoCSS classes for the mobile dialog; `class` stays desktop-only. */
	mobileClass?: string
}
export type SidebarMenuButtonArgs = OmitArg<BaseSidebarMenuButtonArgs, 'size'> & {
	variant?: SidebarMenuButtonVariant
	size?: SidebarMenuButtonSize
}
export type SidebarMenuActionArgs = BaseSidebarMenuActionArgs & {
	showOnHover?: boolean
}
export type SidebarMenuSkeletonArgs = OmitArg<BaseSidebarMenuSkeletonArgs, 'iconClass' | 'textClass'> & FixedArgs<'iconClass' | 'textClass'>
export type SidebarMenuSubButtonArgs = OmitArg<BaseSidebarMenuSubButtonArgs, 'size'> & {
	size?: SidebarMenuSubButtonSize
}

/** State provider for the sidebar component family. */
const SidebarProvider: Stateless<SidebarProviderArgs> = ({
	class: classes,
	// The theme gates every desktop width on `lg:`; the base must flip to the
	// mobile presentation at the same breakpoint or the plain `aside` renders
	// unconstrained between the two.
	mobileQuery = '(max-width: 1023.98px)',
	...attrs
}) => (
	<BaseSidebarProvider
		{...attrs}
		class={clsx('group/sidebar-wrapper flex min-h-0 w-full text-foreground', classes)}
		mobileQuery={mobileQuery}
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
		class={clsx(
			// The collapsible aside only exists in the desktop presentation
			// (the base renders the drawer otherwise), so its widths carry no
			// breakpoint gate — gating them on lg: desynced from a custom
			// provider mobileQuery and left the aside unconstrained between
			// the two. collapsible="none" renders in both presentations and
			// stays consumer-sized below lg (StaticNavigation pattern).
			'group/sidebar flex min-h-0 shrink-0 flex-col text-foreground',
			collapsible === 'none' ? 'w-full lg:w-[var(--sidebar-width)]' : 'w-[var(--sidebar-width)]',
			variant === 'sidebar' && 'glass-chrome',
			variant === 'sidebar' && (side === 'left'
				? (collapsible === 'none' ? 'lg:border-r' : 'border-r')
				: (collapsible === 'none' ? 'lg:border-l' : 'border-l')),
			variant === 'floating' && 'rounded-lg glass edge shadow-xs',
			variant === 'inset' && 'rounded-xl glass edge shadow-xs',
			collapsible === 'icon' && 'data-[collapsible=icon]:w-[var(--sidebar-width-icon)]',
			collapsible === 'offcanvas' && 'data-[collapsible=offcanvas]:w-0 data-[collapsible=offcanvas]:overflow-hidden',
			classes,
		)}
		collapsible={collapsible}
		mobileClass={clsx(
			'fixed inset-y-0 z-40 m-0 h-dvh max-h-none w-[var(--sidebar-width-mobile)] max-w-[calc(100vw-2rem)] border-0 glass-overlay edge p-0 shadow-lg backdrop:bg-black/20 backdrop:backdrop-blur-sm',
			side === 'left' ? 'left-0' : 'right-0',
			mobileClass,
		)}
		mobileContentClass="flex h-full w-full flex-col"
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
		class={buttonVariants({ class: clsx('size-7 rounded-md', classes), size: 'none', variant: 'ghost' })}
	>
		{children ?? <span aria-hidden="true" class="i-lucide-panel-left size-4" />}
	</BaseSidebarTrigger>
)

/** Rail hit area used to collapse or expand a sidebar. */
// Visibility keys on the provider's data-mobile stamp (not a breakpoint):
// inside the mobile drawer the rail is pointless and must stay hidden.
const SidebarRail: Stateless<SidebarRailArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarRail
		{...attrs}
		class={clsx('absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 after:absolute after:inset-y-0 after:left-1/2 after:w-px hover:after:bg-border group-data-[mobile=false]/sidebar-wrapper:flex', classes)}
	/>
)

/** Main content wrapper used with inset sidebars. */
const SidebarInset: Stateless<SidebarInsetArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarInset {...attrs} class={clsx('relative flex min-w-0 flex-1 flex-col bg-background', classes)} />
)

const SidebarInput: Stateless<SidebarInputArgs> = ({ class: classes, ...attrs }) => (
	<Input
		{...attrs}
		class={clsx('h-8 group-data-[collapsible=icon]/sidebar:hidden', classes)}
		data-sidebar="input"
	/>
)

const SidebarHeader: Stateless<SidebarHeaderArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarHeader {...attrs} class={clsx('flex flex-col gap-2 p-2', classes)} />
)

const SidebarFooter: Stateless<SidebarFooterArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarFooter {...attrs} class={clsx('flex flex-col gap-2 p-2', classes)} />
)

// Composes Separator so the horizontal rule keeps its h-px (lost in the old
// hand copy, which left the themed separator invisible).
const SidebarSeparator: Stateless<SidebarSeparatorArgs> = ({ class: classes, ...attrs }) => (
	<Separator {...attrs} class={clsx('mx-2 w-auto', classes)} data-sidebar="separator" />
)

const SidebarContent: Stateless<SidebarContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarContent
		{...attrs}
		class={clsx(scrollAreaVariants({ axis: 'y' }), 'flex min-h-0 flex-1 flex-col gap-2 group-data-[collapsible=icon]/sidebar:overflow-hidden', classes)}
	/>
)

const SidebarGroup: Stateless<SidebarGroupArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarGroup {...attrs} class={clsx('relative flex w-full min-w-0 flex-col p-2', classes)} />
)

const SidebarGroupLabel: Stateless<SidebarGroupLabelArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarGroupLabel
		{...attrs}
		class={clsx('flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-[margin,opacity] group-data-[collapsible=icon]/sidebar:-mt-8 group-data-[collapsible=icon]/sidebar:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0', classes)}
	/>
)

const SidebarGroupAction: Stateless<SidebarGroupActionArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarGroupAction
		{...attrs}
		class={clsx('absolute right-3 top-3.5 flex size-5 items-center justify-center rounded-sm text-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[collapsible=icon]/sidebar:hidden [&>svg]:size-4', classes)}
	/>
)

const SidebarGroupContent: Stateless<SidebarGroupContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarGroupContent {...attrs} class={clsx('w-full text-sm', classes)} />
)

const SidebarMenu: Stateless<SidebarMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenu {...attrs} class={clsx('flex w-full min-w-0 flex-col gap-1', classes)} />
)

const SidebarMenuItem: Stateless<SidebarMenuItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuItem {...attrs} class={clsx('group/menu-item relative', classes)} />
)

const buttonVariant = {
	default: 'hover:bg-accent hover:text-accent-foreground',
	outline: 'edge bg-transparent hover:bg-accent hover:edge-on-accent hover:text-accent-foreground',
}

const buttonSize = {
	default: 'h-8 text-sm',
	sm: 'h-7 text-xs',
	lg: 'h-12 text-sm group-data-[collapsible=icon]/sidebar:p-0',
}

const menuButtonClass = (variant: SidebarMenuButtonVariant, size: SidebarMenuButtonSize, classes?: string) =>
	clsx(
		// !p-2: the icon-collapsed padding must beat the same-specificity
		// pr-8 reserved for menu actions, or crowded buttons stay 40px wide
		// inside the 48px rail. Icon mode hides every span but the leading
		// icon (not just the last one): composed triggers carry three spans
		// (icon, label, chevron) and a last-child rule leaves the label
		// clipping through the rail.
		'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none transition-[width,height,padding] group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 group-data-[collapsible=icon]/sidebar:size-8 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:!p-2 group-data-[collapsible=icon]/sidebar:[&>span:not(:first-child)]:hidden focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-medium [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
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
	clsx('absolute right-1 top-1.5 flex size-5 items-center justify-center rounded-sm p-0 text-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[collapsible=icon]/sidebar:hidden [&>svg]:size-4', showOnHover && 'opacity-0 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100', classes)

/** Returns the UnoCSS class list for a sidebar menu action, for composing other triggers into the item's action slot. */
export const sidebarMenuActionVariants = ({
	class: classes,
	showOnHover,
}: {
	class?: string
	showOnHover?: boolean
} = {}) => menuActionClass(showOnHover, classes)

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

const SidebarMenuAction: Stateless<SidebarMenuActionArgs> = ({ class: classes, showOnHover, ...attrs }) => (
	<BaseSidebarMenuAction
		{...attrs}
		class={menuActionClass(showOnHover, classes)}
	/>
)

const SidebarMenuBadge: Stateless<SidebarMenuBadgeArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuBadge
		{...attrs}
		class={clsx('pointer-events-none absolute right-1 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-xs font-medium tabular-nums text-muted-foreground peer-data-[active=true]/menu-button:text-accent-foreground group-data-[collapsible=icon]/sidebar:hidden', classes)}
	/>
)

const SidebarMenuSkeleton: Stateless<SidebarMenuSkeletonArgs> = ({
	class: classes,
	...attrs
}) => (
	<BaseSidebarMenuSkeleton
		{...attrs}
		class={clsx('flex h-8 animate-pulse items-center gap-2 rounded-md px-2 motion-reduce:animate-none', classes)}
		iconClass="size-4 rounded-xs bg-muted"
		textClass="h-4 flex-1 rounded-xs bg-muted"
	/>
)

const SidebarMenuSub: Stateless<SidebarMenuSubArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuSub
		{...attrs}
		class={clsx('mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]/sidebar:hidden', classes)}
	/>
)

const SidebarMenuSubItem: Stateless<SidebarMenuSubItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseSidebarMenuSubItem {...attrs} class={clsx('group/menu-sub-item relative', classes)} />
)

const SidebarMenuSubButton: Stateless<SidebarMenuSubButtonArgs> = ({
	class: classes,
	size = 'md',
	...attrs
}) => (
	<BaseSidebarMenuSubButton
		{...attrs}
		class={clsx('flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0', size === 'sm' ? 'text-xs' : 'text-sm', classes)}
		size={size}
	/>
)

export {
	Sidebar,
	SidebarContent,
	SidebarContext,
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
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
}
