/** @jsxImportSource ajo */
import type { Meta, PlayContext, Story } from './app'
import { frame } from './play'
import { Button } from 'ajo-ui-playa/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from 'ajo-ui-playa/card'
import { Input } from 'ajo-ui-playa/input'
import { Label } from 'ajo-ui-playa/label'
import { DirectionProvider } from 'ajo-ui-playa/direction'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from 'ajo-ui-playa/tabs'

export default {
	title: 'UI/Tabs',
	component: Tabs,
	args: {
		defaultValue: 'account',
		activationMode: 'automatic',
		orientation: 'horizontal',
	},
	argTypes: {
		defaultValue: { control: 'text' },
		activationMode: { control: 'radio', options: ['automatic', 'manual'] },
		orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
	},
	parameters: {
		docs: { description: 'Layered tab panels with Ajo Kit slots, Ajo state, ARIA tabs semantics, and roving focus.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Tabs>

const tab = (canvas: HTMLElement, value: string) =>
	canvas.querySelector<HTMLButtonElement>(`button[data-slot="tabs-trigger"][data-value="${value}"]`)

const panel = (canvas: HTMLElement, value: string) =>
	canvas.querySelector<HTMLElement>(`[data-slot="tabs-content"][data-value="${value}"]`)

// The line marker's bar is its content box, one focus width inside the
// selected tab on every side, so the ring drawn outside a focused tab never
// touches it. The bar is painted on the side of the tab that faces the panel,
// in either direction.
const assertMarkerClearsRing = async (selected: HTMLElement) => {
	const list = selected.closest<HTMLElement>('[data-slot="tabs-list"]')!
	await Promise.all(list.getAnimations({ subtree: true }).map(animation => animation.finished))
	const marker = getComputedStyle(list, '::before')
	const [x, y] = marker.translate.split(' ').map(Number.parseFloat)
	const [box, trigger] = [list.getBoundingClientRect(), selected.getBoundingClientRect()]
	const [left, top] = [box.left - list.scrollLeft + x, box.top - list.scrollTop + y]
	const [width, height, border] = [marker.width, marker.height, marker.borderLeftWidth].map(Number.parseFloat)
	const gaps = {
		start: left + border - trigger.left,
		end: trigger.right - (left + width - border),
		top: top + border - trigger.top,
		bottom: trigger.bottom - (top + height - border),
	}
	const ring = Number.parseFloat(getComputedStyle(list).getPropertyValue('--focus-width'))
	for (const [side, gap] of Object.entries(gaps)) {
		if (gap < ring - 0.01) throw new Error(`The line marker sits ${gap}px from the tab's ${side}, inside the focus ring`)
	}

	// The gradient runs toward the side opposite the bar; a negative scale mirrors it.
	const toward = /linear-gradient\(to (\w+)/.exec(marker.backgroundImage)?.[1]
	const opposite: Record<string, string> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }
	const mirrored = Number.parseFloat(marker.scale) < 0
	let edge = toward && opposite[toward]
	if (!edge) throw new Error(`The line marker paints no bar: ${marker.backgroundImage}`)
	if (mirrored && (edge === 'left' || edge === 'right')) edge = opposite[edge]
	const inner = { left: left + border, right: left + width - border, top: top + border, bottom: top + height - border }
	const middle = [(inner.left + inner.right) / 2, (inner.top + inner.bottom) / 2]
	const bar = {
		left: [inner.left + 1, middle[1]],
		right: [inner.right - 1, middle[1]],
		top: [middle[0], inner.top + 1],
		bottom: [middle[0], inner.bottom - 1],
	}[edge as keyof typeof inner]
	const tabs = selected.closest<HTMLElement>('[data-slot="tabs"]')!
	const content = tabs.querySelector<HTMLElement>(`[data-slot="tabs-content"][data-value="${selected.dataset.value}"]`)!.getBoundingClientRect()
	const target = [content.left + content.width / 2, content.top + content.height / 2]
	const distance = ([a, b]: number[]) => Math.hypot(a - target[0], b - target[1])
	if (distance(bar) >= distance([trigger.left + trigger.width / 2, trigger.top + trigger.height / 2])) {
		throw new Error(`The line bar is on the tab's ${edge}, away from the panel`)
	}
}

const AccountPanel = () => (
	<TabsContent value="account">
		<Card>
			<CardHeader>
				<CardTitle>Account</CardTitle>
				<CardDescription>
					Make changes to your account here. Click save when you are done.
				</CardDescription>
			</CardHeader>
			<CardContent class="grid gap-6">
				<div class="grid gap-3">
					<Label for="tabs-demo-name">Name</Label>
					<Input id="tabs-demo-name" value="Pedro Duarte" />
				</div>
				<div class="grid gap-3">
					<Label for="tabs-demo-username">Username</Label>
					<Input id="tabs-demo-username" value="@peduarte" />
				</div>
			</CardContent>
			<CardFooter>
				<Button>Save changes</Button>
			</CardFooter>
		</Card>
	</TabsContent>
)

const PasswordPanel = () => (
	<TabsContent value="password">
		<Card>
			<CardHeader>
				<CardTitle>Password</CardTitle>
				<CardDescription>
					Change your password here. After saving, you will be logged out.
				</CardDescription>
			</CardHeader>
			<CardContent class="grid gap-6">
				<div class="grid gap-3">
					<Label for="tabs-demo-current">Current password</Label>
					<Input id="tabs-demo-current" type="password" />
				</div>
				<div class="grid gap-3">
					<Label for="tabs-demo-new">New password</Label>
					<Input id="tabs-demo-new" type="password" />
				</div>
			</CardContent>
			<CardFooter>
				<Button>Save password</Button>
			</CardFooter>
		</Card>
	</TabsContent>
)

export const ImplicitValue: Story<typeof Tabs> = {
	render: () => (
		<Tabs class="w-[360px]">
			<TabsList>
				<TabsTrigger value="first">First</TabsTrigger>
				<TabsTrigger value="second">Second</TabsTrigger>
			</TabsList>
			<TabsContent value="first" forceMount>First panel.</TabsContent>
			<TabsContent value="second" forceMount>Second panel.</TabsContent>
		</Tabs>
	),
	play: async ({ canvas }) => {
		await frame()
		const first = tab(canvas, 'first')
		const second = tab(canvas, 'second')
		const firstPanel = panel(canvas, 'first')
		const secondPanel = panel(canvas, 'second')
		if (!first || !second || !firstPanel || !secondPanel) {
			throw new Error('Implicit-value tabs did not render their parts')
		}
		if (first.getAttribute('aria-selected') !== 'true' || firstPanel.hidden) {
			throw new Error('Tabs did not adopt the first trigger without an explicit value')
		}
		if (second.getAttribute('aria-selected') !== 'false' || !secondPanel.hidden) {
			throw new Error('Tabs implicit value did not leave the second panel inactive')
		}
	},
}

const IDENTITY_VALUES = ['日本語', '中文', 'C++', 'C#'] as const

export const RawValueIdentity: Story = {
	render: () => (
		<Tabs defaultValue={IDENTITY_VALUES[0]} class="w-[420px]">
			<TabsList>
				{IDENTITY_VALUES.map(value => (
					<TabsTrigger key={value} value={value}>{value}</TabsTrigger>
				))}
			</TabsList>
			{IDENTITY_VALUES.map(value => (
				<TabsContent forceMount key={value} value={value}>{value} panel.</TabsContent>
			))}
		</Tabs>
	),
	play: async ({ canvas }) => {
		const triggers = Array.from(canvas.querySelectorAll<HTMLButtonElement>('[data-slot="tabs-trigger"]'))
		const panels = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="tabs-content"]'))
		if (triggers.length !== IDENTITY_VALUES.length || panels.length !== IDENTITY_VALUES.length) {
			throw new Error('Raw-identity tabs did not render every trigger and panel')
		}

		const triggerIds = triggers.map(trigger => trigger.id)
		const panelIds = panels.map(panel => panel.id)
		if (triggerIds.some(id => !id) || new Set(triggerIds).size !== triggerIds.length) {
			throw new Error(`Tab trigger ids must be non-empty and unique, got ${triggerIds.join(', ')}`)
		}
		if (panelIds.some(id => !id) || new Set(panelIds).size !== panelIds.length) {
			throw new Error(`Tab panel ids must be non-empty and unique, got ${panelIds.join(', ')}`)
		}

		for (const value of IDENTITY_VALUES) {
			const trigger = triggers.find(node => node.dataset.value === value)
			const content = panels.find(node => node.dataset.value === value)
			if (!trigger || !content) throw new Error(`Missing raw-identity pair for ${value}`)
			if (trigger.getAttribute('aria-controls') !== content.id || document.getElementById(content.id) !== content) {
				throw new Error(`aria-controls did not resolve to the ${value} panel`)
			}
			if (content.getAttribute('aria-labelledby') !== trigger.id || document.getElementById(trigger.id) !== trigger) {
				throw new Error(`aria-labelledby did not resolve to the ${value} trigger`)
			}
		}
	},
}

export const Basic: Story<typeof Tabs> = {
	render: args => (
		<div class="flex w-full max-w-sm flex-col gap-6">
			<Tabs {...args}>
				<TabsList>
					<TabsTrigger value="account">Account</TabsTrigger>
					<TabsTrigger value="password">Password</TabsTrigger>
				</TabsList>
				<AccountPanel />
				<PasswordPanel />
			</Tabs>
		</div>
	),
	play: async ({ canvas }) => {
		const account = tab(canvas, 'account')
		const password = tab(canvas, 'password')
		if (!account || !password) throw new Error('Basic tabs did not render triggers')
		if (account.getAttribute('aria-selected') !== 'true' || !panel(canvas, 'account')) {
			throw new Error('Basic tabs did not render the default selected panel')
		}

		password.click()
		await frame()

		if (password.getAttribute('aria-selected') !== 'true' || !panel(canvas, 'password')) {
			throw new Error('Basic tabs did not activate clicked tab')
		}
	},
}

export const Line: Story<typeof Tabs> = {
	args: {
		defaultValue: 'overview',
		variant: 'line',
	},
	argTypes: {
		variant: { control: 'radio', options: ['default', 'line'] },
	},
	render: ({ variant, ...args }, { setArg }) => (
		<Tabs {...args} onValueChange={(next: string) => setArg('defaultValue', next)} class="w-[520px]">
			<TabsList variant={variant}>
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="analytics">Analytics</TabsTrigger>
				<TabsTrigger value="reports">Reports</TabsTrigger>
			</TabsList>
			<TabsContent value="overview" class="rounded-md edge p-4 text-sm">
				View your key metrics and recent project activity.
			</TabsContent>
			<TabsContent value="analytics" class="rounded-md edge p-4 text-sm">
				Track progress across all active projects.
			</TabsContent>
			<TabsContent value="reports" class="rounded-md edge p-4 text-sm">
				Download weekly and monthly report exports.
			</TabsContent>
		</Tabs>
	),
}

export const Vertical: Story<typeof Tabs> = {
	args: {
		defaultValue: 'account',
		orientation: 'vertical',
	},
	render: args => (
		<Tabs {...args} class="w-[560px]">
			<TabsList>
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="password">Password</TabsTrigger>
				<TabsTrigger value="notifications">Notifications</TabsTrigger>
			</TabsList>
			<TabsContent value="account" class="rounded-md edge p-4 text-sm">
				Manage your public profile and username.
			</TabsContent>
			<TabsContent value="password" class="rounded-md edge p-4 text-sm">
				Update the password used for this account.
			</TabsContent>
			<TabsContent value="notifications" class="rounded-md edge p-4 text-sm">
				Choose which product updates should reach your inbox.
			</TabsContent>
		</Tabs>
	),
	play: async ({ canvas }) => {
		const account = tab(canvas, 'account')
		const password = tab(canvas, 'password')
		if (!account || !password) throw new Error('Vertical tabs did not render expected triggers')

		account.focus()
		account.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		await frame()

		if (document.activeElement !== password) throw new Error('Vertical tabs ArrowDown did not move focus')
		if (password.getAttribute('aria-selected') !== 'true') throw new Error('Vertical tabs did not auto-activate focused tab')
	},
}

const VerticalLineTabs = (args: Record<string, unknown>) => (
	<Tabs {...args} class="w-[560px]">
		<TabsList variant="line">
			<TabsTrigger value="account">Account</TabsTrigger>
			<TabsTrigger value="password">Password</TabsTrigger>
			<TabsTrigger value="notifications">Notifications</TabsTrigger>
		</TabsList>
		<TabsContent value="account" class="rounded-md edge p-4 text-sm">Manage your public profile and username.</TabsContent>
		<TabsContent value="password" class="rounded-md edge p-4 text-sm">Update the password used for this account.</TabsContent>
		<TabsContent value="notifications" class="rounded-md edge p-4 text-sm">Choose which product updates should reach your inbox.</TabsContent>
	</Tabs>
)

const playVerticalLine = async ({ canvas }: PlayContext) => {
	const account = tab(canvas, 'account')
	const password = tab(canvas, 'password')
	if (!account || !password) throw new Error('Vertical line tabs did not render expected triggers')

	account.focus()
	account.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
	await frame()
	if (password.getAttribute('aria-selected') !== 'true') throw new Error('Vertical line tabs did not activate the focused tab')
	await assertMarkerClearsRing(password)
}

export const VerticalLine: Story<typeof Tabs> = {
	args: {
		defaultValue: 'account',
		orientation: 'vertical',
	},
	render: args => <VerticalLineTabs {...args} />,
	play: playVerticalLine,
}

// The list sits on the panel's other side, and the bar still faces the panel.
export const VerticalLineRTL: Story<typeof Tabs> = {
	args: {
		defaultValue: 'account',
		orientation: 'vertical',
	},
	render: args => (
		<DirectionProvider dir="rtl">
			<VerticalLineTabs {...args} />
		</DirectionProvider>
	),
	play: playVerticalLine,
}

export const InheritedRTL: Story = {
	render: () => (
		<DirectionProvider dir="rtl">
			<Tabs defaultValue="analytics" class="w-[420px]">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="analytics">Analytics</TabsTrigger>
					<TabsTrigger value="reports">Reports</TabsTrigger>
				</TabsList>
				<TabsContent value="overview">Overview panel.</TabsContent>
				<TabsContent value="analytics">Analytics panel.</TabsContent>
				<TabsContent value="reports">Reports panel.</TabsContent>
			</Tabs>
		</DirectionProvider>
	),
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="tabs"]')
		const overview = tab(canvas, 'overview')
		const analytics = tab(canvas, 'analytics')
		if (!root || !overview || !analytics) throw new Error('Inherited RTL tabs did not render expected parts')
		if (root.hasAttribute('dir') || getComputedStyle(root).direction !== 'rtl') throw new Error('Themed Tabs did not inherit RTL from DirectionProvider')

		analytics.focus()
		analytics.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
		await frame()

		if (document.activeElement !== overview || overview.getAttribute('aria-selected') !== 'true') {
			throw new Error('Inherited RTL Tabs ArrowRight did not move and activate the previous trigger')
		}

		overview.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
		await frame()

		if (document.activeElement !== analytics || analytics.getAttribute('aria-selected') !== 'true') {
			throw new Error('Inherited RTL Tabs ArrowLeft did not move and activate the next trigger')
		}
	},
}

