import type { Stateless } from 'ajo'
import clsx from 'clsx'
import { MenuContent, type MenuContentArgs } from 'ajo-ui/menu'
import {
	Menubar as BaseMenubar,
	MenubarMenu as BaseMenubarMenu,
	MenubarTrigger as BaseMenubarTrigger,
} from 'ajo-ui/menubar'
import type { MenubarArgs, MenubarMenuArgs, MenubarTriggerArgs } from 'ajo-ui/menubar'
import { menuContent } from './internal/recipes'
export type { MenubarArgs, MenubarMenuArgs, MenubarTriggerArgs, PopupPlacement, PopupPosition } from 'ajo-ui/menubar'

const base = 'flex h-9 items-center gap-1 rounded-md glass-chrome edge p-1'
const triggerBase = 'flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-none select-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'

/** Persistent horizontal menu bar; compose the Playa Menu parts inside its menus. */
const Menubar: Stateless<MenubarArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubar {...attrs} class={clsx(base, classes)} />
)

/** Top-level Menubar menu. */
const MenubarMenu: Stateless<MenubarMenuArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarMenu {...attrs} class={clsx('contents', classes)} />
)

/** Top-level trigger inside a Menubar. */
const MenubarTrigger: Stateless<MenubarTriggerArgs> = ({ class: classes, ...attrs }) => (
	<BaseMenubarTrigger {...attrs} class={clsx(triggerBase, classes)} />
)

/** Menu surface for a top-level Menubar menu, wider than a plain MenuContent. */
const MenubarContent: Stateless<MenuContentArgs> = ({ class: classes, ...attrs }) => (
	<MenuContent {...attrs} class={clsx(menuContent({ minWidth: '12rem' }), classes)} data-slot="menubar-content" />
)

export { Menubar, MenubarContent, MenubarMenu, MenubarTrigger }
