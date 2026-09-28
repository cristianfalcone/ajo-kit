/** @jsxImportSource ajo */
import type { Args, Meta, Story } from '../app'
import { assertRowAligned, assertStill } from '../play'
import { Button, buttonVariants } from 'ajo-ui-playa/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from 'ajo-ui-playa/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

export default {
	title: 'Screens/Placeholder',
	args: { invalid: false },
	parameters: {
		docs: { description: 'Holds the screens runner to its checks until the composition screens land: a page title, a row of fields and a dialog.' },
		known: [
			{ check: 'still', slice: 'p5-kit-08', targets: ['"Cancel"', '"Create app"'] },
			{ check: 'motion', slice: 'p5-kit-15', variants: ['light-1280 add-domain'], targets: ['dialog[data-slot=dialog-content]'] },
		],
		layers: { 'add-domain': '[data-screen-layer="add-domain"]' },
		layout: 'fullscreen',
	},
} satisfies Meta

// A stand-in for FieldRow until Playa ships it: a grid that stacks to one column on a phone.
const App = ({ invalid }: Args) => (
	<div class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
		<header class="flex flex-wrap items-center justify-between gap-4">
			<h1 class="text-2xl font-medium">New app</h1>
			<Dialog>
				<DialogTrigger class={buttonVariants({ variant: 'outline' })} data-screen-layer="add-domain">
					Add domain
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add domain</DialogTitle>
						<DialogDescription>Point the domain's DNS at this host before you add it.</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel for="placeholder-dialog-domain">Domain</FieldLabel>
						<Input id="placeholder-dialog-domain" placeholder="shop.example.com" />
					</Field>
					<DialogFooter>
						<DialogClose class={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
						<Button type="button">Add domain</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</header>
		<div data-slot="field-row" class="grid gap-6 sm:grid-cols-2">
			<Field>
				<FieldLabel for="placeholder-name">App name</FieldLabel>
				<Input id="placeholder-name" value="shop-api" />
			</Field>
			<Field invalid={invalid}>
				<FieldLabel for="placeholder-domain">Domain</FieldLabel>
				<Input id="placeholder-domain" placeholder="shop.example.com" aria-invalid={invalid ? 'true' : undefined} />
				<FieldDescription>Point its DNS at this host first.</FieldDescription>
				{invalid && <FieldError>Enter a domain such as shop.example.com.</FieldError>}
			</Field>
		</div>
		<div class="flex justify-end gap-3">
			<Button type="button" variant="outline">Cancel</Button>
			<Button type="button">Create app</Button>
		</div>
	</div>
)

export const Blank: Story = {
	render: App,
	play: async ({ canvas, setArg }) => {
		try {
			await assertStill(canvas, () => setArg('invalid', true))
			assertRowAligned(canvas)
		} finally {
			setArg('invalid', false)
		}
	},
}