export const Disabled: Story<typeof Tabs> = {
	args: {
		defaultValue: 'home',
	},
	render: (args, { setArg }) => (
		<Tabs {...args} onValueChange={(next: string) => setArg('defaultValue', next)} class="w-[360px]">
			<TabsList>
				<TabsTrigger value="home">Home</TabsTrigger>
				<TabsTrigger value="disabled" disabled>Disabled</TabsTrigger>
			</TabsList>
			<TabsContent value="home" class="rounded-md edge p-4 text-sm">Home content.</TabsContent>
			<TabsContent value="disabled" class="rounded-md edge p-4 text-sm">Disabled content.</TabsContent>
		</Tabs>
	),
	play: async ({ canvas }) => {
		const disabled = tab(canvas, 'disabled')
		if (!disabled) throw new Error('Disabled tabs story did not render disabled trigger')
		if (!disabled.disabled) throw new Error('Disabled tab trigger was not disabled')

		disabled.click()
		await frame()

		if (panel(canvas, 'disabled')) throw new Error('Disabled tab activated after click')
	},
}

export const Icons: Story<typeof Tabs> = {
	args: {
		defaultValue: 'preview',
	},
	render: (args, { setArg }) => (
		<Tabs {...args} onValueChange={(next: string) => setArg('defaultValue', next)} class="w-[420px]">
			<TabsList>
				<TabsTrigger value="preview">
					<span class="i-lucide-app-window size-4" />
					Preview
				</TabsTrigger>
				<TabsTrigger value="code">
					<span class="i-lucide-code size-4" />
					Code
				</TabsTrigger>
			</TabsList>
			<TabsContent value="preview" class="rounded-md edge p-4 text-sm">
				Application preview rendered from components.
			</TabsContent>
			<TabsContent value="code" class="rounded-md edge p-4 font-mono text-sm">
				&lt;Tabs defaultValue="preview" /&gt;
			</TabsContent>
		</Tabs>
	),
}

