/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { VirtualList, type VirtualListApi } from '/src/ui/virtual-list'
import { assertScrollFrame, assertScrollFrameFocus } from './scroll-frame'

const fixedItems = Array.from({ length: 100_000 }, (_, index) => index)
const variableItems = Array.from({ length: 10_000 }, (_, index) => index)
const interactiveItems = Array.from({ length: 5_000 }, (_, index) => index)
const darkItems = fixedItems.slice(0, 1_000)
const interactiveApis = new WeakMap<HTMLUListElement, VirtualListApi<number>>()

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const waitUntil = async (check: () => boolean, timeout = 1600) => {
	const start = performance.now()
	while (performance.now() - start < timeout) {
		if (check()) return
		await waitFrame()
	}
	throw new Error('Timed out waiting for VirtualList state')
}

const root = (canvas: HTMLElement) => {
	const element = canvas.querySelector<HTMLUListElement>('[data-slot="virtual-list"]')
	if (!element) throw new Error('VirtualList root was not rendered')
	return element
}

const assertRootContract = (canvas: HTMLElement, element: HTMLUListElement) => {
	if (canvas.querySelectorAll('[data-slot="virtual-list"]').length !== 1) {
		throw new Error('VirtualList must render one viewport owner')
	}
	if (canvas.querySelector('[data-slot="scroll-area"]')) {
		throw new Error('VirtualList must not nest a ScrollArea')
	}
	assertScrollFrame(element, 'VirtualList')
	for (const token of ['overflow-y-auto', 'overflow-x-hidden', 'overscroll-contain', 'scrollbar-soft']) {
		if (!element.classList.contains(token)) throw new Error(`VirtualList is missing ${token}`)
	}
	if (element.tabIndex !== 0) throw new Error('VirtualList must be keyboard focusable')
}

export default {
	title: 'UI/Virtual List',
	component: VirtualList,
	parameters: {
		docs: { description: 'Virtualized native list with stable keys, dynamic measurement, and one styled scroll owner.' },
		layout: 'centered',
	},
} satisfies Meta<typeof VirtualList>

export const Empty: Story<typeof VirtualList> = {
	render: () => (
		<VirtualList
			aria-label="Empty results"
			class="h-48 w-[28rem] rounded-lg edge bg-card"
			estimateSize={40}
			getItemKey={(item: number) => item}
			items={[] as readonly number[]}
			renderItem={(item: number) => item}
		/>
	),
	play: async ({ canvas }) => {
		const element = root(canvas)
		assertRootContract(canvas, element)
		await assertScrollFrameFocus(element, 'VirtualList')
		if (element.querySelector('[data-slot="virtual-list-item"]')) throw new Error('Empty VirtualList rendered an item')
		if (element.querySelector<HTMLElement>('[data-slot="virtual-list-sizer"]')?.style.height !== '0px') {
			throw new Error('Empty VirtualList must keep an inert zero-size sizer')
		}
	},
}

export const Fixed: Story<typeof VirtualList> = {
	render: () => (
		<VirtualList
			aria-label="One hundred thousand releases"
			class="h-80 w-[28rem] rounded-lg edge bg-card text-card-foreground"
			estimateSize={40}
			getItemKey={(item: number) => item}
			items={fixedItems}
			renderItem={(item: number) => (
				<div class="flex h-10 items-center border-b border-border px-4 text-sm">
					Release #{item + 1}
				</div>
			)}
		/>
	),
	play: async ({ canvas }) => {
		const element = root(canvas)
		assertRootContract(canvas, element)
		await waitUntil(() => element.querySelectorAll('[data-slot="virtual-list-item"]').length > 0)
		const initialCount = element.querySelectorAll('[data-slot="virtual-list-item"]').length
		if (initialCount >= 50) throw new Error(`VirtualList materialized too many fixed rows: ${initialCount}`)
		const first = element.querySelector('[data-slot="virtual-list-item"]')
		if (first?.getAttribute('aria-posinset') !== '1' || first.getAttribute('aria-setsize') !== '100000') {
			throw new Error('VirtualList did not expose logical list positions')
		}

		element.scrollTop = 50_000 * 40
		element.dispatchEvent(new Event('scroll'))
		await waitUntil(() => element.textContent?.includes('Release #50001') === true)
		if (element.querySelectorAll('[data-slot="virtual-list-item"]').length >= 50) {
			throw new Error('VirtualList DOM grew with the fixed dataset')
		}
		element.scrollTop = 0
		element.dispatchEvent(new Event('scroll'))
	},
}

