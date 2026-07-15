import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from 'ajo-ui-playa/pagination'

export type PageInfo = {
	back: boolean
	more: boolean
	next?: string
	page: number
	prev?: string
	size: number
}

type PageControlsArgs = {
	count: number
	label: string
	page: PageInfo
}

const PageControls = ({ count, label, page }: PageControlsArgs) => {
	if (!page.back && !page.more) return null

	return (
		<div class="flex items-center justify-between gap-2 border-t px-4 py-3">
			<span class="text-sm text-muted-foreground tabular-nums">
				Page {page.page} - {count} {label}
			</span>
			<Pagination class="mx-0 w-auto justify-end">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious href={page.prev} disabled={!page.prev} text="Prev" />
					</PaginationItem>
					<PaginationItem>
						<PaginationNext href={page.next} disabled={!page.next} />
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	)
}

export default PageControls
