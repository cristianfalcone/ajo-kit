import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	NavigationMenu as BaseNavigationMenu,
	NavigationMenuContent as BaseNavigationMenuContent,
	NavigationMenuItem as BaseNavigationMenuItem,
	NavigationMenuLink as BaseNavigationMenuLink,
	NavigationMenuList as BaseNavigationMenuList,
	NavigationMenuTrigger as BaseNavigationMenuTrigger,
	type NavigationMenuArgs,
	type NavigationMenuContentArgs,
	type NavigationMenuItemArgs,
	type NavigationMenuLinkArgs,
	type NavigationMenuListArgs,
	type NavigationMenuTriggerArgs,
	type NavigationMenuValue,
	type PopupPlacement,
	type PopupPosition,
} from 'ajo-ui/navigation-menu'
import { popupMotion } from './internal/popup'

export type {
	NavigationMenuArgs,
	NavigationMenuContentArgs,
	NavigationMenuItemArgs,
	NavigationMenuLinkArgs,
	NavigationMenuListArgs,
	NavigationMenuTriggerArgs,
	NavigationMenuValue,
	PopupPlacement,
	PopupPosition,
}

const rootBase = 'group/navigation-menu relative flex max-w-max flex-1 items-center'
// Below sm the list stays on one row and scrolls inline under a fade, so no
// trigger wraps beneath open content; the padding keeps the flush focus ring
// and the resting end items clear of the clip and the fade, and the scroll
// padding stops a trigger that takes focus clear of the fade too.
const listBase = 'group flex min-w-0 flex-1 list-none flex-wrap items-center gap-1 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:scrollbar-none max-sm:scroll-fade-x max-sm:px-4 max-sm:py-1 max-sm:scroll-px-4'
const triggerBase = 'group inline-flex h-control w-max items-center justify-center gap-1 rounded-md bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground playa-focus playa-disabled'
// The popup surface lives on the content element; the Adapter supplies available
// height and final side, while Playa owns overflow and the open and close motion.
const contentBase = 'z-50 m-0 min-w-48 overflow-x-hidden overflow-y-auto scrollbar-soft rounded-md glass-overlay edge p-2 shadow-lg [outline:1px_solid_transparent]'
const linkBase = 'flex flex-col gap-1 rounded-sm p-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground playa-focus data-[active=true]:bg-accent data-[active=true]:text-accent-foreground [&_svg:not([class*=size-])]:size-4 [&_svg:not([class*=text-])]:text-muted-foreground'

/** Returns the UnoCSS class list for a navigation menu trigger. */
export const navigationMenuTriggerVariants = ({ class: classes }: { class?: string } = {}) =>
	clx(triggerBase, classes)

/** Root landmark for a navigation menu. */
const NavigationMenu: Stateless<NavigationMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenu {...attrs} class={clx(rootBase, classes)} />
)

/** Horizontal list of navigation menu items. */
const NavigationMenuList: Stateless<NavigationMenuListArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenuList {...attrs} class={clx(listBase, classes)} />
)

/** Top-level item inside a NavigationMenuList. */
const NavigationMenuItem: Stateless<NavigationMenuItemArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenuItem {...attrs} class={clx('relative', classes)} />
)

/** Button that opens an item's content. */
const NavigationMenuTrigger: Stateless<NavigationMenuTriggerArgs> = ({
	children,
	class: classes,
	...attrs
}) => (
	<BaseNavigationMenuTrigger
		{...attrs}
		class={navigationMenuTriggerVariants({ class: clx('group', classes) })}
	>
		{children}
		<span aria-hidden="true" class="i-lucide-chevron-down size-3 opacity-50 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
	</BaseNavigationMenuTrigger>
)

/** Popover content for a NavigationMenuItem. */
const NavigationMenuContent: Stateless<NavigationMenuContentArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenuContent {...attrs} class={clx(contentBase, popupMotion, classes)} />
)

/** Link styled for use inside or directly within a navigation menu item. */
const NavigationMenuLink: Stateless<NavigationMenuLinkArgs> = ({ class: classes, ...attrs }) => (
	<BaseNavigationMenuLink {...attrs} class={clx(linkBase, classes)} />
)

export {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
}
