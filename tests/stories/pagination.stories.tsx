/** @jsxImportSource ajo */
import type { Meta, Story } from './app'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '/src/ui/pagination'

export default {
	title: 'UI/Pagination',
	component: Pagination,
	parameters: {
		docs: { description: 'Page navigation controls with current-page, previous, next, disabled, and ellipsis semantics.' },
		layout: 'centered',
	},
} satisfies Meta<typeof Pagination>

const nav = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLElement>('[data-slot="pagination"]')

const active = (canvas: HTMLElement) =>
	canvas.querySelector<HTMLAnchorElement>('[data-slot="pagination-link"][aria-current="page"]')

const assertPagination = (canvas: HTMLElement) => {
	const root = nav(canvas)
	if (!root) throw new Error('Pagination nav was not rendered')
	if (root.tagName !== 'NAV' || root.getAttribute('aria-label') !== 'pagination') {
		throw new Error('Pagination did not render the expected navigation landmark')
	}
	if (!canvas.querySelector('[data-slot="pagination-content"]')) {
		throw new Error('PaginationContent was not rendered')
	}
}

export const Default: Story<typeof Pagination> = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href="?page=1" />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="?page=1">1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="?page=2" isActive>2</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="?page=3">3</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href="?page=3" />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
	play: async ({ canvas }) => {
		assertPagination(canvas)

		const current = active(canvas)
		if (!current || current.textContent?.trim() !== '2') {
			throw new Error('Pagination did not mark page 2 as current')
		}
		if (!canvas.querySelector('.i-lucide-chevron-left') || !canvas.querySelector('.i-lucide-chevron-right')) {
			throw new Error('Pagination previous/next icons were not rendered')
		}
		if (!canvas.textContent?.includes('More pages')) {
			throw new Error('PaginationEllipsis did not include accessible text')
		}
	},
}

export const Simple: Story<typeof Pagination> = {
	render: () => (
		<Pagination>
			<PaginationContent>
				{[1, 2, 3, 4, 5].map(page => (
					<PaginationItem key={page}>
						<PaginationLink href={`?page=${page}`} isActive={page === 3}>
							{page}
						</PaginationLink>
					</PaginationItem>
				))}
			</PaginationContent>
		</Pagination>
	),
	play: async ({ canvas }) => {
		assertPagination(canvas)
		if (active(canvas)?.textContent?.trim() !== '3') throw new Error('Simple pagination active page is wrong')
	},
}

export const IconsOnly: Story<typeof Pagination> = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href="?page=1">
						<span aria-hidden="true" class="i-lucide-chevron-left inline-block size-4" />
					</PaginationPrevious>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href="?page=3">
						<span aria-hidden="true" class="i-lucide-chevron-right inline-block size-4" />
					</PaginationNext>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
	play: async ({ canvas }) => {
		assertPagination(canvas)
		const previous = canvas.querySelector<HTMLAnchorElement>('[aria-label="Go to previous page"]')
		const next = canvas.querySelector<HTMLAnchorElement>('[aria-label="Go to next page"]')
		if (!previous || !next) throw new Error('Icon-only pagination controls need aria labels')
	},
}

export const DisabledEdges: Story<typeof Pagination> = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href="?page=0" disabled />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="?page=1" isActive>1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="?page=2">2</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href="?page=2" />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
	play: async ({ canvas }) => {
		assertPagination(canvas)

		const previous = canvas.querySelector<HTMLAnchorElement>('[aria-label="Go to previous page"]')
		if (!previous) throw new Error('Disabled pagination previous link was not rendered')
		if (previous.getAttribute('aria-disabled') !== 'true' || previous.hasAttribute('href') || previous.tabIndex !== -1) {
			throw new Error('Disabled pagination link did not expose disabled anchor semantics')
		}
	},
}

export const Localized: Story<typeof Pagination> = {
	render: () => (
		<Pagination aria-label="paginacion">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href="?page=1" text="Anterior" />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="?page=1">1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="?page=2" isActive>2</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href="?page=3" text="Siguiente" />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
	play: async ({ canvas }) => {
		const root = nav(canvas)
		if (!root || root.getAttribute('aria-label') !== 'paginacion') {
			throw new Error('Localized pagination did not allow custom nav label')
		}
		if (!canvas.textContent?.includes('Anterior') || !canvas.textContent?.includes('Siguiente')) {
			throw new Error('Localized pagination did not render custom control text')
		}
	},
}
