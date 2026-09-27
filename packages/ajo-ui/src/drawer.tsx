import type { Stateful, Stateless } from 'ajo'
import { callRef, move } from 'ajo-cloves'
import { context } from 'ajo/context'
import { rootAttrs } from './shared'
import { Dialog, DialogContent, type DialogArgs, type DialogContentArgs } from './dialog'

/** Viewport edge from which a Drawer panel enters. */
export type DrawerSide = 'top' | 'right' | 'bottom' | 'left'

/** Arguments for the Drawer state provider and entry edge; compose the Dialog parts inside it. */
export type DrawerArgs = DialogArgs & {
	/** Edge where the drawer enters from. */
	side?: DrawerSide
}
/** Arguments for the Drawer panel and its drag handle; compose DialogClose inside it for a close control. */
export type DrawerContentArgs = DialogContentArgs & {
	/** Render a pointer-only drag handle; keyboard users close with Escape or a composed DialogClose. */
	handle?: boolean
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
const Drawer: Stateless<DrawerArgs> = args => (
	<DrawerRoot {...rootAttrs(args, ['defaultOpen', 'modal', 'onOpenChange', 'open', 'side'])} attr:data-slot="drawer" />
)

const transform = (offset: number, side: DrawerSide) => {
	if (side === 'left') return `translateX(${-offset}px)`
	if (side === 'right') return `translateX(${offset}px)`
	if (side === 'top') return `translateY(${-offset}px)`
	return `translateY(${offset}px)`
}

/** Unstyled native Drawer panel with an optional drag handle. */
const DrawerContent: Stateless<DrawerContentArgs> = ({
	children,
	'data-slot': slot = 'drawer-content',
	handle = false,
	ref,
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
			data-side={side}
			data-slot={slot}
			ref={reference}
		>
			{handle ? (
				<div
					aria-hidden="true"
					data-slot="drawer-handle"
					set:onpointerdown={(event: PointerEvent) => drawer.drag.start(event)}
				/>
			) : null}
			{children}
		</DialogContent>
	)
}

export { Drawer, DrawerContent }
