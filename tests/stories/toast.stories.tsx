/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import Button, { buttonVariants } from '/src/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '/src/ui/dialog'
import { Toaster, toast } from '/src/ui/toast'

export default {
	title: 'UI/Toast',
	component: Toaster,
	parameters: {
		docs: { description: 'Ajo-native toast API built on the local toast primitives.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Toaster>

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function assertCloseVisible(close: HTMLButtonElement | null): asserts close is HTMLButtonElement {
	if (!close) throw new Error('Toast close button was not rendered')

	const rect = close.getBoundingClientRect()
	if (rect.width < 28 || rect.height < 28) {
		throw new Error(`Toast close button is too small: ${rect.width}x${rect.height}`)
	}

	const icon = close.querySelector<HTMLElement>('[aria-hidden="true"]')
	const iconRect = icon?.getBoundingClientRect()
	if (!iconRect || iconRect.width < 14 || iconRect.height < 14) {
		throw new Error('Toast close icon is not visible')
	}
}

const DefaultDemo: Stateful = function* () {
	toast.clear()

	const show = () => toast('Event has been created.', {
		description: 'Sunday, December 03, 2023 at 9:00 AM',
	})

	while (true) yield (
		<div class="flex min-h-48 items-center justify-center">
			<Button variant="outline" set:onclick={show}>Show Toast</Button>
			<Toaster duration={3000} />
		</div>
	)
}

const StackedDemo: Stateful = function* () {
	toast.clear()

	const show = () => {
		toast('Copy Page', { description: 'Copied to clipboard.', duration: 0 })
		toast('Invite sent', { description: 'Ana can now access this workspace.', duration: 0 })
		toast('Event has been created', {
			action: {
				label: 'Undo',
				onClick: () => toast.success('Event restored'),
			},
			description: 'Sunday, December 03, 2023 at 9:00 AM',
			duration: 0,
		})
	}

	while (true) yield (
		<div class="flex min-h-48 items-center justify-center">
			<Button variant="outline" set:onclick={show}>Show Stack</Button>
			<Toaster duration={0} />
		</div>
	)
}

const TypesDemo: Stateful = function* () {
	toast.clear()

	while (true) yield (
		<div class="flex min-h-48 flex-wrap items-center justify-center gap-2">
			<Button variant="outline" set:onclick={() => toast('Event has been created')}>Default</Button>
			<Button variant="outline" set:onclick={() => toast.success('Event has been created')}>Success</Button>
			<Button variant="outline" set:onclick={() => toast.info('Be there 10 minutes before the event')}>Info</Button>
			<Button variant="outline" set:onclick={() => toast.warning('Event start time cannot be earlier than 8am')}>Warning</Button>
			<Button variant="outline" set:onclick={() => toast.error('Event has not been created')}>Error</Button>
			<Button variant="outline" set:onclick={() => toast.loading('Saving event')}>Loading</Button>
			<Toaster richColors duration={3000} />
		</div>
	)
}

const ActionDemo: Stateful = function* () {
	toast.clear()

	const show = () => toast('Event has been created', {
		action: {
			label: 'Undo',
			onClick: () => toast.success('Undo applied'),
		},
		description: 'Sunday, December 03, 2023 at 9:00 AM',
	})

	while (true) yield (
		<div class="flex min-h-48 items-center justify-center">
			<Button set:onclick={show}>Show Action Toast</Button>
			<Toaster duration={3000} />
		</div>
	)
}

const PromiseDemo: Stateful = function* () {
	toast.clear()

	const show = () => {
		void toast.promise(
			() => new Promise<{ name: string }>(resolve => setTimeout(() => resolve({ name: 'Event' }), 30)),
			{
				error: 'Error',
				loading: 'Loading...',
				success: (data: { name: string }) => `${data.name} has been created`,
			},
		)
	}

	while (true) yield (
		<div class="flex min-h-48 items-center justify-center">
			<Button variant="outline" set:onclick={show}>Promise</Button>
			<Toaster duration={3000} />
		</div>
	)
}

const AboveModalDemo: Stateful = function* () {
	toast.clear()

	const early = () => toast('Deploy queued', { description: 'Fired before the modal opened.', duration: 0 })
	const inside = () => toast('Saved from the modal', { description: 'Fired while the dialog is open.', duration: 0 })

	while (true) yield (
		<div class="flex min-h-48 items-center justify-center gap-2">
			<Button variant="outline" set:onclick={early}>Toast First</Button>
			<Dialog>
				<DialogTrigger class={buttonVariants({ variant: 'outline' })}>Open Dialog</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Modal dialog</DialogTitle>
						<DialogDescription>Toasts fired around this modal must stay above it in the top layer.</DialogDescription>
					</DialogHeader>
					<Button type="button" variant="outline" set:onclick={inside}>Toast From Dialog</Button>
					<DialogFooter showCloseButton />
				</DialogContent>
			</Dialog>
			<Toaster duration={0} />
		</div>
	)
}

const PositionDemo: Stateful = function* () {
	toast.clear()

	const show = () => toast('Event has been created', { position: 'top-center' })

	while (true) yield (
		<div class="flex min-h-48 items-center justify-center">
			<Button variant="outline" set:onclick={show}>Top Center</Button>
			<Toaster />
		</div>
	)
}

const HoverPauseDemo: Stateful = function* () {
	toast.clear()

	const anchor = () => toast('Sticky while hovered', { duration: 0 })

	while (true) yield (
		<div class="flex min-h-48 items-center justify-center">
			<Button variant="outline" set:onclick={anchor}>Anchor Toast</Button>
			<Toaster />
		</div>
	)
}

export const Default: Story = {
	render: () => <DefaultDemo />,
	play: async ({ canvas }) => {
		const button = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Show Toast'))
		if (!button) throw new Error('Toast default trigger was not rendered')

		// The viewports are permanent polite live regions: shown even while
		// empty (a live region that first appears together with its content is
		// never announced, so the first toast of a stack would stay silent),
		// but rendering no toast children.
		const viewports = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="toast-viewport"]'))
		if (!viewports.length) throw new Error('Toast viewports were not rendered')
		for (const node of viewports) {
			if (!node.matches(':popover-open')) {
				throw new Error('Toast viewport live region should stay shown while empty')
			}
			if (node.querySelector('[data-slot="toast"]')) {
				throw new Error('Toast viewport should render no toasts while none exist')
			}
		}

		button.click()
		await nextFrame()

		const root = canvas.querySelector<HTMLElement>('[data-slot="toaster"]')
		const toastNode = canvas.querySelector<HTMLElement>('[data-slot="toast"]')
		if (!root || !toastNode || !canvas.textContent?.includes('Event has been created.')) {
			throw new Error('Toast default toast was not rendered')
		}
		if (root.hasAttribute('data-theme') || root.hasAttribute('data-position')) {
			throw new Error('Toaster wrapper should not stamp dead theme or default-position markers')
		}

		const viewport = toastNode.closest<HTMLElement>('[data-slot="toast-viewport"]')
		if (!viewport?.matches(':popover-open')) {
			throw new Error('Toast viewport should be shown as a popover while toasts exist')
		}

		if (toastNode.getAttribute('role') !== 'status') {
			throw new Error('Toast default toast should use polite status semantics')
		}

		assertCloseVisible(canvas.querySelector<HTMLButtonElement>('[data-slot="toast-close"]'))
	},
}

export const Stacked: Story = {
	render: () => <StackedDemo />,
	play: async ({ canvas }) => {
		const button = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Show Stack'))
		if (!button) throw new Error('Toast stacked trigger was not rendered')

		button.click()
		await nextFrame()
		// Let the 200ms enter/stack transform transition settle before measuring.
		await wait(300)

		const toasts = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="toast"]'))
		if (toasts.length !== 3) throw new Error(`Expected 3 stacked toast items, got ${toasts.length}`)

		const byIndex = (index: number) => toasts.find(item => item.dataset.toastIndex === String(index))
		const front = byIndex(0)
		const second = byIndex(1)
		const third = byIndex(2)
		if (!front || !second || !third) throw new Error('Toast stack did not render expected toast items')
		if (front.dataset.front !== 'true' || second.dataset.front !== 'false') {
			throw new Error('Toast stack did not mark the front toast')
		}

		const frontRect = front.getBoundingClientRect()
		const secondRect = second.getBoundingClientRect()
		const thirdRect = third.getBoundingClientRect()

		// Bottom-right viewport: older toasts peek above the front and never
		// hang below the anchored edge.
		if (!(secondRect.top < frontRect.top)) {
			throw new Error('Second toast should peek above the front toast')
		}
		if (!(thirdRect.top < secondRect.top)) {
			throw new Error('Third toast should peek above the second toast')
		}
		if (secondRect.bottom > frontRect.bottom + 1) {
			throw new Error('Stacked toasts should not extend below the front toast')
		}
		if (secondRect.left < frontRect.left - 1 || secondRect.right > frontRect.right + 1) {
			throw new Error('Stacked toasts should stay within the front toast width')
		}
		if (getComputedStyle(second).transform === 'none') {
			throw new Error('Stacked toast should use transform depth')
		}

		// Hover continuity: the pointer-events-none viewport means the toasts'
		// own hit areas must tile the expanded stack, or crossing a gap fires
		// spurious pointerleave/enter pairs that flicker the stack (regression:
		// bridge dropped in the popover="manual" rewrite). Each toast bridges
		// toward its older sibling with an ::after at least the stack gap tall,
		// and a closing toast keeps its hit area while the stack is expanded.
		const bridge = getComputedStyle(front, '::after')
		if (bridge.content !== '""' || bridge.position !== 'absolute') {
			throw new Error('Toast should render an absolute ::after hover bridge')
		}
		if (!(parseFloat(bridge.height) >= 8)) {
			throw new Error(`Toast hover bridge should cover the stack gap, got height ${bridge.height}`)
		}
		front.dataset.closing = 'true'
		front.dataset.expanded = 'true'
		if (getComputedStyle(front).pointerEvents === 'none') {
			throw new Error('Closing toast should stay hit-testable while the stack is expanded')
		}
		front.dataset.expanded = 'false'
		if (getComputedStyle(front).pointerEvents !== 'none') {
			throw new Error('Closing toast should be click-through while the stack is collapsed')
		}
		front.dataset.closing = 'false'
		front.dataset.expanded = 'false'

		// Dismissing a behind toast must shrink the stack without leaving
		// ghost nodes or freezing (regression: unkeyed positional list).
		third.querySelector<HTMLElement>('[data-slot="toast-close"]')?.click()
		await wait(300)

		const remaining = canvas.querySelectorAll('[data-slot="toast"]').length
		if (remaining !== 2) {
			throw new Error(`Expected 2 toasts after dismissing a behind toast, got ${remaining}`)
		}
	},
}

export const Types: Story = {
	render: () => <TypesDemo />,
	play: async ({ canvas }) => {
		const success = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Success'))
		const error = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Error'))
		if (!success || !error) throw new Error('Toast type triggers were not rendered')

		success.click()
		await nextFrame()
		if (!canvas.querySelector('[data-slot="toast-icon"]') || !canvas.textContent?.includes('Event has been created')) {
			throw new Error('Toast success toast did not render with an icon')
		}

		error.click()
		await nextFrame()
		const alert = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="toast"]'))
			.find(node => node.getAttribute('role') === 'alert')
		if (!alert || !canvas.textContent?.includes('Event has not been created')) {
			throw new Error('Toast error toast should use alert semantics')
		}
	},
}

