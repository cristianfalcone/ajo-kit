/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import {
	Attachment as UiAttachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
} from '/src/ui/attachment'
import { Avatar, AvatarFallback } from '/src/ui/avatar'
import { Bubble, BubbleContent } from '/src/ui/bubble'
import Button from '/src/ui/button'
import { Marker, MarkerContent, MarkerIcon } from '/src/ui/marker'
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageGroup,
	MessageHeader,
} from '/src/ui/message'
import Spinner from '/src/ui/spinner'

export default {
	title: 'UI/Message',
	component: Message,
	parameters: {
		docs: { description: 'Conversation message layout with start/end alignment, avatar slot, header/footer metadata, actions, attachments, and status markers.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Message>

const AvatarInitial = ({ children }: { children: string }) => (
	<Avatar>
		<AvatarFallback>{children}</AvatarFallback>
	</Avatar>
)

export const AvatarRows: Story<typeof Message> = {
	render: () => (
		<div class="grid w-[34rem] gap-3">
			<Message>
				<MessageAvatar>
					<AvatarInitial>R</AvatarInitial>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="muted">
						<BubbleContent>The build failed during dependency installation.</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
			<Message align="end">
				<MessageAvatar>
					<AvatarInitial>ME</AvatarInitial>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="default">
						<BubbleContent>Can you share the exact error?</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		</div>
	),
	play: async ({ canvas }) => {
		const rows = canvas.querySelectorAll<HTMLElement>('[data-slot="message"]')
		if (rows.length !== 2 || rows[1]?.dataset.align !== 'end') {
			throw new Error('Message avatar rows did not render start/end alignment')
		}
	},
}

export const Group: Story<typeof Message> = {
	render: () => (
		<MessageGroup class="w-[34rem]">
			<Message>
				<MessageAvatar />
				<MessageContent>
					<Bubble variant="muted">
						<BubbleContent>I checked the registry addresses.</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
			<Message>
				<MessageAvatar>
					<AvatarInitial>CN</AvatarInitial>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="muted">
						<BubbleContent>The component and example JSON now live under the UI registry.</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
		</MessageGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.querySelector<HTMLElement>('[data-slot="message-group"]')
		const messages = group?.querySelectorAll('[data-slot="message"]')
		if (!group || messages?.length !== 2) throw new Error('MessageGroup did not stack messages')
	},
}

export const HeaderAndFooter: Story<typeof Message> = {
	args: { align: 'start' },
	argTypes: { align: { control: 'radio', options: ['start', 'end'] } },
	render: args => (
		<Message align={args.align} class="w-[34rem]">
			<MessageAvatar>
				<AvatarInitial>O</AvatarInitial>
			</MessageAvatar>
			<MessageContent>
				<MessageHeader>Olivia</MessageHeader>
				<Bubble variant="muted">
					<BubbleContent>
						I already checked the logs.
						<br />
						Send the report to the team. Ping @ajo if you need help.
					</BubbleContent>
				</Bubble>
				<MessageFooter>Read Yesterday</MessageFooter>
			</MessageContent>
		</Message>
	),
	play: async ({ canvas }) => {
		const header = canvas.querySelector('[data-slot="message-header"]')
		const footer = canvas.querySelector('[data-slot="message-footer"]')
		if (!header?.textContent?.includes('Olivia') || !footer?.textContent?.includes('Read Yesterday')) {
			throw new Error('Message header/footer did not render metadata')
		}
	},
}

export const Actions: Story<typeof Message> = {
	render: () => (
		<div class="grid w-[34rem] gap-3">
			<Message>
				<MessageContent>
					<Bubble variant="muted">
						<BubbleContent>The install failure is coming from the workspace package.</BubbleContent>
					</Bubble>
					<MessageFooter class="gap-1">
						<Button variant="ghost" size="icon-xs" aria-label="Copy">
							<span class="i-lucide-copy size-3" />
						</Button>
						<Button variant="ghost" size="icon-xs" aria-label="Retry">
							<span class="i-lucide-refresh-ccw size-3" />
						</Button>
					</MessageFooter>
				</MessageContent>
			</Message>
			<Message align="end">
				<MessageContent>
					<Bubble>
						<BubbleContent>Okay drop me a link. Taking a look...</BubbleContent>
					</Bubble>
					<MessageFooter>Failed to send</MessageFooter>
				</MessageContent>
			</Message>
		</div>
	),
	play: async ({ canvas }) => {
		const copy = canvas.querySelector<HTMLButtonElement>('button[aria-label="Copy"]')
		const retry = canvas.querySelector<HTMLButtonElement>('button[aria-label="Retry"]')
		if (!copy || !retry) throw new Error('Message action buttons need accessible labels')
	},
}

export const WithAttachment: Story<typeof Message> = {
	render: () => (
		<div class="grid w-[34rem] gap-3">
			<Message align="end">
				<MessageContent>
					<Bubble>
						<BubbleContent>Here's the image. Can you add it to the PDF?</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
			<Message>
				<MessageAvatar>
					<AvatarInitial>AI</AvatarInitial>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="muted">
						<BubbleContent>Done. Here's the PDF with the image added as the cover page.</BubbleContent>
					</Bubble>
					<UiAttachment class="max-w-xs">
						<AttachmentMedia>
							<span class="i-lucide-file-text size-5" />
						</AttachmentMedia>
						<AttachmentContent>
							<AttachmentTitle>sales-dashboard.pdf</AttachmentTitle>
							<AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
						</AttachmentContent>
						<AttachmentActions>
							<AttachmentAction aria-label="Download">
								<span class="i-lucide-download size-4" />
							</AttachmentAction>
						</AttachmentActions>
					</UiAttachment>
				</MessageContent>
			</Message>
		</div>
	),
	play: async ({ canvas }) => {
		const attachment = canvas.querySelector('[data-slot="attachment"]')
		if (!attachment?.textContent?.includes('sales-dashboard.pdf')) {
			throw new Error('Message attachment story did not render attachment content')
		}
	},
}

export const StatusUpdate: Story<typeof Message> = {
	args: { align: 'start' },
	argTypes: { align: { control: 'radio', options: ['start', 'end'] } },
	render: args => (
		<Message align={args.align} class="w-[34rem]">
			<MessageContent>
				<Marker role="status">
					<MarkerIcon>
						<Spinner aria-hidden="true" role="presentation" />
					</MarkerIcon>
					<MarkerContent>Checking the logs...</MarkerContent>
				</Marker>
			</MessageContent>
		</Message>
	),
	play: async ({ canvas }) => {
		const marker = canvas.querySelector<HTMLElement>('[role="status"][data-slot="marker"]')
		if (!marker?.textContent?.includes('Checking the logs')) {
			throw new Error('Message status marker did not render')
		}
	},
}
