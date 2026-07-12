/** @jsxImportSource ajo */
import type { Stateful } from 'ajo'
import type { Meta, Story } from './app'
import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentGroup,
	AttachmentMedia,
	AttachmentTitle,
	AttachmentTrigger,
} from '/src/ui/attachment'

export default {
	title: 'UI/Attachment',
	component: Attachment,
	parameters: {
		docs: { description: 'File and image attachment surface with metadata, actions, upload states, triggers, and scroll groups.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Attachment>

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

const image = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 120 120%22%3E%3Crect width=%22120%22 height=%22120%22 fill=%22%233596ac%22/%3E%3Ccircle cx=%2278%22 cy=%2242%22 r=%2224%22 fill=%22%23f3f0e9%22 opacity=%22.88%22/%3E%3Cpath d=%22M0 95 34 58l23 23 18-17 45 47v9H0z%22 fill=%22%230f2334%22 opacity=%22.6%22/%3E%3C/svg%3E'

const icons = {
	'alert-triangle': 'i-lucide-alert-triangle',
	'circle-check': 'i-lucide-circle-check',
	clock: 'i-lucide-clock',
	'file-code': 'i-lucide-file-code',
	'file-search': 'i-lucide-file-search',
	'file-spreadsheet': 'i-lucide-file-spreadsheet',
	'file-text': 'i-lucide-file-text',
	upload: 'i-lucide-upload',
}

const FileIcon = ({ name = 'file-text' }: { name?: string }) => (
	<span aria-hidden="true" class={`${icons[name as keyof typeof icons] ?? icons['file-text']} size-4`} />
)

const BasicAttachment = () => (
	<Attachment>
		<AttachmentMedia>
			<FileIcon />
		</AttachmentMedia>
		<AttachmentContent>
			<AttachmentTitle>sales-dashboard.pdf</AttachmentTitle>
			<AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
		</AttachmentContent>
		<AttachmentActions>
			<AttachmentAction aria-label="Remove sales-dashboard.pdf">
				<span aria-hidden="true" class="i-lucide-x size-3" />
			</AttachmentAction>
		</AttachmentActions>
	</Attachment>
)

const TriggerExample: Stateful = function* () {
	let opened = 0
	let removed = 0

	const open = () => this.next(() => opened++)
	const remove = () => this.next(() => removed++)

	while (true) yield (
		<div class="grid gap-3">
			<Attachment>
				<AttachmentMedia>
					<FileIcon name="file-search" />
				</AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>research-summary.pdf</AttachmentTitle>
					<AttachmentDescription>Open preview dialog</AttachmentDescription>
				</AttachmentContent>
				<AttachmentActions>
					<AttachmentAction aria-label="Remove research-summary.pdf" set:onclick={remove}>
						<span aria-hidden="true" class="i-lucide-x size-3" />
					</AttachmentAction>
				</AttachmentActions>
				<AttachmentTrigger aria-label="Preview research-summary.pdf" set:onclick={open} />
			</Attachment>
			<p class="text-sm text-muted-foreground">Opened: {opened} · Removed: {removed}</p>
		</div>
	)
}

export const Basic: Story = {
	render: () => <BasicAttachment />,
	play: async ({ canvas }) => {
		const root = canvas.querySelector<HTMLElement>('[data-slot="attachment"]')
		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="attachment-action"]')
		if (!root || !action) throw new Error('Basic attachment did not render root and action')
		if (root.dataset.state !== 'done' || root.dataset.size !== 'default' || action.type !== 'button') {
			throw new Error('Basic attachment defaults are wrong')
		}
	},
}

export const Image: Story = {
	render: () => (
		<div class="flex gap-3">
			{['workspace.png', 'desk-reference.jpg', 'office-reference.jpg'].map(name => (
				<Attachment key={name} orientation="vertical">
					<AttachmentMedia variant="image">
						<img src={image} alt={`Image: ${name}`} loading="lazy" decoding="async" />
					</AttachmentMedia>
					<AttachmentContent>
						<AttachmentTitle>{name}</AttachmentTitle>
						<AttachmentDescription>PNG · 820 KB</AttachmentDescription>
					</AttachmentContent>
				</Attachment>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const vertical = canvas.querySelectorAll('[data-slot="attachment"][data-orientation="vertical"]')
		const images = canvas.querySelectorAll<HTMLImageElement>('[data-slot="attachment-media"][data-variant="image"] img')
		if (vertical.length !== 3 || images.length !== 3) {
			throw new Error('Image attachments were not rendered')
		}
		if (!Array.from(images).every(item => item.loading === 'lazy' && item.decoding === 'async')) {
			throw new Error('Image attachments should use lazy async images')
		}
	},
}

export const States: Story = {
	render: () => (
		<div class="grid gap-2">
			<Attachment state="idle">
				<AttachmentMedia><FileIcon /></AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>selected-file.pdf</AttachmentTitle>
					<AttachmentDescription>Ready to upload</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
			<Attachment state="uploading">
				<AttachmentMedia><FileIcon name="upload" /></AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>design-system.zip</AttachmentTitle>
					<AttachmentDescription>Uploading · 64%</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
			<Attachment state="processing">
				<AttachmentMedia><FileIcon name="clock" /></AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>market-research.pdf</AttachmentTitle>
					<AttachmentDescription>Processing document</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
			<Attachment state="error">
				<AttachmentMedia><FileIcon name="alert-triangle" /></AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>financial-model.xlsx</AttachmentTitle>
					<AttachmentDescription>Upload failed. Try again.</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
			<Attachment state="done">
				<AttachmentMedia><FileIcon name="circle-check" /></AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>uploaded-report.pdf</AttachmentTitle>
					<AttachmentDescription>Uploaded · 1.8 MB</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
		</div>
	),
	play: async ({ canvas }) => {
		const states = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="attachment"]')).map(item => item.dataset.state)
		if (states.join('|') !== 'idle|uploading|processing|error|done') {
			throw new Error('Attachment states were not rendered in order')
		}
	},
}

export const Sizes: Story = {
	render: () => (
		<div class="grid gap-2">
			{(['default', 'sm', 'xs'] as const).map(size => (
				<Attachment key={size} size={size}>
					<AttachmentMedia>
						<FileIcon />
					</AttachmentMedia>
					<AttachmentContent>
						<AttachmentTitle>{size === 'default' ? 'Default attachment' : size === 'sm' ? 'Small attachment' : 'Extra small attachment'}</AttachmentTitle>
						{size !== 'xs' && <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>}
					</AttachmentContent>
				</Attachment>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const sizes = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot="attachment"]')).map(item => item.dataset.size)
		if (sizes.join('|') !== 'default|sm|xs') throw new Error('Attachment sizes were not rendered')
	},
}

export const Group: Story = {
	render: () => (
		<AttachmentGroup class="max-w-md" role="group" tabIndex={0} aria-label="Attached files">
			<BasicAttachment />
			<Attachment orientation="vertical">
				<AttachmentMedia variant="image">
					<img src={image} alt="Image: workspace.png" loading="lazy" decoding="async" />
				</AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>workspace.png</AttachmentTitle>
					<AttachmentDescription>PNG · 820 KB</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
			<Attachment>
				<AttachmentMedia><FileIcon name="file-spreadsheet" /></AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>customers.csv</AttachmentTitle>
					<AttachmentDescription>CSV · 18 KB</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
			<Attachment>
				<AttachmentMedia><FileIcon name="file-code" /></AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle>renderer.tsx</AttachmentTitle>
					<AttachmentDescription>TSX · 12 KB</AttachmentDescription>
				</AttachmentContent>
			</Attachment>
		</AttachmentGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="attachment-group"]')
		if (!group || group.getAttribute('role') !== 'group' || group.tabIndex !== 0) {
			throw new Error('Attachment group did not expose keyboard scroll semantics')
		}
		if (group.querySelectorAll('[data-slot="attachment"]').length !== 4) {
			throw new Error('Attachment group did not render every child')
		}
	},
}

export const Trigger: Story = {
	render: () => <TriggerExample />,
	play: async ({ canvas }) => {
		const action = canvas.querySelector<HTMLButtonElement>('[data-slot="attachment-action"]')
		const trigger = canvas.querySelector<HTMLButtonElement>('[data-slot="attachment-trigger"]')
		if (!action || !trigger) throw new Error('Attachment trigger story was not rendered')

		action.click()
		await nextFrame()
		if (!canvas.textContent?.includes('Opened: 0 · Removed: 1')) {
			throw new Error('Attachment action should stay independently clickable')
		}

		trigger.click()
		await nextFrame()
		if (!canvas.textContent?.includes('Opened: 1 · Removed: 1')) {
			throw new Error('Attachment trigger did not activate independently')
		}
	},
}
