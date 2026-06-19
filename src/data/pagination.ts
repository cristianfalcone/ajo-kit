import type { Request } from '@kit'

export type Pagination = {
	page: number
	size: number
	offset: number
}

export type PageInfo = {
	page: number
	size: number
	hasPrev: boolean
	hasNext: boolean
	prev?: string
	next?: string
}

const numberParam = (value: string | null, fallback: number) => {
	const number = Number(value)
	return Number.isInteger(number) && number > 0 ? number : fallback
}

const href = (url: URL, page: number) => {
	const next = new URL(url)

	if (page <= 1) next.searchParams.delete('page')
	else next.searchParams.set('page', String(page))

	return `${next.pathname}${next.search}`
}

export function paginate(req: Pick<Request, 'originalUrl'>, fallbackSize = 25, maxSize = 100): Pagination {
	const url = new URL(req.originalUrl, 'http://ajo.local')
	const size = Math.min(numberParam(url.searchParams.get('size'), fallbackSize), maxSize)
	const page = numberParam(url.searchParams.get('page'), 1)

	return {
		page,
		size,
		offset: (page - 1) * size,
	}
}

export function pageInfo<T>(req: Pick<Request, 'originalUrl'>, pagination: Pagination, rows: T[]): PageInfo {
	const url = new URL(req.originalUrl, 'http://ajo.local')
	const hasPrev = pagination.page > 1
	const hasNext = rows.length > pagination.size

	return {
		page: pagination.page,
		size: pagination.size,
		hasPrev,
		hasNext,
		...(hasPrev && { prev: href(url, pagination.page - 1) }),
		...(hasNext && { next: href(url, pagination.page + 1) }),
	}
}

export const pageRows = <T>(pagination: Pagination, rows: T[]) => rows.slice(0, pagination.size)
