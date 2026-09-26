import type { IntrinsicElements, Stateful, Stateless, WithChildren } from 'ajo'
import { callHandler, listen, statefulRootAttrs as rootAttrs } from 'ajo-cloves'
import type { MenuArgs } from './menu'
import { MenuContext, MenuRoot, SURFACE_SELECTOR } from './menu-cluster'
import { pointReference, type PositionReference } from './position'
import type { FixedArgs, OmitArg } from './utils'

/** Arguments for the invocation-driven ContextMenu root. */
export type ContextMenuArgs = OmitArg<MenuArgs, 'defaultOpen' | 'gap' | 'open' | 'placement'> & FixedArgs<'defaultOpen' | 'gap' | 'open' | 'placement'>

/** Arguments for the single region that invokes a ContextMenu. */
export type ContextMenuTriggerArgs = WithChildren<IntrinsicElements['div'] & {
	/** Disable context menu activation. */
	disabled?: boolean
	/** Additional UnoCSS classes. */
	class?: string
}>

const ContextMenuRoot: Stateful<ContextMenuArgs> = function* () {
	let invoker: HTMLElement | null = null
	let point = { x: 0, y: 0 }
	let reference: PositionReference | null = null

	// One virtual reference per invoking source: re-invocation on the same
	// source moves its point without changing reference identity.
	const locate = (x: number, y: number, source: HTMLElement) => {
		point.x = x
		point.y = y
		if (source !== invoker || !reference) {
			invoker = source
			point = { x, y }
			reference = pointReference(source, () => point)
		}
		return reference
	}

	listen(this, 'contextmenu', (event: Event) => {
		const target = event.target as HTMLElement | null
		if (target?.closest(SURFACE_SELECTOR)) event.preventDefault()
	})

	for (const args of this) {
		yield (
			<MenuRoot
				disabled={args.disabled}
				invoker={locate}
				onOpenChange={args.onOpenChange}
				attr:data-slot="menu"
			>
				{args.children}
			</MenuRoot>
		)
	}
}

/** Root provider for a context menu; compose the Menu parts inside it. */
const ContextMenu: Stateless<ContextMenuArgs> = ({
	children,
	class: classes,
	disabled,
	onOpenChange,
	...attrs
}) => (
	<ContextMenuRoot
		{...rootAttrs(attrs)}
		disabled={disabled}
		onOpenChange={onOpenChange}
		attr:class={classes}
		attr:data-slot="context-menu"
	>
		{children}
	</ContextMenuRoot>
)

/** The single region that invokes its ContextMenu by pointer or keyboard. */
const ContextMenuTrigger: Stateless<ContextMenuTriggerArgs> = ({
	children,
	class: classes,
	disabled,
	id,
	ref,
	tabindex,
	'set:oncontextmenu': onContextMenu,
	'set:onkeydown': onKeydown,
	...attrs
}) => {
	const menu = MenuContext()
	const disabledFlag = Boolean(disabled ?? menu?.disabled)
	const adoptedId = menu?.adoptTriggerId(id)

	return (
		<div
			{...attrs}
			aria-controls={menu?.contentId}
			aria-disabled={disabledFlag ? 'true' : undefined}
			aria-expanded={menu?.open ? 'true' : 'false'}
			aria-haspopup="menu"
			class={classes}
			data-disabled={disabledFlag ? 'true' : undefined}
			data-slot="context-menu-trigger"
			data-state={menu?.open ? 'open' : 'closed'}
			id={adoptedId ?? id}
			ref={ref}
			set:oncontextmenu={(event: MouseEvent) => {
				const element = event.currentTarget as HTMLElement
				callHandler(onContextMenu, event)
				if (event.defaultPrevented || disabledFlag) return
				event.preventDefault()
				menu?.invoke?.(event.clientX, event.clientY, event, element, 'content')
			}}
			set:onkeydown={(event: KeyboardEvent) => {
				const element = event.currentTarget as HTMLElement
				callHandler(onKeydown, event)
				if (event.defaultPrevented || disabledFlag) return
				if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return
				event.preventDefault()
				const rect = element.getBoundingClientRect()
				menu?.invoke?.(rect.left, rect.bottom, event, element, 'first')
			}}
			tabindex={disabledFlag ? undefined : tabindex ?? 0}
		>
			{children}
		</div>
	)
}

export { ContextMenu, ContextMenuTrigger }