export const WithAction: Story = {
	render: () => <ActionDemo />,
	play: async ({ canvas }) => {
		const button = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Show Action Toast'))
		if (!button) throw new Error('Toast action trigger was not rendered')

		button.click()
		await nextFrame()

		const action = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Undo'))
		if (!action) throw new Error('Toast action was not rendered')

		action.click()
		await nextFrame()

		if (!canvas.textContent?.includes('Undo applied')) {
			throw new Error('Toast action callback did not run')
		}
	},
}

export const PromiseToast: Story = {
	name: 'Promise',
	render: () => <PromiseDemo />,
	play: async ({ canvas }) => {
		const button = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Promise'))
		if (!button) throw new Error('Toast promise trigger was not rendered')

		button.click()
		await nextFrame()
		if (!canvas.textContent?.includes('Loading...')) {
			throw new Error('Toast promise did not render loading state')
		}

		await wait(80)
		if (!canvas.textContent?.includes('Event has been created')) {
			throw new Error('Toast promise did not update to success state')
		}
	},
}

export const AboveModal: Story = {
	render: () => <AboveModalDemo />,
	play: async ({ canvas }) => {
		const first = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Toast First'))
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')
		const dialog = canvas.querySelector<HTMLDialogElement>('[data-slot="dialog-content"]')
		if (!first || !trigger || !dialog) throw new Error('Toast above-modal controls were not rendered')

		// A toast fired before the modal shows the viewport popover.
		first.click()
		await nextFrame()

		const viewport = canvas.querySelector<HTMLElement>('[data-slot="toast-viewport"][data-position="bottom-right"]')
		if (!viewport?.matches(':popover-open')) {
			throw new Error('Toast viewport should be popover-open while toasts exist')
		}

		// showModal() promotes the dialog above the shown viewport (engines
		// that hide popovers on showModal close it outright); the viewport
		// must end up popover-open again, re-promoted above the modal.
		trigger.click()
		await nextFrame()
		if (!dialog.open) throw new Error('Toast above-modal dialog did not open')

		// The dialog toggle event is queued, and the re-promotion rides a
		// microtask behind it: give it a couple of frames to settle.
		await wait(100)
		if (!viewport.matches(':popover-open')) {
			throw new Error('Toast viewport did not re-show after showModal hid all popovers')
		}

		// While the modal is open the toasts re-home INTO the dialog subtree —
		// everything outside a modal is inert regardless of top-layer order,
		// so only there can they stay interactive and announced.
		const inside = Array.from(dialog.querySelectorAll('button')).find(node => node.textContent?.includes('Toast From Dialog'))
		if (!inside) throw new Error('Toast above-modal dialog button was not rendered')

		inside.click()
		await nextFrame()
		await nextFrame()

		if (!viewport.matches(':popover-open')) {
			throw new Error('Toast viewport should stay popover-open while the dialog is open')
		}

		const portalToasts = () => Array.from(dialog.querySelectorAll<HTMLElement>('[data-slot="toast"]'))
		const toastNode = portalToasts().find(node => node.textContent?.includes('Saved from the modal'))
		if (!toastNode) throw new Error('Toast fired during a modal should render inside the dialog subtree')
		if (!portalToasts().some(node => node.textContent?.includes('Deploy queued'))) {
			throw new Error('Toasts fired before the modal should re-home into the open dialog')
		}

		const styles = getComputedStyle(toastNode)
		const rect = toastNode.getBoundingClientRect()
		if (styles.display === 'none' || styles.visibility !== 'visible' || rect.width < 1 || rect.height < 1) {
			throw new Error('Toast is not visible while the modal dialog is open')
		}

		// Interactivity above the modal: the close button must win the hit
		// test (an inert root-rendered toast hit-tests to the dialog backdrop
		// instead, and a real click there light-dismisses the dialog), and
		// dismissing the toast must leave the dialog open.
		const close = toastNode.querySelector<HTMLButtonElement>('[data-slot="toast-close"]')
		if (!close) throw new Error('Portal toast close button was not rendered')
		const closeRect = close.getBoundingClientRect()
		const hit = document.elementFromPoint(closeRect.left + closeRect.width / 2, closeRect.top + closeRect.height / 2)
		if (!hit || !close.contains(hit)) {
			throw new Error('Toast close button should win the hit test above the modal')
		}
		close.click()
		await wait(300)
		if (!dialog.open) throw new Error('Dismissing a toast must not close the modal dialog')
		if (portalToasts().some(node => node.textContent?.includes('Saved from the modal'))) {
			throw new Error('Toast was not dismissed from inside the modal')
		}

		// Closing the dialog re-homes surviving toasts back to the root
		// viewport, and the live region stays shown.
		dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')?.click()
		await nextFrame()
		if (dialog.open) throw new Error('Toast above-modal dialog did not close after smoke')
		await wait(100)
		if (!Array.from(viewport.querySelectorAll<HTMLElement>('[data-slot="toast"]')).some(node => node.textContent?.includes('Deploy queued'))) {
			throw new Error('Surviving toasts should re-home to the root viewport after the modal closes')
		}

		toast.clear()
		await nextFrame()
		if (canvas.querySelector('[data-slot="toast"]')) {
			throw new Error('Toast stack should be empty after clear')
		}
		if (!viewport.matches(':popover-open')) {
			throw new Error('Toast viewport live region should stay shown after the stack empties')
		}
	},
}

