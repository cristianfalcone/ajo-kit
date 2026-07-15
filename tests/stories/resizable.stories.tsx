/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from 'ajo-ui-playa/resizable'

export default {
	title: 'UI/Resizable',
	component: ResizablePanelGroup,
	parameters: {
		docs: { description: 'Resizable flex panel groups with pointer and keyboard handles.' },
		layout: 'centered',
	},
} satisfies Meta<typeof ResizablePanelGroup>

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const handle = (canvas: HTMLElement, name = 'main') =>
	canvas.querySelector<HTMLElement>(`[data-resizable-handle="${name}"]`)

const panel = (canvas: HTMLElement, name: string) =>
	canvas.querySelector<HTMLElement>(`[data-resizable-panel="${name}"]`)

const assertHitArea = (el: HTMLElement, orientation: 'horizontal' | 'vertical') => {
	const box = el.getBoundingClientRect()
	const thickness = orientation === 'horizontal' ? box.width : box.height
	if (thickness > 2) throw new Error('Resizable pointer hit area changed the visible separator thickness')

	const x = box.left + box.width / 2
	const y = box.top + box.height / 2
	const points = orientation === 'horizontal'
		? [[x - 8, y], [x + 8, y]]
		: [[x, y - 8], [x, y + 8]]

	for (const [clientX, clientY] of points) {
		const target = document.elementFromPoint(clientX, clientY)
		const handle = target instanceof HTMLElement
			? target.closest<HTMLElement>('[data-slot="resizable-handle"]')
			: null
		if (handle !== el) {
			throw new Error(`Resizable ${orientation} handle has no pointer hit area at 8px from its visual separator`)
		}
	}
}

const pointer = (type: string, x: number, y: number) => new PointerEvent(type, {
	bubbles: true,
	button: 0,
	buttons: type === 'pointerup' ? 0 : 1,
	clientX: x,
	clientY: y,
	isPrimary: true,
	pointerId: 1,
})

const drag = async (el: HTMLElement, dx: number, dy = 0) => {
	const box = el.getBoundingClientRect()
	const x = box.left + box.width / 2
	const y = box.top + box.height / 2
	const target = el.closest<HTMLElement>('[data-slot="resizable-panel-group"]') ?? el

	el.dispatchEvent(pointer('pointerdown', x, y))
	target.dispatchEvent(pointer('pointermove', x + dx, y + dy))
	target.dispatchEvent(pointer('pointerup', x + dx, y + dy))
	await waitFrame()
}

const reset = (...items: Array<[HTMLElement | null, string]>) => {
	for (const [el, flex] of items) {
		if (!el) continue
		el.style.flex = flex
		delete el.dataset.size
	}
}

const Pane = ({ label }: { label: string }) => (
	<div class="flex h-full items-center justify-center p-6">
		<span class="font-semibold">{label}</span>
	</div>
)

export const Basic: Story<typeof ResizablePanelGroup> = {
	render: () => (
		<div class="h-[200px] w-[540px]">
			<ResizablePanelGroup
				orientation="horizontal"
				class="rounded-lg edge bg-card"
			>
				<ResizablePanel data-resizable-panel="one" defaultSize="50%" minSize="25%">
					<Pane label="One" />
				</ResizablePanel>
				<ResizableHandle data-resizable-handle="main" />
				<ResizablePanel data-resizable-panel="two" defaultSize="50%" minSize="25%">
					<ResizablePanelGroup orientation="vertical">
						<ResizablePanel defaultSize="25%">
							<Pane label="Two" />
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize="75%">
							<Pane label="Three" />
						</ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	),
	play: async ({ canvas }) => {
		const divider = handle(canvas)
		const first = panel(canvas, 'one')
		const second = panel(canvas, 'two')
		if (!divider || !first || !second) throw new Error('Resizable basic story did not render expected parts')
		assertHitArea(divider, 'horizontal')

		const before = first.getBoundingClientRect().width
		await drag(divider, 80)

		const after = first.getBoundingClientRect().width
		if (after <= before + 40) throw new Error('Resizable pointer drag did not grow the first panel')

		reset([first, '0 0 50%'], [second, '0 0 50%'])

		const inner = second.querySelector<HTMLElement>('[data-slot="resizable-panel-group"]')
		const nestedDivider = inner?.querySelector<HTMLElement>('[data-slot="resizable-handle"]')
		const top = nestedDivider?.previousElementSibling
		const bottom = nestedDivider?.nextElementSibling
		if (!(nestedDivider instanceof HTMLElement) || !(top instanceof HTMLElement) || !(bottom instanceof HTMLElement)) {
			throw new Error('Resizable nested vertical story did not render expected parts')
		}
		assertHitArea(nestedDivider, 'vertical')

		const topBefore = top.getBoundingClientRect().height
		const cursor = document.body.style.cursor
		const userSelect = document.body.style.userSelect
		await drag(nestedDivider, 80, 8)

		if (top.getBoundingClientRect().height > topBefore + 24) {
			throw new Error('Nested vertical resize reacted to horizontal pointer movement')
		}

		if (document.body.style.cursor !== cursor || document.body.style.userSelect !== userSelect) {
			throw new Error('Resizable pointer drag did not restore document cursor state')
		}

		reset([top, '0 0 25%'], [bottom, '0 0 75%'])
	},
}

