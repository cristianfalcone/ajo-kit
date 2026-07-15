import type { Stateless } from 'ajo'
import clsx from 'clsx'
import type { FixedArgs, OmitArg } from 'ajo-ui/utils'
import {
	Drawer as BaseDrawer,
	DrawerContent as BaseDrawerContent,
	DrawerDescription as BaseDrawerDescription,
	DrawerFooter as BaseDrawerFooter,
	DrawerHeader as BaseDrawerHeader,
	DrawerTitle as BaseDrawerTitle,
	type DrawerContentArgs as BaseDrawerContentArgs,
	type DrawerArgs,
	type DrawerDescriptionArgs,
	type DrawerFooterArgs,
	type DrawerHeaderArgs,
	type DrawerSide,
	type DrawerTitleArgs,
} from 'ajo-ui/drawer'
import { modalClose, modalClosed, modalSurface } from './modal'
export { DrawerClose, DrawerTrigger } from 'ajo-ui/drawer'
export type { DrawerArgs, DrawerCloseArgs, DrawerDescriptionArgs, DrawerFooterArgs, DrawerHeaderArgs, DrawerSide, DrawerTitleArgs, DrawerTriggerArgs } from 'ajo-ui/drawer'

export type DrawerContentArgs = OmitArg<BaseDrawerContentArgs, 'class' | 'closeClass' | 'closeIconClass' | 'handle' | 'handleClass' | 'sideClass'> & FixedArgs<'closeClass' | 'closeIconClass' | 'handleClass' | 'sideClass'> & {
	/** Additional UnoCSS classes for the drawer panel. */
	class?: string
	/** Show the optional drag handle. */
	handle?: boolean
}

const base = clsx(modalSurface, 'group/drawer-content m-0 flex flex-col gap-4')
const sides: Record<DrawerSide, string> = {
	right: 'inset-y-0 right-0 left-auto h-full max-h-none w-3/4 max-w-none border-l sm:max-w-sm',
	left: 'inset-y-0 left-0 right-auto h-full max-h-none w-3/4 max-w-none border-r sm:max-w-sm',
	top: 'inset-x-0 top-0 bottom-auto h-auto w-full max-w-none border-b',
	bottom: 'inset-x-0 bottom-0 top-auto h-auto w-full max-w-none border-t',
}
const handleSides: Record<DrawerSide, string> = {
	...sides,
	top: 'inset-x-0 top-0 bottom-auto mb-24 max-h-[80vh] w-full max-w-none rounded-b-lg border-b',
	bottom: 'inset-x-0 bottom-0 top-auto mt-24 max-h-[80vh] w-full max-w-none rounded-t-lg border-t',
}
const handleBase = 'mx-auto mt-4 h-2 w-[100px] shrink-0 touch-none cursor-grab rounded-full bg-muted active:cursor-grabbing'
const headerBase = 'flex flex-col p-4 group-data-[side=bottom]/drawer-content:text-center group-data-[side=top]/drawer-content:text-center md:text-left'

/** Root provider for a modal drawer. */
const Drawer: Stateless<DrawerArgs> = ({
	class: classes,
	...attrs
}) => (
	<BaseDrawer {...attrs} class={clsx('contents', classes)} />
)

/** Native modal drawer panel with a draggable bottom handle. */
const DrawerContent: Stateless<DrawerContentArgs> = ({
	children,
	class: classes,
	handle,
	...attrs
}) => {
	const hasHandle = handle === true

	return (
		<BaseDrawerContent
			{...attrs}
			closeClass={modalClose}
			closeIconClass="i-lucide-x block size-4"
			class={clsx(modalClosed, base, classes)}
			handle={hasHandle}
			handleClass={handleBase}
			sideClass={hasHandle ? handleSides : sides}
		>
			{children}
		</BaseDrawerContent>
	)
}

/** Header area for drawer title and description. */
const DrawerHeader: Stateless<DrawerHeaderArgs> = ({ class: classes, ...attrs }) => (
	<BaseDrawerHeader {...attrs} class={clsx(headerBase, classes)} />
)

/** Footer area for drawer actions. */
const DrawerFooter: Stateless<DrawerFooterArgs> = ({ class: classes, ...attrs }) => (
	<BaseDrawerFooter {...attrs} class={clsx('mt-auto flex flex-col gap-2 p-4 sm:flex-col sm:justify-start', classes)} />
)

/** Accessible title for DrawerContent. */
const DrawerTitle: Stateless<DrawerTitleArgs> = ({ class: classes, ...attrs }) => (
	<BaseDrawerTitle {...attrs} class={clsx('font-semibold text-foreground', classes)} />
)

/** Accessible description for DrawerContent. */
const DrawerDescription: Stateless<DrawerDescriptionArgs> = ({ class: classes, ...attrs }) => (
	<BaseDrawerDescription {...attrs} class={clsx('text-sm text-muted-foreground', classes)} />
)

export {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
}
