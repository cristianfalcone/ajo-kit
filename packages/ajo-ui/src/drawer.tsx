import type { Stateful, Stateless } from 'ajo'
import { callRef, move, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { clx, withSlot } from './utils'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	type DialogArgs,
	type DialogCloseArgs,
	type DialogContentArgs,
	type DialogDescriptionArgs,
	type DialogFooterArgs,
	type DialogHeaderArgs,
	type DialogTitleArgs,
	type DialogTriggerArgs,
} from './dialog'

export type DrawerSide = 'top' | 'right' | 'bottom' | 'left'

export type DrawerArgs = DialogArgs & {
	/** Edge where the drawer enters from. */
	side?: DrawerSide
}
export type DrawerTriggerArgs = DialogTriggerArgs
export type DrawerCloseArgs = DialogCloseArgs
export type DrawerContentArgs = DialogContentArgs & {
	closeClass?: string
	/** Icon class for the default close button. */
	closeIconClass?: string
	/** Accessible label for the default close button. */
	closeLabel?: string
	handle?: boolean
	handleClass?: string
	/** Accessible label for the drag handle. */
	handleLabel?: string
	showCloseButton?: boolean
	sideClass?: Partial<Record<DrawerSide, string>>
}
export type DrawerHeaderArgs = DialogHeaderArgs
export type DrawerFooterArgs = DialogFooterArgs
export type DrawerTitleArgs = DialogTitleArgs
export type DrawerDescriptionArgs = DialogDescriptionArgs

type DrawerContextValue = {
	drag: ReturnType<typeof move>
	side: DrawerSide
	setPanel: (element: HTMLDialogElement | null) => void
}

const DrawerContext = context<DrawerContextValue>({
	drag: {
		start: () => false,
		get active() {
			return false
		},
	},
	side: 'right',
	setPanel: () => {},
})

const DrawerRoot: Stateful<DrawerArgs> = function* () {
	let side: DrawerSide = 'right'
	let offset = 0
	let panel: HTMLDialogElement | null = null

	const reset = () => {
		if (!panel) return
		panel.style.transform = ''
		panel.style.transition = ''
		panel.style.willChange = ''
	}

	const movePanel = (next: number) => {
		if (!panel) return
		panel.style.transition = 'none'
		panel.style.transform = transform(next, side)
		panel.style.willChange = 'transform'
	}

	const drag = move(this, {
		onStart: () => {
			offset = 0
		},
		onMove: data => {
			const delta = side === 'left' || side === 'right' ? data.dx : data.dy
			offset = Math.max(0, side === 'left' || side === 'top' ? -delta : delta)
			movePanel(offset)
		},
		onEnd: data => {
			reset()
			if (!data.canceled && offset > 72 && panel?.open) panel.close()
		},
	})

	for (const args of this) {
		side = args.side ?? 'right'
		DrawerContext({
			drag,
			side,
			setPanel: element => panel = element,
		})

		yield (
			<Dialog
				data-slot="drawer-dialog"
				defaultOpen={args.defaultOpen}
				modal={args.modal}
				onOpenChange={args.onOpenChange}
				open={args.open}
			>
				{args.children}
			</Dialog>
		)
	}
}


const Drawer: Stateless<DrawerArgs> = ({
	children,
	class: classes,
	defaultOpen,
	modal,
	onOpenChange,
	open,
	side,
	...attrs
}) => (
	<DrawerRoot
		{...rootAttrs(attrs)}
		defaultOpen={defaultOpen}
		modal={modal}
		onOpenChange={onOpenChange}
		open={open}
		side={side}
		attr:class={classes}
		attr:data-slot="drawer"
	>
		{children}
	</DrawerRoot>
)

const DrawerTrigger: Stateless<DrawerTriggerArgs> = withSlot<DrawerTriggerArgs>(DialogTrigger, 'drawer-trigger')

const DrawerClose: Stateless<DrawerCloseArgs> = withSlot<DrawerCloseArgs>(DialogClose, 'drawer-close')

const transform = (offset: number, side: DrawerSide) => {
	if (side === 'left') return `translateX(${-offset}px)`
	if (side === 'right') return `translateX(${offset}px)`
	if (side === 'top') return `translateY(${-offset}px)`
	return `translateY(${offset}px)`
}

const DrawerContent: Stateless<DrawerContentArgs> = ({
	children,
	class: classes,
	closeClass,
	closeIconClass,
	closeLabel = 'Close',
	handle = false,
	handleClass,
	handleLabel = 'Drag to close',
	ref,
	showCloseButton = true,
	sideClass,
	...attrs
}) => {
	const drawer = DrawerContext()
	const { side } = drawer
	let panel: HTMLDialogElement | null = null

	const reference = (element: HTMLDialogElement | null) => {
		panel = element
		drawer.setPanel(element)
		callRef(ref, element)
	}

	return (
		<DialogContent
			{...attrs}
			class={clx(sideClass?.[side], classes)}
			data-side={side}
			data-slot="drawer-content"
			ref={reference}
		>
			{handle ? (
				<div
					aria-label={handleLabel}
					class={handleClass}
					data-slot="drawer-handle"
					role="button"
					tabIndex={0}
					set:onkeydown={(event: KeyboardEvent) => {
						if ((event.key === 'Enter' || event.key === ' ') && panel?.open) {
							event.preventDefault()
							panel.close()
						}
					}}
					set:onpointerdown={(event: PointerEvent) => drawer.drag.start(event)}
				/>
			) : null}
			{children}
			{showCloseButton ? (
				<DrawerClose aria-label={closeLabel} class={closeClass}>
					<span aria-hidden="true" class={closeIconClass} data-slot="drawer-close-icon" />
				</DrawerClose>
			) : null}
		</DialogContent>
	)
}

const DrawerHeader: Stateless<DrawerHeaderArgs> = withSlot<DrawerHeaderArgs>(DialogHeader, 'drawer-header')

const DrawerFooter: Stateless<DrawerFooterArgs> = withSlot<DrawerFooterArgs>(DialogFooter, 'drawer-footer')

const DrawerTitle: Stateless<DrawerTitleArgs> = withSlot<DrawerTitleArgs>(DialogTitle, 'drawer-title')

const DrawerDescription: Stateless<DrawerDescriptionArgs> = withSlot<DrawerDescriptionArgs>(DialogDescription, 'drawer-description')

export {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
}
