/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Button from '/src/ui/button'
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '/src/ui/card'
import Chip from '/src/ui/chip'

export default {
	title: 'UI/Card',
	component: Card,
	args: {
		size: 'default',
	},
	argTypes: {
		size: { control: 'radio', options: ['default', 'sm'] },
	},
	parameters: {
		docs: { description: 'Structured content container with header, content, footer, and action slots.' },
	},
} satisfies Meta<typeof Card>

export const Default: Story<typeof Card> = {
	args: {
		title: 'Login to your account',
		description: 'Enter your email below to login to your account.',
	},
	render: ({ title, description, ...args }) => (
		<Card {...args} class="w-full max-w-sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
				<CardAction>
					<Button variant="link" size="sm">Sign Up</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<div class="grid gap-3">
					<label class="grid gap-1.5 text-sm font-medium">
						Email
						<input class="h-9 rounded-md edge-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:inset-ring-ring focus-visible:ring-3 focus-visible:ring-ring/25" placeholder="m@example.com" />
					</label>
					<label class="grid gap-1.5 text-sm font-medium">
						Password
						<input class="h-9 rounded-md edge-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:inset-ring-ring focus-visible:ring-3 focus-visible:ring-ring/25" type="password" />
					</label>
				</div>
			</CardContent>
			<CardFooter class="gap-2">
				<Button class="flex-1">Login</Button>
				<Button variant="outline" class="flex-1">Login with Google</Button>
			</CardFooter>
		</Card>
	),
}

export const Small: Story<typeof Card> = {
	args: {
		size: 'sm',
		title: 'Small Card',
		description: 'This card uses the small size variant.',
		content: 'The small variant tightens the spacing between sections without changing the composition API.',
	},
	render: ({ title, description, content, ...args }) => (
		<Card {...args}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
				<CardAction>
					<Button variant="outline" size="sm">Action</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				{content}
			</CardContent>
		</Card>
	),
}

export const WithMedia: Story<typeof Card> = {
	args: {
		title: 'Design systems meetup',
		description: 'A practical talk on component APIs, accessibility, and shipping faster.',
		chip: 'Featured',
	},
	render: ({ title, description, chip, ...args }) => (
		<Card {...args} class="max-w-md">
			<div class="h-36 bg-[linear-gradient(135deg,var(--secondary),var(--primary))]" />
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
				<CardAction>
					<Chip variant="secondary">{chip}</Chip>
				</CardAction>
			</CardHeader>
			<CardFooter>
				<Button variant="outline">View Event</Button>
			</CardFooter>
		</Card>
	),
}

export const EdgeToEdge: Story<typeof Card> = {
	args: {
		title: 'Terms of Service',
		description: 'Review the terms before accepting the agreement.',
		content: 'These terms govern your use of the workspace, including access to shared documents and collaboration tools.',
	},
	render: ({ title, description, content, ...args }) => (
		<Card {...args} class="max-w-lg">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent class="bg-muted py-4 text-sm text-muted-foreground">
				{content}
			</CardContent>
			<CardFooter class="justify-end gap-2">
				<Button variant="outline">Decline</Button>
				<Button>Accept</Button>
			</CardFooter>
		</Card>
	),
}

export const Anchor: Story<typeof Card> = {
	args: {
		href: '/dashboard',
		title: 'Open dashboard',
		description: 'Use semantic anchor rendering for linked cards.',
	},
	render: ({ title, description, ...args }) => (
		<Card
			{...args}
			as="a"
			class="block max-w-sm transition-colors hover:bg-accent hover:text-accent-foreground"
			href={String(args.href)}
		>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
		</Card>
	),
}