export const WithHandle: Story<typeof ResizablePanelGroup> = {
	render: () => (
		<div class="h-[200px] w-[480px]">
			<ResizablePanelGroup orientation="horizontal" class="rounded-lg edge bg-card">
				<ResizablePanel defaultSize="35%">
					<Pane label="Sidebar" />
				</ResizablePanel>
				<ResizableHandle data-resizable-handle="main" withHandle />
				<ResizablePanel defaultSize="65%">
					<Pane label="Content" />
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	),
	play: async ({ canvas }) => {
		const grip = canvas.querySelector<HTMLElement>('[data-resizable-handle="main"] .i-lucide-grip-vertical')
		if (!grip) throw new Error('ResizableHandle withHandle did not render grip icon')
	},
}

export const Vertical: Story<typeof ResizablePanelGroup> = {
	render: () => (
		<div class="h-[260px] w-[480px]">
			<ResizablePanelGroup orientation="vertical" class="rounded-lg edge bg-card">
				<ResizablePanel data-resizable-panel="header" defaultSize="25%" minSize="15%">
					<Pane label="Header" />
				</ResizablePanel>
				<ResizableHandle data-resizable-handle="main" />
				<ResizablePanel data-resizable-panel="content" defaultSize="75%" minSize="30%">
					<Pane label="Content" />
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	),
	play: async ({ canvas }) => {
		const divider = handle(canvas)
		const header = panel(canvas, 'header')
		const content = panel(canvas, 'content')
		if (!divider || !header || !content) throw new Error('Vertical resizable story did not render expected parts')

		const before = header.getBoundingClientRect().height
		await drag(divider, 0, 50)

		const after = header.getBoundingClientRect().height
		if (after <= before + 25) throw new Error('Resizable vertical drag did not grow the header panel')

		reset([header, '0 0 25%'], [content, '0 0 75%'])
	},
}

export const Keyboard: Story<typeof ResizablePanelGroup> = {
	render: () => (
		<div class="h-[180px] w-[480px]">
			<ResizablePanelGroup orientation="horizontal" class="rounded-lg edge bg-card">
				<ResizablePanel data-resizable-panel="left" defaultSize="50%">
					<Pane label="Left" />
				</ResizablePanel>
				<ResizableHandle data-resizable-handle="main" withHandle />
				<ResizablePanel data-resizable-panel="right" defaultSize="50%">
					<Pane label="Right" />
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	),
	play: async ({ canvas }) => {
		const divider = handle(canvas)
		const left = panel(canvas, 'left')
		const right = panel(canvas, 'right')
		if (!divider || !left || !right) throw new Error('Keyboard resizable story did not render expected parts')

		const before = left.getBoundingClientRect().width
		divider.focus()
		divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
		await waitFrame()

		const after = left.getBoundingClientRect().width
		if (after <= before) throw new Error('Resizable keyboard ArrowRight did not grow left panel')

		reset([left, '0 0 50%'], [right, '0 0 50%'])
	},
}

export const Constraints: Story<typeof ResizablePanelGroup> = {
	render: () => (
		<div class="h-[180px] w-[480px]">
			<ResizablePanelGroup orientation="horizontal" class="rounded-lg edge bg-card">
				<ResizablePanel data-resizable-panel="nav" defaultSize="30%" minSize="25%" maxSize="45%">
					<Pane label="Nav" />
				</ResizablePanel>
				<ResizableHandle data-resizable-handle="main" />
				<ResizablePanel data-resizable-panel="workspace" defaultSize="70%" minSize="40%">
					<Pane label="Workspace" />
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	),
	play: async ({ canvas }) => {
		const divider = handle(canvas)
		const nav = panel(canvas, 'nav')
		const workspace = panel(canvas, 'workspace')
		if (!divider || !nav || !workspace) throw new Error('Constraints resizable story did not render expected parts')

		await drag(divider, 400)

		const group = canvas.querySelector<HTMLElement>('[data-slot="resizable-panel-group"]')
		const width = group?.getBoundingClientRect().width ?? 0
		const navPercent = width ? nav.getBoundingClientRect().width / width * 100 : 0
		if (navPercent > 46) throw new Error('Resizable panel ignored maxSize constraint')

		reset([nav, '0 0 30%'], [workspace, '0 0 70%'])
	},
}