export const ManualActivation: Story<typeof Tabs> = {
	args: {
		defaultValue: 'overview',
		activationMode: 'manual',
	},
	render: args => (
		<Tabs {...args} class="w-[520px]">
			<TabsList variant="line">
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="analytics">Analytics</TabsTrigger>
				<TabsTrigger value="reports">Reports</TabsTrigger>
			</TabsList>
			<TabsContent value="overview" class="rounded-md edge p-4 text-sm">Overview panel.</TabsContent>
			<TabsContent value="analytics" class="rounded-md edge p-4 text-sm">Analytics panel.</TabsContent>
			<TabsContent value="reports" class="rounded-md edge p-4 text-sm">Reports panel.</TabsContent>
		</Tabs>
	),
	play: async ({ canvas }) => {
		const overview = tab(canvas, 'overview')
		const analytics = tab(canvas, 'analytics')
		if (!overview || !analytics) throw new Error('Manual tabs did not render expected triggers')

		overview.focus()
		overview.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
		await frame()

		if (document.activeElement !== analytics) throw new Error('Manual tabs ArrowRight did not move focus')
		if (analytics.getAttribute('aria-selected') === 'true') throw new Error('Manual tabs activated on focus')

		// A trusted Enter or Space activates the button natively, as a click.
		if (!analytics.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))) {
			throw new Error('Manual tabs prevented native Enter activation')
		}
		analytics.click()
		await frame()

		if (analytics.getAttribute('aria-selected') !== 'true' || !panel(canvas, 'analytics')) {
			throw new Error('Manual tabs did not activate on click')
		}

		await assertMarkerClearsRing(analytics)
	},
}

