import type { Stateful, Stateless } from 'ajo'
import { callRef, move, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import { context } from 'ajo/context'
import { clx } from './shared'
import { Dialog, DialogClose, DialogContent, type DialogArgs, type DialogContentArgs } from './dialog'

/** Viewport edge from which a Drawer panel enters. */
export type DrawerSide = 'top' | 'right' | 'bottom' | 'left'

/** Arguments for the Drawer state provider and entry edge; compose the Dialog parts inside it. */
export type DrawerArgs = DialogArgs & {
	/** Edge where the drawer enters from. */
	side?: DrawerSide
}
/** Arguments for the Drawer panel, drag handle, and default close control. */
export type DrawerContentArgs = DialogContentArgs & {
	closeClass?: string
	/** Icon class for the default close button. */
	closeIconClass?: string
	/** Accessible label for the default close button. */
	closeLabel?: string
	/** Render a pointer-only drag handle; keyboard users close with Escape or the close button. */
	handle?: boolean
	handleClass?: string
	showCloseButton?: boolean
	sideClass?: Partial<Record<DrawerSide, string>>
}

type DrawerContextValue = {
	drag: ReturnType<typeof move>
	side: DrawerSide
	setPanel: (element: HTMLDialogElement | null) => void
}

const DrawerContext = context<DrawerContextValue>({
	drag: { start: () => false },
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


/** Unstyled edge panel provider built on native Dialog behavior. */
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

const transform = (offset: number, side: DrawerSide) => {
	if (side === 'left') return `translateX(${-offset}px)`
	if (side === 'right') return `translateX(${offset}px)`
	if (side === 'top') return `translateY(${-offset}px)`
	return `translateY(${offset}px)`
}

/** Unstyled native Drawer panel with optional drag and close controls. */
const DrawerContent: Stateless<DrawerContentArgs> = ({
	children,
	class: classes,
	closeClass,
	closeIconClass,
	closeLabel = 'Close',
	'data-slot': slot = 'drawer-content',
	handle = false,
	handleClass,
	ref,
	showCloseButton = true,
	sideClass,
	...attrs
}) => {
	const drawer = DrawerContext()
	const { side } = drawer

	const reference = (element: HTMLDialogElement | null) => {
		drawer.setPanel(element)
		callRef(ref, element)
	}

	return (
		<DialogContent
			{...attrs}
			class={clx(sideClass?.[side], classes)}
			data-side={side}
			data-slot={slot}
			ref={reference}
		>
			{handle ? (
				<div
					aria-hidden="true"
					class={handleClass}
					data-slot="drawer-handle"
					set:onpointerdown={(event: PointerEvent) => drawer.drag.start(event)}
				/>
			) : null}
			{children}
			{showCloseButton ? (
				<DialogClose aria-label={closeLabel} class={closeClass} data-slot="drawer-close">
					<span aria-hidden="true" class={closeIconClass} data-slot="drawer-close-icon" />
				</DialogClose>
			) : null}
		</DialogContent>
	)
}

export { Drawer, DrawerContent }
