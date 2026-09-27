import type { Stateless } from 'ajo'
import { clx } from 'ajo-ui/utils'
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	type DialogDescriptionArgs,
	type DialogFooterArgs,
	type DialogHeaderArgs,
	type DialogTitleArgs,
} from 'ajo-ui/dialog'
import {
	Drawer as BaseDrawer,
	DrawerContent as BaseDrawerContent,
	type DrawerArgs,
	type DrawerContentArgs,
} from 'ajo-ui/drawer'
import { modalClosed, modalSurface } from './internal/modal'
export type { DrawerArgs, DrawerContentArgs, DrawerSide } from 'ajo-ui/drawer'

const base = clx(modalSurface, 'playa-drawer group/drawer-content')
// Edge geometry keys off the base's `data-side`; top and bottom drawers with
// a handle become rounded sheets capped below the viewport height.
const horizontal = [
	'data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:left-auto data-[side=right]:h-full data-[side=right]:max-h-none data-[side=right]:w-3/4 data-[side=right]:max-w-none data-[side=right]:border-l data-[side=right]:sm:max-w-sm',
	'data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:right-auto data-[side=left]:h-full data-[side=left]:max-h-none data-[side=left]:w-3/4 data-[side=left]:max-w-none data-[side=left]:border-r data-[side=left]:sm:max-w-sm',
].join(' ')
const vertical = [
	'data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:bottom-auto data-[side=top]:h-auto data-[side=top]:w-full data-[side=top]:max-w-none data-[side=top]:border-b',
	'data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:top-auto data-[side=bottom]:h-auto data-[side=bottom]:w-full data-[side=bottom]:max-w-none data-[side=bottom]:border-t',
].join(' ')
const sheet = [
	'data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:bottom-auto data-[side=top]:mb-24 data-[side=top]:max-h-[80vh] data-[side=top]:w-full data-[side=top]:max-w-none data-[side=top]:rounded-b-lg data-[side=top]:border-b',
	'data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:top-auto data-[side=bottom]:mt-24 data-[side=bottom]:max-h-[80vh] data-[side=bottom]:w-full data-[side=bottom]:max-w-none data-[side=bottom]:rounded-t-lg data-[side=bottom]:border-t',
].join(' ')
const handleBase = '*:data-[slot=drawer-handle]:mx-auto *:data-[slot=drawer-handle]:mt-4 *:data-[slot=drawer-handle]:h-2 *:data-[slot=drawer-handle]:w-[100px] *:data-[slot=drawer-handle]:shrink-0 *:data-[slot=drawer-handle]:touch-none *:data-[slot=drawer-handle]:cursor-grab *:data-[slot=drawer-handle]:rounded-full *:data-[slot=drawer-handle]:bg-muted *:data-[slot=drawer-handle]:active:cursor-grabbing'
const headerBase = 'flex flex-col p-4 group-data-[side=bottom]/drawer-content:text-center group-data-[side=top]/drawer-content:text-center md:text-left'

/** Root provider for a modal drawer; compose DialogTrigger and DialogClose from the Playa dialog. */
const Drawer: Stateless<DrawerArgs> = ({
	class: classes,
	...attrs
}) => (
	<BaseDrawer {...attrs} class={clx('contents', classes)} />
)

/** Native modal drawer surface with an optional drag handle; compose DialogClose inside it for a close control. */
const DrawerContent: Stateless<DrawerContentArgs> = ({ class: classes, handle, ...attrs }) => (
	<BaseDrawerContent
		{...attrs}
		class={clx(modalClosed, base, horizontal, handle ? clx(sheet, handleBase) : vertical, classes)}
		handle={handle}
	/>
)

/** Header area for drawer title and description, themed for the drawer edge. */
const DrawerHeader: Stateless<DialogHeaderArgs> = ({ class: classes, ...attrs }) => (
	<DialogHeader {...attrs} class={clx(headerBase, classes)} data-slot="drawer-header" />
)

/** Footer area for drawer actions, pinned to the drawer end. */
const DrawerFooter: Stateless<DialogFooterArgs> = ({ class: classes, ...attrs }) => (
	<DialogFooter {...attrs} class={clx('mt-auto flex flex-col gap-2 p-4 sm:flex-col sm:justify-start', classes)} data-slot="drawer-footer" />
)

/** Accessible title for DrawerContent. */
const DrawerTitle: Stateless<DialogTitleArgs> = ({ class: classes, ...attrs }) => (
	<DialogTitle {...attrs} class={clx('font-semibold text-foreground', classes)} data-slot="drawer-title" />
)

/** Accessible description for DrawerContent. */
const DrawerDescription: Stateless<DialogDescriptionArgs> = ({ class: classes, ...attrs }) => (
	<DialogDescription {...attrs} class={clx('text-sm text-muted-foreground', classes)} data-slot="drawer-description" />
)

export {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
}