export const ForceMount: Story<typeof Tabs> = {
	args: {
		defaultValue: 'one',
	},
	render: (args, { setArg }) => (
		<Tabs {...args} onValueChange={(next: string) => setArg('defaultValue', next)} class="w-[360px]">
			<TabsList>
				<TabsTrigger value="one">One</TabsTrigger>
				<TabsTrigger value="two">Two</TabsTrigger>
			</TabsList>
			<TabsContent value="one" class="rounded-md edge p-4 text-sm">First panel.</TabsContent>
			<TabsContent forceMount value="two" class="rounded-md edge p-4 text-sm">Second panel stays mounted.</TabsContent>
		</Tabs>
	),
	play: async ({ canvas }) => {
		const inactive = panel(canvas, 'two')
		if (!inactive) throw new Error('Force-mounted inactive panel was not rendered')
		if (!inactive.hidden || inactive.getAttribute('data-state') !== 'inactive') {
			throw new Error('Force-mounted inactive panel was not hidden')
		}
	},
}

const OVERFLOW_TABS = ['Overview', 'Analytics', 'Reports', 'Notifications', 'Integrations', 'Permissions', 'Billing', 'Advanced'] as const

// Waits out a smooth scroll: done after five stable frames.
const settleScroll = async (list: HTMLElement) => {
	let last = -1
	let stable = 0
	for (let index = 0; index < 120 && stable < 5; index++) {
		await frame()
		const now = Math.round(list.scrollLeft * 4096 + list.scrollTop)
		stable = now === last ? stable + 1 : 0
		last = now
	}
	await frame(2)
}

