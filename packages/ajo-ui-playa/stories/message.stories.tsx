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
} from 'ajo-ui-playa/attachment'
import { Avatar, AvatarFallback } from 'ajo-ui-playa/avatar'
import { Bubble, BubbleContent } from 'ajo-ui-playa/bubble'
import { Button } from 'ajo-ui-playa/button'
import { Marker, MarkerContent, MarkerIcon } from 'ajo-ui-playa/marker'
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageGroup,
	MessageHeader,
} from 'ajo-ui-playa/message'
import { Spinner } from 'ajo-ui-playa/spinner'

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
					<AvatarInitial>GH</AvatarInitial>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="secondary">
						<BubbleContent>The deploy of shop-web 1.4.2 failed while installing dependencies.</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
			<Message align="end">
				<MessageAvatar>
					<AvatarInitial>AL</AvatarInitial>
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
					<Bubble variant="secondary">
						<BubbleContent>I checked the DNS records for shop.example.com.</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
			<Message>
				<MessageAvatar>
					<AvatarInitial>GH</AvatarInitial>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="secondary">
						<BubbleContent>They point at host-01, so the certificate can renew tonight.</BubbleContent>
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
				<AvatarInitial>GH</AvatarInitial>
			</MessageAvatar>
			<MessageContent>
				<MessageHeader>Grace Hopper</MessageHeader>
				<Bubble variant="secondary">
					<BubbleContent>
						I checked the logs of shop-web.
						<br />
						The restart at 03:10 cleared the memory warning.
					</BubbleContent>
				</Bubble>
				<MessageFooter>Read yesterday</MessageFooter>
			</MessageContent>
		</Message>
	),
	play: async ({ canvas }) => {
		const header = canvas.querySelector('[data-slot="message-header"]')
		const footer = canvas.querySelector('[data-slot="message-footer"]')
		if (!header?.textContent?.includes('Grace Hopper') || !footer?.textContent?.includes('Read yesterday')) {
			throw new Error('Message header/footer did not render metadata')
		}
	},
}

export const Actions: Story<typeof Message> = {
	render: () => (
		<div class="grid w-[34rem] gap-3">
			<Message>
				<MessageContent>
					<Bubble variant="secondary">
						<BubbleContent>The install fails because blog has no lockfile.</BubbleContent>
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
						<BubbleContent>Send me the version id and I will roll it back.</BubbleContent>
					</Bubble>
					<MessageFooter>Not sent. Check your connection and retry.</MessageFooter>
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
						<BubbleContent>Can you send me the build log of the failed deploy?</BubbleContent>
					</Bubble>
				</MessageContent>
			</Message>
			<Message>
				<MessageAvatar>
					<AvatarInitial>GH</AvatarInitial>
				</MessageAvatar>
				<MessageContent>
					<Bubble variant="secondary">
						<BubbleContent>Here it is. The failure starts at line 214.</BubbleContent>
					</Bubble>
					<UiAttachment class="max-w-xs">
						<AttachmentMedia>
							<span class="i-lucide-file-text size-5" />
						</AttachmentMedia>
						<AttachmentContent>
							<AttachmentTitle>deploy-1.4.2.log</AttachmentTitle>
							<AttachmentDescription>Log file, 48 KB</AttachmentDescription>
						</AttachmentContent>
						<AttachmentActions>
							<AttachmentAction aria-label="Download deploy-1.4.2.log">
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
		if (!attachment?.textContent?.includes('deploy-1.4.2.log')) {
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
