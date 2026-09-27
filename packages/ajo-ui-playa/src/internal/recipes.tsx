import { clx } from 'ajo-ui/utils'

// Recipes shared across family lanes live behind the family entrypoints. They
// are implementation seams between Playa adapters, not part of any component
// family's public API. A family emits every class of each module it imports,
// so recipes that only a few families share live in their own small modules
// beside this one, and a recipe of one family lives in that family's file.

/** Returns true when JSX children carry no visible content. */
export const emptyChildren = (children: unknown) =>
	children == null ||
	children === false ||
	(Array.isArray(children) && children.every(child => child == null || child === false))

/** Label text shared by Label and FieldLabel. */
export const labelBase = 'flex items-center gap-2 text-sm font-medium leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50'

/** Shared open/closed motion for popup surfaces, disabled for reduced motion. */
export const popupAnimation = 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none'

/** Placement-aware entrance motion; families that should not slide omit it. */
export const popupSlide = 'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'

const scrollOverflow = {
	both: 'overflow-auto',
	x: 'overflow-x-auto overflow-y-hidden',
	y: 'overflow-y-auto overflow-x-hidden',
}

type ScrollAreaVariantOptions = {
	axis?: keyof typeof scrollOverflow
	class?: string
}

/** Shared scroll idiom for themed scroll regions and popup lists. */
export const scrollAreaVariants = ({
	axis = 'both',
	class: classes,
}: ScrollAreaVariantOptions = {}) => clx(scrollOverflow[axis], 'overscroll-contain scrollbar-soft', classes)

const scrollAreaFrame = 'relative min-h-0 min-w-0 rounded-[inherit] transition-[color,box-shadow] has-[>:focus-visible]:ring-3 has-[>:focus-visible]:ring-ring/50'
const scrollAreaViewport = 'scrollbar-framed relative h-full w-full min-h-0 min-w-0 rounded-[inherit] outline-none [scrollbar-gutter:stable]'

export const scrollAreaFrameVariants = ({ class: classes }: Pick<ScrollAreaVariantOptions, 'class'> = {}) =>
	clx(scrollAreaFrame, classes)

export const scrollAreaViewportVariants = ({
	axis = 'both',
	class: classes,
}: ScrollAreaVariantOptions = {}) => clx(scrollAreaVariants({ axis }), scrollAreaViewport, classes)
