/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import { Marker, MarkerContent, MarkerIcon } from '/src/ui/marker'
import Spinner from '/src/ui/spinner'

export default {
	title: 'UI/Marker',
	component: Marker,
	parameters: {
		docs: { description: 'Conversation marker for inline status, bordered rows, labeled separators, decorative icons, live progress, and interactive link/button markers.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Marker>

export const Variants: Story<typeof Marker> = {
	render: () => (
		<div class="grid w-[28rem] gap-3">
			<Marker>
				<MarkerContent>A default marker for inline notes.</MarkerContent>
			</Marker>
			<Marker variant="separator">
				<MarkerContent>A separator marker</MarkerContent>
			</Marker>
			<Marker variant="border">
				<MarkerContent>A border marker for row boundaries.</MarkerContent>
			</Marker>
		</div>
	),
	play: async ({ canvas }) => {
		const markers = canvas.querySelectorAll<HTMLElement>('[data-slot="marker"]')
		if (markers.length !== 3) throw new Error('Marker variants did not render')
		if (markers[1]?.dataset.variant !== 'separator' || markers[2]?.dataset.variant !== 'border') {
			throw new Error('Marker variants did not expose data-variant')
		}
	},
}

export const Status: Story<typeof Marker> = {
	render: () => (
		<div class="grid w-[28rem] gap-3">
				<Marker role="status">
					<MarkerIcon>
						<Spinner aria-hidden="true" role="presentation" />
					</MarkerIcon>
					<MarkerContent>Compacting conversation</MarkerContent>
				</Marker>
				<Marker role="status">
					<MarkerIcon>
						<Spinner aria-hidden="true" role="presentation" />
					</MarkerIcon>
					<MarkerContent>Running tests</MarkerContent>
				</Marker>
		</div>
	),
	play: async ({ canvas }) => {
		const status = canvas.querySelector<HTMLElement>('[role="status"][data-slot="marker"]')
		const icon = canvas.querySelector<HTMLElement>('[data-slot="marker-icon"]')
		if (!status || icon?.getAttribute('aria-hidden') !== 'true') {
			throw new Error('Marker status story did not render live marker with decorative icon')
		}
	},
}

export const Shimmer: Story<typeof Marker> = {
	render: () => (
		<div class="grid w-[28rem] gap-3">
			<Marker>
				<MarkerContent class="shimmer">Thinking...</MarkerContent>
			</Marker>
			<Marker>
				<MarkerContent class="shimmer">Reading 4 files</MarkerContent>
			</Marker>
		</div>
	),
	play: async ({ canvas }) => {
		const shimmer = canvas.querySelectorAll('[data-slot="marker-content"].shimmer')
		if (shimmer.length !== 2) throw new Error('Marker shimmer content did not render')
	},
}

export const Separator: Story<typeof Marker> = {
	render: () => (
		<div class="grid w-[28rem] gap-3">
			<Marker variant="separator">
				<MarkerContent>Today</MarkerContent>
			</Marker>
			<Marker>
				<MarkerContent>Worked for 42s</MarkerContent>
			</Marker>
			<Marker variant="separator">
				<MarkerContent>Conversation compacted</MarkerContent>
			</Marker>
		</div>
	),
}

export const Border: Story<typeof Marker> = {
	render: () => (
		<div class="grid w-[28rem] gap-2">
			<Marker variant="border">
				<MarkerIcon>
					<span class="i-lucide-git-branch size-4" />
				</MarkerIcon>
				<MarkerContent>Switched to release-candidate</MarkerContent>
			</Marker>
			<Marker variant="border">
				<MarkerIcon>
					<span class="i-lucide-search size-4" />
				</MarkerIcon>
				<MarkerContent>Reviewed 8 related files</MarkerContent>
			</Marker>
			<Marker variant="border">
				<MarkerIcon>
					<span class="i-lucide-file-text size-4" />
				</MarkerIcon>
				<MarkerContent>Opened implementation notes</MarkerContent>
			</Marker>
		</div>
	),
}

export const WithIcon: Story<typeof Marker> = {
	render: () => (
		<div class="grid w-[28rem] gap-3">
			<Marker>
				<MarkerIcon>
					<span class="i-lucide-git-branch size-4" />
				</MarkerIcon>
				<MarkerContent>Switched to a new branch</MarkerContent>
			</Marker>
			<Marker class="flex-col items-start">
				<MarkerIcon>
					<span class="i-lucide-search size-4" />
				</MarkerIcon>
				<MarkerContent>Explored 4 files</MarkerContent>
			</Marker>
			<Marker>
				<MarkerIcon>
					<span class="i-lucide-book-open-check size-4" />
				</MarkerIcon>
				<MarkerContent>Syncing completed</MarkerContent>
			</Marker>
		</div>
	),
}

export const LinksAndButtons: Story<typeof Marker> = {
	render: () => (
		<div class="grid w-[28rem] gap-3">
			<Marker as="a" href="#pull-request">
				<MarkerIcon>
					<span class="i-lucide-git-branch size-4" />
				</MarkerIcon>
				<MarkerContent>View the pull request</MarkerContent>
			</Marker>
			<Marker as="button" set:onclick={(event: Event) => {
				const target = event.currentTarget as HTMLElement
				target.dataset.clicked = 'true'
			}}>
				<MarkerIcon>
					<span class="i-lucide-rotate-ccw size-4" />
				</MarkerIcon>
				<MarkerContent>Revert this change</MarkerContent>
			</Marker>
		</div>
	),
	play: async ({ canvas }) => {
		const link = canvas.querySelector<HTMLAnchorElement>('a[data-slot="marker"]')
		const button = canvas.querySelector<HTMLButtonElement>('button[data-slot="marker"]')
		if (!link || !button || button.type !== 'button') {
			throw new Error('Marker did not render interactive link/button elements')
		}

		button.click()

		if (button.dataset.clicked !== 'true') {
			throw new Error('Marker button did not forward click handler')
		}
	},
}