export const Variable: Story<typeof VirtualList> = {
	render: () => (
		<VirtualList
			aria-label="Variable height activity"
			class="h-80 w-[30rem] rounded-lg edge bg-card text-card-foreground"
			estimateSize={64}
			getItemKey={(item: number) => item}
			items={variableItems}
			renderItem={(item: number) => {
				const height = 40 + item % 3 * 24
				return (
					<div class="flex items-center border-b border-border px-4 text-sm" style={`height:${height}px`}>
						Activity #{item + 1} · {height}px
					</div>
				)
			}}
		/>
	),
	play: async ({ canvas }) => {
		const element = root(canvas)
		assertRootContract(canvas, element)
		await waitUntil(() => element.querySelectorAll('[data-slot="virtual-list-item"]').length >= 3)
		const heights = new Set(Array.from(
			element.querySelectorAll<HTMLElement>('[data-slot="virtual-list-item"]'),
			item => item.offsetHeight,
		))
		if (heights.size < 2) throw new Error('Variable VirtualList did not measure distinct row heights')
		if (element.querySelectorAll('[data-slot="virtual-list-item"]').length >= 50) {
			throw new Error('Variable VirtualList materialized too many rows')
		}
	},
}

export const Interactive: Story<typeof VirtualList> = {
	render: () => {
		let element: HTMLUListElement | null = null
		let api: VirtualListApi<number> | undefined
		const publish = () => {
			if (element && api) interactiveApis.set(element, api)
		}
		return (
			<VirtualList
				aria-label="Focusable commands"
				class="h-80 w-[28rem] rounded-lg edge bg-card text-card-foreground"
				estimateSize={44}
				getItemKey={(item: number) => item}
				items={interactiveItems}
				ref={(next: HTMLUListElement | null) => {
					element = next
					publish()
				}}
				renderItem={(item: number) => (
					<button class="flex h-11 w-full items-center rounded-md px-3 text-start text-sm hover:bg-accent focus-visible:bg-accent" type="button">
						Command #{item + 1}
					</button>
				)}
				setApi={(next: VirtualListApi<number>) => {
					api = next
					publish()
				}}
			/>
		)
	},
	play: async ({ canvas }) => {
		const element = root(canvas)
		assertRootContract(canvas, element)
		await waitUntil(() => Boolean(interactiveApis.get(element) && element.querySelector('button')))
		const first = element.querySelector<HTMLButtonElement>('button')
		if (!first) throw new Error('Interactive VirtualList did not render its first control')
		first.focus()
		if (document.activeElement !== first) throw new Error('VirtualList row control did not receive focus')
		if (!interactiveApis.get(element)?.scrollTo({ key: 4_000 }, { align: 'center' })) {
			throw new Error('VirtualList controller rejected a current key')
		}
		await waitUntil(() => element.textContent?.includes('Command #4001') === true)
		if (!first.isConnected || document.activeElement !== first) {
			throw new Error('VirtualList did not pin the focused row across a distant jump')
		}
		first.blur()
	},
}

export const Dark: Story<typeof VirtualList> = {
	render: () => (
		<div class="dark rounded-xl bg-background p-4 text-foreground">
			<VirtualList
				aria-label="Dark virtual list"
				class="h-64 w-[28rem] rounded-lg edge bg-card"
				estimateSize={40}
				getItemKey={(item: number) => item}
				items={darkItems}
				renderItem={(item: number) => <div class="flex h-10 items-center border-b border-border px-4">Row {item + 1}</div>}
			/>
		</div>
	),
}
