/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import Pager from '/src/ui/pager'

const page = {
	page: 1,
	size: 10,
	back: false,
	more: true,
	next: '?page=2',
}

export default {
	title: 'UI/Pager',
	component: Pager,
	args: {
		page,
		count: 10,
		label: 'users',
	},
	parameters: {
		docs: { description: 'Pagination footer for bounded list reads.' },
	},
} satisfies Meta<typeof Pager>

export const FirstPage: Story<typeof Pager> = {}

export const MiddlePage: Story<typeof Pager> = {
	args: {
		page: {
			page: 3,
			size: 10,
			back: true,
			more: true,
			prev: '?page=2',
			next: '?page=4',
		},
		count: 10,
		label: 'sessions',
	},
}

export const LastPage: Story<typeof Pager> = {
	args: {
		page: {
			page: 5,
			size: 10,
			back: true,
			more: false,
			prev: '?page=4',
		},
		count: 6,
		label: 'tokens',
	},
}

export const Hidden: Story<typeof Pager> = {
	args: {
		page: {
			page: 1,
			size: 10,
			back: false,
			more: false,
		},
		count: 4,
		label: 'rows',
	},
	parameters: { empty: true },
}
