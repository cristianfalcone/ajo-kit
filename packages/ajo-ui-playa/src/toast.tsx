import type { Children, Stateless } from 'ajo'
import clsx from 'clsx'
import {
	Toaster as BaseToaster,
	type ToasterArgs as BaseToasterArgs,
	type ToastKind,
	type ToastView,
} from 'ajo-ui/toast'
export { toast } from 'ajo-ui/toast'
export type { ToastKind, ToastOptions, ToastPosition, ToastPromiseMessages } from 'ajo-ui/toast'

/** Props for the themed Toaster. */
export type ToasterArgs = Pick<BaseToasterArgs, 'class' | 'closeButton' | 'duration' | 'expand' | 'hotkey' | 'icons' | 'label' | 'limit' | 'pauseOnWindowBlur' | 'position'> & {
	/** Apply kind-colored toast surfaces to success, info and warning toasts. */
	richColors?: boolean
}

const rootBase = 'group/toast pointer-events-auto grid origin-top grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 rounded-lg edge p-4 pr-10 shadow-lg transition-[margin,opacity,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none'
// Tonal surfaces replace the glass-overlay surface wholesale so each toast
// keeps a single bg/ring owner instead of stacking tints over the shortcut.
const tones: Partial<Record<ToastKind, string>> = {
	error: 'bg-danger/10 text-danger inset-ring-danger/25 backdrop-blur-xl backdrop-saturate-150',
	info: 'bg-info/10 text-info inset-ring-info/25 backdrop-blur-xl backdrop-saturate-150',
	success: 'bg-success/10 text-success inset-ring-success/25 backdrop-blur-xl backdrop-saturate-150',
	warning: 'bg-warning/10 text-warning inset-ring-warning/25 backdrop-blur-xl backdrop-saturate-150',
}
// No z-index and no display utility: the viewport is a `popover="manual"`
// element, so the top layer owns stacking (a fixed z-100 loses to an open
// modal <dialog>) and the UA popover rule must keep it display:none while
// hidden. Corner placement is the base's inline style.
const viewportBase = 'pointer-events-none fixed group/toast-viewport w-full p-4 outline-none sm:max-w-[420px]'
const titleBase = 'text-sm font-semibold'
const descriptionBase = 'text-sm opacity-90'
const actionBase = 'inline-flex h-8 shrink-0 items-center justify-center rounded-md edge bg-transparent px-3 text-sm font-medium transition-colors outline-none hover:bg-accent hover:edge-on-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 group-data-[variant=danger]/toast:inset-ring-danger/40 group-data-[variant=danger]/toast:hover:bg-danger/10 group-data-[variant=danger]/toast:hover:inset-ring-danger/33 group-data-[variant=danger]/toast:hover:text-danger'
const closeBase = 'absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md text-foreground/60 opacity-70 outline-none transition-opacity hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none group-data-[variant=danger]/toast:text-danger/70 group-data-[variant=danger]/toast:hover:text-danger'
const contentBase = 'grid gap-1 transition-opacity duration-200 motion-reduce:transition-none'
const actionWrapperBase = 'col-start-2 row-span-2 row-start-1 self-center transition-opacity duration-200 motion-reduce:transition-none'

const icon = (name: string) => <span aria-hidden="true" class={`${name} size-4 shrink-0`} />

const icons: Partial<Record<ToastKind, Children>> = {
	error: icon('i-lucide-octagon-x text-danger'),
	info: icon('i-lucide-info text-info'),
	loading: icon('i-lucide-loader-2 animate-spin text-muted-foreground motion-reduce:animate-none'),
	success: icon('i-lucide-circle-check text-success'),
	warning: icon('i-lucide-triangle-alert text-warning'),
}

/** Themed renderer for generated toasts. */
export const Toaster: Stateless<ToasterArgs> = ({
	class: classes,
	icons: custom,
	richColors = false,
	...args
}) => (
	<BaseToaster
		{...args}
		actionClass={actionBase}
		actionWrapperClass={actionWrapperBase}
		class={clsx(viewportBase, 'toaster group', classes)}
		closeChildren={<span aria-hidden="true" class="i-lucide-x block size-4" />}
		closeClass={closeBase}
		contentClass={contentBase}
		descriptionClass={descriptionBase}
		icons={{ ...icons, ...custom }}
		titleClass={titleBase}
		toastClass={(item: ToastView) => clsx(rootBase, (richColors || item.kind === 'error') && tones[item.kind] || 'glass-overlay')}
	/>
)