export const HoverPause: Story = {
	render: () => <HoverPauseDemo />,
	play: async ({ canvas }) => {
		const anchor = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Anchor Toast'))
		if (!anchor) throw new Error('Toast hover-pause trigger was not rendered')

		anchor.click()
		await nextFrame()

		const viewport = canvas.querySelector<HTMLElement>('[data-slot="toast-viewport"][data-position="bottom-right"]')
		if (!viewport || !canvas.textContent?.includes('Sticky while hovered')) {
			throw new Error('Toast hover-pause anchor toast was not rendered')
		}

		// Park the pointer on the stack.
		viewport.dispatchEvent(new PointerEvent('pointerenter'))
		await nextFrame()

		// A toast fired WHILE hovering must freeze with the rest of the stack:
		// pointerenter cannot re-fire under a stationary pointer, so the render
		// loop re-pauses the stack instead.
		toast('Fired under the pointer', { duration: 120 })
		await wait(400)
		if (!canvas.textContent?.includes('Fired under the pointer')) {
			throw new Error('Toast fired while hovering was not pause-protected')
		}

		// Leaving the stack resumes its timer and it dismisses normally.
		viewport.dispatchEvent(new PointerEvent('pointerleave'))
		await wait(600)
		if (canvas.textContent?.includes('Fired under the pointer')) {
			throw new Error('Toast did not resume its timer after the pointer left')
		}

		toast.clear()
	},
}

export const Position: Story = {
	render: () => <PositionDemo />,
	play: async ({ canvas }) => {
		const button = Array.from(canvas.querySelectorAll('button')).find(node => node.textContent?.includes('Top Center'))
		if (!button) throw new Error('Toast position trigger was not rendered')

		button.click()
		await nextFrame()

		const viewport = canvas.querySelector<HTMLElement>('[data-slot="toast-viewport"][data-position="top-center"]')
		if (!viewport || !viewport.textContent?.includes('Event has been created')) {
			throw new Error('Toast did not render the toast in the requested position viewport')
		}

		// Horizontally centered on screen (regression: the themed
		// -translate-x-1/2 utility compiles to the `translate` property and
		// stacked with the base's inline transform, shifting the viewport a
		// full extra half width left of center).
		await wait(250)
		const rect = viewport.getBoundingClientRect()
		const center = rect.left + rect.width / 2
		const expected = window.innerWidth / 2
		if (Math.abs(center - expected) > 2) {
			throw new Error(`Top-center toast viewport is off center: ${Math.round(center)}px vs ${Math.round(expected)}px`)
		}
	},
}
