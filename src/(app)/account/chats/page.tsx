import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '/src/ui'

const Chats = () => (
	<Empty class="h-full min-h-0">
		<EmptyHeader>
			<EmptyMedia variant="icon">
				<span class="i-lucide-message-circle size-6" />
			</EmptyMedia>
			<EmptyTitle>Select a conversation</EmptyTitle>
			<EmptyDescription>
				Open an existing chat or start a new one from the list.
			</EmptyDescription>
		</EmptyHeader>
	</Empty>
)

export default Chats