const expectOverflow = (list: HTMLElement, axis: 'x' | 'y', expected: string) => {
	const actual = list.getAttribute(`data-overflow-${axis}`)
	if (actual !== expected) {
		throw new Error(`Tabs list data-overflow-${axis} should be "${expected}", got "${actual}"`)
	}
	if (getComputedStyle(list).maskImage === 'none') {
		throw new Error('Overflowing tabs list should carry an edge-fade mask')
	}
}

export const OverflowHorizontal: Story<typeof Tabs> = {
	args: {
		defaultValue: 'tab-overview',
	},
	render: args => (
		<div class="w-72">
			<Tabs {...args}>
				<TabsList>
					{OVERFLOW_TABS.map(name => (
						<TabsTrigger key={name} value={`tab-${name.toLowerCase()}`}>{name}</TabsTrigger>
					))}
				</TabsList>
				{OVERFLOW_TABS.map(name => (
					<TabsContent key={name} value={`tab-${name.toLowerCase()}`} class="rounded-md edge p-4 text-sm">
						{name} panel.
					</TabsContent>
				))}
			</Tabs>
			<Tabs defaultValue="a" class="mt-4" data-fits="true">
				<TabsList>
					<TabsTrigger value="a">A</TabsTrigger>
					<TabsTrigger value="b">B</TabsTrigger>
				</TabsList>
				<TabsContent value="a" class="text-sm">Fits.</TabsContent>
				<TabsContent value="b" class="text-sm">Also fits.</TabsContent>
			</Tabs>
		</div>
	),
	play: async ({ canvas }) => {
		const list = canvas.querySelector<HTMLElement>('[data-slot="tabs"]:not([data-fits]) [data-slot="tabs-list"]')
		if (!list) throw new Error('Overflow tabs list was not rendered')

		await frame(2)
		if (!(list.scrollWidth > list.clientWidth)) {
			throw new Error('Overflow tabs list should overflow its container')
		}

		// At rest only the trailing edge fades; scrolling walks end → both →
		// start; back to rest restores end. Instant behavior: the list is
		// scroll-smooth, and plays must not read mid-animation states.
		expectOverflow(list, 'x', 'end')
		list.scrollTo({ left: (list.scrollWidth - list.clientWidth) / 2, behavior: 'instant' })
		await frame(2)
		expectOverflow(list, 'x', 'both')
		list.scrollTo({ left: list.scrollWidth, behavior: 'instant' })
		await frame(2)
		expectOverflow(list, 'x', 'start')
		list.scrollTo({ left: 0, behavior: 'instant' })
		await frame(2)
		expectOverflow(list, 'x', 'end')

		// Activating a partially visible tab scrolls it fully into view and
		// clear of the edge fade (scroll-padding matches the 1rem mask).
		const partial = Array.from(list.querySelectorAll<HTMLButtonElement>('[data-slot="tabs-trigger"]'))
			.find(trigger => {
				const rect = trigger.getBoundingClientRect()
				const bounds = list.getBoundingClientRect()
				return rect.right > bounds.right && rect.left < bounds.right
			})
		if (!partial) throw new Error('Expected a partially visible tab at the trailing edge')

		partial.click()
		await settleScroll(list)
		const rect = partial.getBoundingClientRect()
		const bounds = list.getBoundingClientRect()
		if (rect.left < bounds.left + 15 || rect.right > bounds.right - 15) {
			throw new Error(`Activated tab should rest clear of the edge fade, got ${Math.round(rect.left - bounds.left)}..${Math.round(bounds.right - rect.right)}`)
		}

		// A list that fits carries no stamps and no mask.
		const fits = canvas.querySelector<HTMLElement>('[data-fits] [data-slot="tabs-list"]')
		if (!fits) throw new Error('Fitting tabs list was not rendered')
		if (fits.hasAttribute('data-overflow-x') || getComputedStyle(fits).maskImage !== 'none') {
			throw new Error('A fitting tabs list must not fade its edges')
		}
	},
}

export const OverflowVertical: Story<typeof Tabs> = {
	args: {
		defaultValue: 'tab-overview',
		orientation: 'vertical',
	},
	render: args => (
		<div class="h-48">
			<Tabs {...args} class="h-full">
				<TabsList>
					{OVERFLOW_TABS.map(name => (
						<TabsTrigger key={name} value={`tab-${name.toLowerCase()}`}>{name}</TabsTrigger>
					))}
				</TabsList>
				{OVERFLOW_TABS.map(name => (
					<TabsContent key={name} value={`tab-${name.toLowerCase()}`} class="rounded-md edge p-4 text-sm">
						{name} panel.
					</TabsContent>
				))}
			</Tabs>
		</div>
	),
	play: async ({ canvas }) => {
		const list = canvas.querySelector<HTMLElement>('[data-slot="tabs-list"]')
		if (!list) throw new Error('Vertical overflow tabs list was not rendered')

		await frame(2)
		if (!(list.scrollHeight > list.clientHeight)) {
			throw new Error('Vertical tabs list should overflow its container height')
		}

		expectOverflow(list, 'y', 'end')
		list.scrollTo({ top: (list.scrollHeight - list.clientHeight) / 2, behavior: 'instant' })
		await frame(2)
		expectOverflow(list, 'y', 'both')
		list.scrollTo({ top: list.scrollHeight, behavior: 'instant' })
		await frame(2)
		expectOverflow(list, 'y', 'start')
	},
}
